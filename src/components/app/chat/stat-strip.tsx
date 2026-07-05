"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";

function formatDuration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

/** The dashboard's five stats as one quiet mono row for the chat empty state. */
export function StatStrip() {
  const sessionToken = useSessionToken();
  const stats = useQuery(
    api.usage.stats,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!stats) return null;

  const items: Array<[string, string | number]> = [
    [
      "Opp → analyze",
      stats.opportunityToAnalyzeRate === null
        ? "—"
        : `${stats.opportunityToAnalyzeRate}%`,
    ],
    [
      "No edits",
      stats.noEditRate === null ? "—" : `${stats.noEditRate}%`,
    ],
    [
      "To publish",
      stats.medianSecondsToPublish === null
        ? "—"
        : formatDuration(stats.medianSecondsToPublish),
    ],
    ["Published", stats.published],
    ["Analyses", stats.analyses],
    ["Options", stats.generations],
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-muted-foreground">
      {items.map(([label, value]) => (
        <span key={label} className="inline-flex items-baseline gap-1.5">
          <span className="uppercase tracking-[0.1em]">{label}</span>
          <span className="tabular-nums text-foreground">{value}</span>
        </span>
      ))}
    </div>
  );
}
