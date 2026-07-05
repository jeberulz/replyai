"use client";

import { PenLine } from "lucide-react";
import { PillButton, QuietLink, RadioDot, StepCard } from "./wizard-ui";

export type VoiceSource = "import" | "paste";

const XLogo = () => (
  <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function VoiceStep({
  username,
  xConnected,
  source,
  pastedText,
  onSelectSource,
  onPastedTextChange,
  onBack,
  onContinue,
  onSkip,
  pending,
}: {
  username: string;
  xConnected: boolean;
  source: VoiceSource;
  pastedText: string;
  onSelectSource: (source: VoiceSource) => void;
  onPastedTextChange: (text: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  pending: boolean;
}) {
  const pasteEmpty = source === "paste" && pastedText.trim().length === 0;

  const options: Array<{
    id: VoiceSource;
    icon: React.ReactNode;
    label: string;
    hint: string;
  }> = [
    {
      id: "import",
      icon: <XLogo />,
      label: "Import my recent X posts",
      hint: xConnected
        ? "Reads your recent posts. Read-only — we never post for you."
        : "Demo mode: trains on realistic sample posts. Connect X in Settings to use your own.",
    },
    {
      id: "paste",
      icon: <PenLine className="size-3.5" />,
      label: "Paste a few posts instead",
      hint: "5–10 posts that sound like you is enough to start",
    },
  ];

  return (
    <StepCard
      eyebrow="Step 3 · Your voice"
      title="Let's learn how you write."
      sub="We measure sentence length, punctuation, formatting, and favorite phrases from real posts — measured, not guessed."
      onBack={onBack}
    >
      <div
        role="radiogroup"
        aria-label="Voice training source"
        className="mt-8 divide-y divide-border/60 overflow-hidden rounded-lg border border-border text-left"
      >
        {options.map((opt) => {
          const checked = source === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onSelectSource(opt.id)}
              className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-muted sm:px-5 ${
                checked ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="grid size-9 flex-none place-items-center rounded-lg border border-border text-muted-foreground">
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{opt.label}</span>
                <span className="block text-[13px] text-muted-foreground/70">
                  {opt.hint}
                </span>
              </span>
              <RadioDot checked={checked} />
            </button>
          );
        })}
      </div>

      {source === "paste" && (
        <div className="mt-4 text-left">
          <textarea
            value={pastedText}
            onChange={(e) => onPastedTextChange(e.target.value)}
            rows={5}
            placeholder={
              "One post per line…\n\nshipped the worst version of this on purpose. learned more in 2 days than 3 weeks of planning"
            }
            aria-label="Posts to train on"
            className="w-full resize-y rounded-md border border-border bg-input px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-2 focus:outline-offset-1"
          />
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground/70">
            Tip: pick posts you&apos;d happily write again — that&apos;s the voice
            we&apos;ll match.
          </p>
        </div>
      )}

      <p className="mt-5 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${xConnected ? "bg-success" : "bg-warning"}`}
        />
        {xConnected
          ? `Connected as @${username} — read-only access`
          : `Signed in as @${username} — demo mode, no X connection`}
      </p>

      <div className="mt-7 flex flex-col items-center gap-4">
        <PillButton disabled={pending || pasteEmpty} onClick={onContinue}>
          Build my writing model
        </PillButton>
        <QuietLink onClick={onSkip} disabled={pending}>
          Skip for now — use a starter voice
        </QuietLink>
      </div>
    </StepCard>
  );
}
