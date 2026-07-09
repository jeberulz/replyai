"use client";

import { useQuery } from "convex/react";
import { Check, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/components/app/convex-provider";
import { GOALS, goalLabel, type GoalId } from "../../../../shared/onboarding";
import { PillButton, QuietLink, RadioDot, StepCard } from "./wizard-ui";

function KeywordChip({
  label,
  pressed,
  onToggle,
}: {
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`rounded-full border px-3.5 py-2 font-mono text-[12.5px] transition-colors ${
        pressed
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
      }`}
    >
      {pressed && <span className="text-primary">✓ </span>}
      {label}
    </button>
  );
}

export function ConciergeReviewStep({
  firstName,
  runId,
  starting,
  startError,
  goal,
  keywords,
  acceptedHandles,
  onSelectGoal,
  onToggleKeyword,
  onAcceptWatch,
  onConfirm,
  onManual,
  pending,
}: {
  firstName: string;
  runId: Id<"onboardingConciergeRuns"> | null;
  starting: boolean;
  startError: string | null;
  goal: GoalId | null;
  keywords: string[];
  acceptedHandles: string[];
  onSelectGoal: (goal: GoalId) => void;
  onToggleKeyword: (keyword: string) => void;
  onAcceptWatch: (handle: string) => void;
  onConfirm: () => void;
  onManual: () => void;
  pending: boolean;
}) {
  const sessionToken = useSessionToken();
  const run = useQuery(
    api.onboardingConcierge.latest,
    sessionToken ? { sessionToken } : "skip"
  );

  const proposal = run?.proposal;
  const status = run?.status;
  const loading =
    starting ||
    !runId ||
    status === "running" ||
    (runId && run === undefined);

  const failed = status === "failed" || Boolean(startError);
  const proposalReady =
    !loading &&
    !failed &&
    Boolean(proposal) &&
    (status === "complete" || status === "accepted");

  if (loading) {
    return (
      <StepCard
        eyebrow="Quick setup"
        title={`Reading your X history, ${firstName}…`}
        sub="We'll propose a goal, niche keywords, and a few accounts to watch. Nothing is saved until you confirm."
      >
        <div className="mt-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="font-mono text-xs uppercase tracking-[0.1em]">
            Building your proposal
          </p>
        </div>
        <div className="mt-8">
          <QuietLink onClick={onManual} disabled={pending}>
            Use manual setup instead
          </QuietLink>
        </div>
      </StepCard>
    );
  }

  if (failed || !proposalReady || !proposal) {
    return (
      <StepCard
        eyebrow="Quick setup"
        title="Couldn't build a proposal"
        sub={
          startError ??
          run?.error ??
          "You can set things up manually — same wizard as before."
        }
      >
        <div className="mt-8 flex flex-col items-center gap-4">
          <PillButton onClick={onManual} disabled={pending}>
            Continue with manual setup
          </PillButton>
        </div>
      </StepCard>
    );
  }

  const watchAccepted = (handle: string) =>
    acceptedHandles.some(
      (h) => h.toLowerCase() === handle.replace(/^@/, "").toLowerCase()
    );

  return (
    <StepCard
      eyebrow="Quick setup · Review"
      title="Does this look right?"
      sub="Confirm in about a minute. Watches only add when you accept each handle. Nothing auto-publishes."
    >
      {run?.demo && (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
          Demo proposal — connect X + API keys for a live read
        </p>
      )}

      <section className="mt-8 text-left">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
          Goal
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {proposal.goalReason}
        </p>
        <div
          role="radiogroup"
          aria-label="Proposed goal"
          className="mt-3 divide-y divide-border/60 overflow-hidden rounded-lg border border-border"
        >
          {GOALS.map((g) => {
            const checked = goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelectGoal(g.id)}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-muted ${
                  checked ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <RadioDot checked={checked} />
                <span className="min-w-0">
                  <span className="block text-[14px]">{g.label}</span>
                  <span className="block text-[12px] text-muted-foreground/70">
                    {g.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7 text-left">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
          Niche keywords
        </h2>
        {goal && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
            Tuned for {goalLabel(goal)} — toggle chips to edit
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {proposal.keywords.map((k) => (
            <KeywordChip
              key={k}
              label={k}
              pressed={keywords.includes(k)}
              onToggle={() => onToggleKeyword(k)}
            />
          ))}
        </div>
      </section>

      <section className="mt-7 text-left">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
          Watch candidates
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Accept each handle you want — we never auto-add watches.
        </p>
        <ul className="mt-3 space-y-2">
          {proposal.watches.map((w) => {
            const accepted = watchAccepted(w.handle);
            return (
              <li
                key={w.handle}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[13px] text-foreground">
                    @{w.handle}
                    <span className="ml-2 text-muted-foreground">
                      {w.displayName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                    {w.reason}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={accepted || pending}
                  onClick={() => onAcceptWatch(w.handle)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    accepted
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-accent hover:text-foreground"
                  }`}
                >
                  {accepted ? (
                    <>
                      <Check className="size-3" strokeWidth={3} /> Watching
                    </>
                  ) : (
                    "Accept"
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {proposal.voiceExamples.length > 0 && (
        <section className="mt-7 text-left">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">
            Voice snippet preview
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            We&apos;ll train your full voice profile on the next step — confirm
            first.
          </p>
          <ul className="mt-3 space-y-2">
            {proposal.voiceExamples.slice(0, 3).map((text, i) => (
              <li
                key={i}
                className="rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-left text-[13px] leading-snug text-muted-foreground"
              >
                {text.length > 160 ? `${text.slice(0, 160)}…` : text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col items-center gap-4">
        <PillButton
          disabled={!goal || keywords.length === 0 || pending}
          onClick={onConfirm}
        >
          Confirm &amp; continue
        </PillButton>
        <QuietLink onClick={onManual} disabled={pending}>
          Use manual setup instead
        </QuietLink>
      </div>
    </StepCard>
  );
}
