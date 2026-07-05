"use client";

import { useState } from "react";
import { goalLabel, type GoalId } from "../../../../shared/onboarding";
import { PillButton, QuietLink, StepCard } from "./wizard-ui";

function Chip({
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

export function NicheStep({
  goal,
  suggested,
  selected,
  onToggle,
  onAdd,
  onBack,
  onContinue,
  onSkip,
  pending,
}: {
  goal: GoalId | null;
  suggested: string[];
  selected: string[];
  onToggle: (keyword: string) => void;
  onAdd: (keyword: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  pending: boolean;
}) {
  const [custom, setCustom] = useState("");
  // Custom keywords the user added, in insertion order after the suggestions.
  const extras = selected.filter((k) => !suggested.includes(k));

  const add = () => {
    const value = custom.trim().toLowerCase();
    if (!value) return;
    onAdd(value);
    setCustom("");
  };

  return (
    <StepCard
      eyebrow="Step 2 · Your niche"
      title="What conversations should we watch?"
      sub="The feed scanner checks X on a schedule and ranks live threads on these topics by how much reply window is left."
      onBack={onBack}
    >
      {goal && (
        <p className="mt-2.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground/70">
          Suggested for <span className="text-primary">{goalLabel(goal)}</span>
        </p>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        {[...suggested, ...extras].map((k) => (
          <Chip
            key={k}
            label={k}
            pressed={selected.includes(k)}
            onToggle={() => onToggle(k)}
          />
        ))}
      </div>

      <div className="mx-auto mt-5 flex max-w-[400px] gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="add your own — e.g. devtools, fintech"
          aria-label="Add a keyword"
          className="h-10 flex-1 rounded-md border border-border bg-input px-3.5 font-mono text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-2 focus:outline-offset-1"
        />
        <button
          type="button"
          onClick={add}
          className="h-10 rounded-md border border-border px-4 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
        >
          Add
        </button>
      </div>

      <div className="mt-7 flex flex-col items-center gap-4">
        <PillButton disabled={selected.length === 0 || pending} onClick={onContinue}>
          Continue
        </PillButton>
        <QuietLink onClick={onSkip} disabled={pending}>
          Skip — use defaults for now
        </QuietLink>
      </div>
    </StepCard>
  );
}
