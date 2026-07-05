"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Lightbulb,
  MessageCircle,
  TrendingUp,
  X,
} from "lucide-react";

import { dismissOpportunityAction } from "@/app/actions";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pane,
  PaneActionBar,
  PaneBody,
  PaneHeader,
  PaneTabPill,
  PaneTitleRow,
} from "@/components/app/split/pane-chrome";
import { XLogo } from "@/components/app/x-logo";
import { formatCount, timeAgo } from "@/lib/utils";
import type { Opportunity } from "@/components/app/opportunity-card";
import { sourceNote } from "./opportunity-row";

export function OpportunityDetail({
  opportunity,
  onDismissed,
}: {
  opportunity: Opportunity;
  onDismissed: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const note = sourceNote(opportunity);

  const dismiss = () =>
    startTransition(async () => {
      await dismissOpportunityAction(opportunity._id);
      onDismissed();
    });

  return (
    <Pane>
      <PaneHeader
        tab={
          <PaneTabPill icon={<XLogo className="size-3.5" />}>
            @{opportunity.authorHandle}
          </PaneTabPill>
        }
        actions={
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            aria-label="Dismiss"
            className="transition-colors hover:text-foreground"
          >
            <X className="size-[17px]" />
          </button>
        }
      />
      <PaneTitleRow title="Opportunity">
        {note && (
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {note}
          </Badge>
        )}
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-semibold">{opportunity.authorName}</span>{" "}
                <span className="text-muted-foreground">
                  @{opportunity.authorHandle} ·{" "}
                  {formatCount(opportunity.authorFollowers)} followers ·{" "}
                  {timeAgo(opportunity.postedAt)}
                </span>
              </div>
              <XLogo className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-normal">
              {opportunity.text}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-3.5" />
                {formatCount(opportunity.replyCount)} replies
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                {formatCount(opportunity.velocity)}/hr velocity
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Worth replying?</h3>
              <ScoreBadge value={opportunity.score} reason={opportunity.reason} />
            </div>
            <p className="text-sm leading-normal text-muted-foreground">
              {opportunity.reason}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Suggested angle</h3>
            </div>
            <p className="text-[15px] leading-normal text-muted-foreground">
              {opportunity.suggestedAngle}
            </p>
          </CardContent>
        </Card>
      </PaneBody>

      <PaneActionBar
        note="Analyzing opens the reply workbench with 3 replies + 3 quote tweets in your voice."
      >
        <Button asChild className="flex-1">
          <Link href={`/dashboard?url=${encodeURIComponent(opportunity.tweetUrl)}`}>
            <ArrowRight />
            Analyze &amp; reply
          </Link>
        </Button>
        <Button variant="outline" onClick={dismiss} disabled={pending}>
          Dismiss
        </Button>
      </PaneActionBar>
    </Pane>
  );
}
