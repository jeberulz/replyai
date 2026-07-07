"use client";

import { useTransition } from "react";
import { ArrowRight, MessageCircle, TrendingUp, X } from "lucide-react";
import Link from "next/link";

import { dismissOpportunityAction } from "@/app/actions";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-colors hover:border-border",
        selected && "border-primary/60 ring-1 ring-primary/40",
        pending && "opacity-50"
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-sm font-semibold">
            {opportunity.authorName}{" "}
            <span className="font-normal text-muted-foreground">
              @{opportunity.authorHandle} ·{" "}
              {formatCount(opportunity.authorFollowers)} followers ·{" "}
              {timeAgo(opportunity.postedAt)}
            </span>
          </div>
          <ScoreBadge value={opportunity.score} reason={opportunity.reason} />
        </div>

        {note && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {note}
          </Badge>
        )}

        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">
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

        <p className="line-clamp-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Suggested angle:</span>{" "}
          {opportunity.suggestedAngle}
        </p>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
          <Button
            size="sm"
            asChild
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-auto"
          >
            <Link href={`/dashboard?url=${encodeURIComponent(opportunity.tweetUrl)}`}>
              Analyze &amp; reply
              <ArrowRight />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            className="w-full sm:w-auto"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => dismissOpportunityAction(opportunity._id));
            }}
          >
            <X />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
