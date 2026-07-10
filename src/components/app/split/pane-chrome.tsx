"use client";

import * as React from "react";

import { Heading } from "@/components/ds/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ds/segmented-control";
import { cn } from "@/lib/utils";
import { rpType } from "@/theme/typography";

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
        "flex h-full min-h-0 flex-col overflow-x-hidden bg-canvas md:border-l md:border-border",
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
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      {tab}
      {actions ? (
        <div className="flex shrink-0 items-center gap-3 text-muted-foreground">
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
    <span
      className={cn(
        rpType.meta,
        "inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-medium"
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1.5 pt-4 sm:px-5">
      <Heading level={2} className={cn(rpType.paneTitle, "text-foreground")}>
        {title}
      </Heading>
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
    <div
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3.5 sm:px-5",
        className
      )}
    >
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
    <div className="shrink-0 space-y-2.5 border-t border-border bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3.5 sm:px-5 sm:pb-4.5">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {note ? (
        <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/** Segmented toggle (e.g. Options / Preview) — Astryx SegmentedControl. */
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
    <SegmentedControl
      label="View"
      size="sm"
      value={value}
      onChange={(next) => onValueChange(next as T)}
    >
      {options.map((opt) => (
        <SegmentedControlItem
          key={opt.value}
          value={opt.value}
          label={opt.label}
        />
      ))}
    </SegmentedControl>
  );
}

/** Pill-style filter chips (All / Scheduled / … ) — active is a white pill. */
/**
 * Filter chips (feed/drafts status filters).
 * Kept custom — design.md wants a white/foreground active pill, not
 * SegmentedControl's muted track. Do not swap for ds/SegmentedControl.
 */
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
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
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
        "font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}
