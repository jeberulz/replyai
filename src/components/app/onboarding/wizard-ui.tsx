"use client";

import { ArrowLeft, Check } from "lucide-react";

/**
 * Shared primitives for the onboarding wizard — Ghostbase-style centered
 * cards on the chrome (#000) tier. Serif question headlines, mono eyebrows,
 * white pill CTA (design.md: one solid primary action per view).
 */

export function StepCard({
  eyebrow,
  title,
  sub,
  onBack,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[620px] rounded-2xl border border-border/60 bg-card px-6 py-10 text-center sm:px-14 sm:py-12">
      {onBack && (
        <div className="mb-4 text-left">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back
          </button>
        </div>
      )}
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-balance font-serif text-[2.1rem] leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
        {title}
      </h1>
      {sub && (
        <p className="mx-auto mt-3.5 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
          {sub}
        </p>
      )}
      {children}
    </div>
  );
}

export function PillButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-foreground font-mono text-[13px] font-semibold uppercase tracking-[0.12em] text-chrome transition-colors hover:bg-oatmeal-950 disabled:cursor-not-allowed disabled:bg-muted-foreground/60 disabled:text-chrome/70"
    >
      {children}
    </button>
  );
}

export function QuietLink({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Ghostbase-style radio row: grey dot that fills orange with a check. */
export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-[19px] flex-none place-items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-[#3a3a3a]"
      }`}
    >
      <Check
        className={`size-3 text-white transition-all ${
          checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
        strokeWidth={3}
      />
    </span>
  );
}
