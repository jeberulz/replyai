"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared chrome for the right-hand workbench/detail panes across the split-view
 * surfaces (Reply Workbench, Feed detail, Drafts detail). Matches the Figma
 * frames: header tab-pill + action cluster, a serif title row, a segmented
 * Options/Preview toggle, and a sticky bottom action bar.
 */

/** Full-height pane shell: header + scroll body + optional action bar. */
export function Pane({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-l border-border bg-canvas",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PaneHeader({
  tab,
  actions,
}: {
  tab: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      {tab}
      {actions ? (
        <div className="flex items-center gap-3.5 text-muted-foreground">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function PaneTabPill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] font-medium">
      {icon}
      {children}
    </span>
  );
}

export function PaneTitleRow({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 pb-1.5 pt-4">
      <h2 className="font-serif text-[22px] leading-none text-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** Scroll body for a pane (fills remaining height). */
export function PaneBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-3.5", className)}>
      {children}
    </div>
  );
}

/** Sticky action bar pinned to the bottom of a pane. */
export function PaneActionBar({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 border-t border-border bg-background px-5 pb-4.5 pt-3.5">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {note ? (
        <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Segmented toggle (e.g. Options / Preview). */
export function SegmentedToggle<T extends string>({
  value,
  onValueChange,
  options,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-style filter chips (All / Scheduled / … ) — active is a white pill. */
export function FilterChips<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Mono micro-label used above sections (e.g. "REPLYING TO", "STATUS"). */
export function PaneEyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}
