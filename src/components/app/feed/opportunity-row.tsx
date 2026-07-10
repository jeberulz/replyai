"use client";

import { useTransition } from "react";
import { ArrowRight, MessageCircle, TrendingUp, X } from "lucide-react";
import Link from "next/link";

import { dismissOpportunityAction } from "@/app/actions";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import type { Opportunity } from "@/components/app/opportunity-card";

export function sourceNote(opportunity: Opportunity): string | null {
  if (opportunity.source === "list")
    return `From ${opportunity.sourceLabel ?? "list"}`;
  if (opportunity.source === "watched") return "Watched account";
  if (opportunity.source === "search") return "From search";
  return null;
}

export function OpportunityRow({
  opportunity,
  selected,
  onSelect,
}: {
  opportunity: Opportunity;
  selected: boolean;
  onSelect: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const note = sourceNote(opportunity);
  const freshness = opportunity.freshnessLabel;
  const windowClosed = opportunity.windowClosed ?? false;
  const displayScore = opportunity.effectiveScore ?? opportunity.score;
  const rowLabel = `Open opportunity from ${opportunity.authorName} @${opportunity.authorHandle}`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      data-testid={`opportunity-row-${opportunity._id}`}
      padding={3}
      className={cn(
        "cursor-pointer transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        selected && "border-primary/60 ring-1 ring-primary/40",
        pending && "opacity-50",
        windowClosed && "opacity-60"
      )}
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-semibold">
            {opportunity.authorName}{" "}
            <span className="font-normal text-muted-foreground">
              @{opportunity.authorHandle} ·{" "}
              {formatCount(opportunity.authorFollowers)} followers ·{" "}
              {timeAgo(opportunity.postedAt)}
            </span>
          </div>
          <ScoreBadge value={displayScore} reason={opportunity.reason} />
        </div>

        {(note || freshness) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {note && (
              <Badge
                variant="neutral"
                label={note}
                className="font-normal text-muted-foreground"
              />
            )}
            {freshness && (
              <Badge
                variant={windowClosed ? "neutral" : "warning"}
                label={freshness}
                className="font-normal"
              />
            )}
          </div>
        )}

        <p className="line-clamp-3 whitespace-pre-wrap text-base leading-6">
          {opportunity.text}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="size-3.5" />
            {formatCount(opportunity.replyCount)} replies
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            {formatCount(opportunity.velocity)}/hr velocity
          </span>
        </div>

        <p className="line-clamp-2 rounded-md bg-muted px-3 py-2 text-sm leading-5 text-muted-foreground">
          <span className="font-semibold text-foreground">Suggested angle:</span>{" "}
          {opportunity.suggestedAngle}
        </p>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
          <Button
            size="sm"
            variant="primary"
            label="Analyze & reply"
            icon={<ArrowRight className="size-3.5" />}
            href={`/dashboard?url=${encodeURIComponent(opportunity.tweetUrl)}`}
            as={Link}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-auto"
          />
          <Button
            size="sm"
            variant="ghost"
            label="Dismiss"
            icon={<X className="size-3.5" />}
            isDisabled={pending}
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => dismissOpportunityAction(opportunity._id));
            }}
          />
        </div>
      </div>
    </Card>
  );
}
