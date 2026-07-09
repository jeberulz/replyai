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
import { AuthorDossier } from "@/components/app/author-dossier";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { IconButton } from "@/components/ds/icon-button";
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
  const freshness = opportunity.freshnessLabel;
  const windowClosed = opportunity.windowClosed ?? false;
  const displayScore = opportunity.effectiveScore ?? opportunity.score;

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
          <IconButton
            label="Dismiss"
            icon={<X className="size-[17px]" />}
            variant="ghost"
            size="sm"
            onClick={dismiss}
            isDisabled={pending}
          />
        }
      />
      <PaneTitleRow title="Opportunity">
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
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        <Card padding={3}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-sm">
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
          </div>
        </Card>

        <AuthorDossier authorHandle={opportunity.authorHandle} />

        <Card padding={3}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Worth replying?</h3>
              <ScoreBadge value={displayScore} reason={opportunity.reason} />
            </div>
            <p className="text-sm leading-normal text-muted-foreground">
              {opportunity.reason}
            </p>
          </div>
        </Card>

        <Card padding={3}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Suggested angle</h3>
            </div>
            <p className="text-[15px] leading-normal text-muted-foreground">
              {opportunity.suggestedAngle}
            </p>
          </div>
        </Card>
      </PaneBody>

      <PaneActionBar
        note="Analyzing opens the reply workbench with 3 replies + 3 quote tweets in your voice."
      >
        <Button
          label="Analyze & reply"
          icon={<ArrowRight className="size-3.5" />}
          href={`/dashboard?url=${encodeURIComponent(opportunity.tweetUrl)}`}
          as={Link}
          className="w-full sm:flex-1"
        />
        <Button
          variant="secondary"
          label="Dismiss"
          onClick={dismiss}
          isDisabled={pending}
          className="w-full sm:w-auto"
        />
      </PaneActionBar>
    </Pane>
  );
}
