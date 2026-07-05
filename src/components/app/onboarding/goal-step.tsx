"use client";

import { GOALS, type GoalId } from "../../../../shared/onboarding";
import { PillButton, QuietLink, RadioDot, StepCard } from "./wizard-ui";

export function GoalStep({
  firstName,
  goal,
  onSelect,
  onContinue,
  onSkip,
  pending,
}: {
  firstName: string;
  goal: GoalId | null;
  onSelect: (goal: GoalId) => void;
  onContinue: () => void;
  onSkip: () => void;
  pending: boolean;
}) {
  return (
    <StepCard
      eyebrow="Step 1 · Your goal"
      title={`What are you here to do, ${firstName}?`}
      sub="This tunes which conversations we surface and how your replies lean."
    >
      <div
        role="radiogroup"
        aria-label="Primary goal"
        className="mt-8 divide-y divide-border/60 overflow-hidden rounded-lg border border-border text-left"
      >
        {GOALS.map((g) => {
          const checked = goal === g.id;
          return (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onSelect(g.id)}
              className={`flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-muted sm:px-5 ${
                checked ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <RadioDot checked={checked} />
              <span className="min-w-0">
                <span className="block text-[15px]">{g.label}</span>
                <span className="block text-[13px] text-muted-foreground/70">
                  {g.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 flex flex-col items-center gap-4">
        <PillButton disabled={goal === null || pending} onClick={onContinue}>
          Continue
        </PillButton>
        <QuietLink onClick={onSkip} disabled={pending}>
          Skip setup — I&apos;ll explore on my own
        </QuietLink>
      </div>
    </StepCard>
  );
}
