"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, MessageCircle, TrendingUp, X } from "lucide-react";
import { dismissOpportunityAction } from "@/app/actions";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount, timeAgo } from "@/lib/utils";

export type Opportunity = {
  _id: string;
  tweetUrl: string;
  authorHandle: string;
  authorName: string;
  authorFollowers: number;
  text: string;
  score: number;
  reason: string;
  suggestedAngle: string;
  replyCount: number;
  velocity: number;
  postedAt: number;
  source?: "following" | "list" | "watched" | "search";
  sourceLabel?: string;
};

function sourceNote(opportunity: Opportunity): string | null {
  if (opportunity.source === "list") {
    return `From ${opportunity.sourceLabel ?? "list"}`;
  }
  if (opportunity.source === "watched") {
    return "Watched account";
  }
  if (opportunity.source === "search") {
    return "From search";
  }
  return null;
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const [pending, startTransition] = useTransition();
  const note = sourceNote(opportunity);

  return (
    <Card className={pending ? "opacity-50" : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {opportunity.authorName}{" "}
              <span className="font-normal text-muted-foreground">
                @{opportunity.authorHandle} ·{" "}
                {formatCount(opportunity.authorFollowers)} followers ·{" "}
                {timeAgo(opportunity.postedAt)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ScoreBadge value={opportunity.score} reason={opportunity.reason} />
            {note && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {note}
              </Badge>
            )}
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {opportunity.text}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" />
            {formatCount(opportunity.replyCount)} replies
          </span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            {formatCount(opportunity.velocity)}/hr velocity
          </span>
        </div>

        <p className="rounded-md bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
          <span className="font-medium">Suggested angle:</span>{" "}
          {opportunity.suggestedAngle}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" asChild>
            <Link
              href={`/dashboard?url=${encodeURIComponent(opportunity.tweetUrl)}`}
            >
              Analyze &amp; reply
              <ArrowRight />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(() => dismissOpportunityAction(opportunity._id))
            }
          >
            <X />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
