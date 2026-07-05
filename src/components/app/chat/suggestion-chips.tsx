"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { ScoreBadge } from "@/components/app/score-badge";
import { formatCount, timeAgo } from "@/lib/utils";
import type { AnalyzeInput } from "./use-analysis-pipeline";

/**
 * Trending conversations from the feed scanner, as one-click analyze chips
 * under the empty-state composer. Discovery + timing is the product's wedge —
 * this keeps it on the home surface (PRD §2).
 */
export function SuggestionChips({
  onPick,
  disabled,
}: {
  onPick: (input: AnalyzeInput) => void;
  disabled: boolean;
}) {
  const sessionToken = useSessionToken();
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken ? { sessionToken, limit: 4 } : "skip"
  );

  if (!opportunities || opportunities.length === 0) return null;

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Worth joining now
        </p>
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Open feed <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {opportunities.map((opp) => (
          <button
            key={opp._id}
            type="button"
            disabled={disabled}
            onClick={() =>
              onPick({
                text: opp.text,
                url: opp.tweetUrl,
                authorHandle: opp.authorHandle,
                authorFollowers: opp.authorFollowers,
              })
            }
            className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScoreBadge value={opp.score} reason={opp.reason} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block text-sm">{opp.text}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                @{opp.authorHandle} · {formatCount(opp.authorFollowers)}{" "}
                followers · {timeAgo(opp.postedAt)}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
