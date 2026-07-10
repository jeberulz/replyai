"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useSessionToken } from "@/components/app/convex-provider";
import { rpType } from "@/theme/typography";

function formatDuration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

/** The dashboard stats as one quiet mono row for the chat empty state. */
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
      "No/minor",
      stats.noOrMinorEditRate === null ? "—" : `${stats.noOrMinorEditRate}%`,
    ],
    [
      "Reply-back",
      stats.replyBackRate === null ? "—" : `${stats.replyBackRate}%`,
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
    <div
      className={cn(
        rpType.monoXs,
        "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground"
      )}
    >
      {items.map(([label, value]) => (
        <span key={label} className="inline-flex items-baseline gap-1.5">
          <span className="uppercase tracking-[0.1em]">{label}</span>
          <span className="tabular-nums text-foreground">{value}</span>
        </span>
      ))}
    </div>
  );
}
