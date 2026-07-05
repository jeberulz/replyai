"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquareQuote } from "lucide-react";
import { toast } from "sonner";
import {
  buildWritingModelAction,
  saveOnboardingNicheAction,
  setGoalAction,
  skipOnboardingAction,
  type BuildModelResult,
} from "@/app/actions";
import {
  suggestedKeywordsForGoal,
  type GoalId,
} from "../../../../shared/onboarding";
import { BuildingStep } from "./building-step";
import { GoalStep } from "./goal-step";
import { NicheStep } from "./niche-step";
import { ReadyStep } from "./ready-step";
import { VoiceStep, type VoiceSource } from "./voice-step";

type Step = "goal" | "niche" | "voice" | "building" | "ready";

// Rail stages: the wizard's 5 screens roll up to 3 stages, Ghostbase-style.
const STAGES: Array<{ id: string; label: string; steps: Step[] }> = [
  { id: "goal", label: "Goal", steps: ["goal", "niche"] },
  { id: "voice", label: "Voice", steps: ["voice", "building"] },
  { id: "ready", label: "Ready", steps: ["ready"] },
];

function Rail({ step }: { step: Step }) {
  const activeIdx = STAGES.findIndex((s) => s.steps.includes(step));
  return (
    <nav
      aria-label="Onboarding progress"
      className="hidden items-center gap-3.5 font-mono text-xs uppercase tracking-[0.1em] sm:flex"
    >
      {STAGES.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-3.5">
          {i > 0 && <span aria-hidden className="h-px w-14 bg-border" />}
          <span
            className={`flex items-center gap-2 whitespace-nowrap ${
              i === activeIdx
                ? "text-foreground"
                : i < activeIdx
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            }`}
          >
            <span
              aria-hidden
              className={`grid size-[18px] place-items-center rounded-full border text-[9px] ${
                i < activeIdx
                  ? "border-primary bg-primary text-white"
                  : i === activeIdx
                    ? "border-foreground text-foreground"
                    : "border-border text-muted-foreground/60"
              }`}
            >
              {i < activeIdx ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
            </span>
            {stage.label}
          </span>
        </div>
      ))}
    </nav>
  );
}

export function OnboardingFlow({
  displayName,
  username,
  xConnected,
  initialGoal,
}: {
  displayName: string;
  username: string;
  xConnected: boolean;
  initialGoal?: GoalId;
}) {
  const router = useRouter();
  const firstName = displayName.split(" ")[0];

  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<GoalId | null>(initialGoal ?? null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [source, setSource] = useState<VoiceSource>("import");
  const [pastedText, setPastedText] = useState("");
  const [result, setResult] = useState<BuildModelResult | null>(null);
  const [pending, startTransition] = useTransition();
  const buildStarted = useRef(false);

  const suggested = goal ? suggestedKeywordsForGoal(goal) : [];

  const skip = () =>
    startTransition(async () => {
      try {
        await skipOnboardingAction();
      } catch {
        // Completion flag is a convenience — never trap the user in setup.
      }
      router.push("/dashboard");
      router.refresh();
    });

  const continueFromGoal = () => {
    if (!goal) return;
    // Seed the niche chips: keep any custom picks, preselect top suggestions.
    setKeywords((prev) =>
      prev.length > 0 ? prev : suggestedKeywordsForGoal(goal).slice(0, 3)
    );
    setStep("niche");
    startTransition(async () => {
      try {
        await setGoalAction(goal);
      } catch {
        toast.error("Couldn't save your goal — we'll keep going anyway");
      }
    });
  };

  const continueFromNiche = () => {
    setStep("voice");
    startTransition(async () => {
      try {
        await saveOnboardingNicheAction(keywords);
      } catch {
        toast.error("Couldn't save your niche — you can set it later in Feed");
      }
    });
  };

  const startBuild = () => {
    if (buildStarted.current) return;
    buildStarted.current = true;
    setStep("building");
    startTransition(async () => {
      try {
        const built = await buildWritingModelAction({
          source,
          examples:
            source === "paste"
              ? pastedText.split("\n").map((l) => l.trim()).filter(Boolean)
              : undefined,
        });
        setResult(built);
      } catch {
        buildStarted.current = false;
        toast.error("Training hit a snag — try again or skip for now");
        setStep("voice");
      }
    });
  };

  const finishBuilding = useCallback(() => setStep("ready"), []);

  const startReplying = () =>
    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });

  return (
    <div className="flex min-h-svh flex-col bg-chrome">
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-5 sm:px-7">
        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground">
          <MessageSquareQuote className="size-3.5 text-primary" />
          ReplyPilot
        </div>
        <Rail step={step} />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div key={step} className="flex w-full justify-center animate-fade-rise">
          {step === "goal" && (
            <GoalStep
              firstName={firstName}
              goal={goal}
              onSelect={setGoal}
              onContinue={continueFromGoal}
              onSkip={skip}
              pending={pending}
            />
          )}
          {step === "niche" && (
            <NicheStep
              goal={goal}
              suggested={suggested}
              selected={keywords}
              onToggle={(k) =>
                setKeywords((prev) =>
                  prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
                )
              }
              onAdd={(k) =>
                setKeywords((prev) => (prev.includes(k) ? prev : [...prev, k]))
              }
              onBack={() => setStep("goal")}
              onContinue={continueFromNiche}
              onSkip={() => setStep("voice")}
              pending={pending}
            />
          )}
          {step === "voice" && (
            <VoiceStep
              username={username}
              xConnected={xConnected}
              source={source}
              pastedText={pastedText}
              onSelectSource={setSource}
              onPastedTextChange={setPastedText}
              onBack={() => setStep("niche")}
              onContinue={startBuild}
              onSkip={skip}
              pending={pending}
            />
          )}
          {step === "building" && (
            <BuildingStep
              firstName={firstName}
              username={username}
              keywords={keywords}
              result={result}
              onFinished={finishBuilding}
            />
          )}
          {step === "ready" && result && (
            <ReadyStep
              firstName={firstName}
              result={result}
              onStart={startReplying}
              pending={pending}
            />
          )}
        </div>
      </main>
    </div>
  );
}
