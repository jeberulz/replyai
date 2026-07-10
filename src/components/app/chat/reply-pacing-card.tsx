"use client";

import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReplyPacingWarningLevel } from "../../../../shared/replyPacing";
import { useReplyPacing } from "@/components/app/reply-pacing/use-reply-pacing";
import { insightCardTypography as t } from "./insight-card-typography";

function badgeForPacing(
  warningLevel: ReplyPacingWarningLevel,
  progress: "starting" | "target" | "above_target"
): { badge: "accent" | "warning" | "destructive"; label: string } {
  if (warningLevel === "limit") {
    return { badge: "destructive", label: "Back off" };
  }
  if (warningLevel === "warning") {
    return { badge: "warning", label: "Slow down" };
  }
  if (warningLevel === "watch") {
    return { badge: "warning", label: "Stay selective" };
  }
  if (progress === "target") {
    return { badge: "accent", label: "On pace" };
  }
  if (progress === "above_target") {
    return { badge: "warning", label: "Above target" };
  }
  return { badge: "accent", label: "Below target" };
}

const toneByWarning: Record<ReplyPacingWarningLevel, string> = {
  none: "border-border",
  watch: "border-warning/30 bg-warning/5",
  warning: "border-warning/40 bg-warning/10",
  limit: "border-destructive/40 bg-destructive/10",
};

export function ReplyPacingCard() {
  const pacing = useReplyPacing();

  if (!pacing) {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-6 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const badge = badgeForPacing(pacing.warningLevel, pacing.progress);

  return (
    <Card className={cn("w-full", toneByWarning[pacing.warningLevel])}>
      <CardHeader className="space-y-4 p-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className={t.eyebrow}>Reply budget</p>
            <CardTitle className={t.title}>{pacing.headline}</CardTitle>
          </div>
          <Badge variant={badge.badge}>{badge.label}</Badge>
        </div>

        <div className="flex items-end justify-between gap-6 pb-1">
          <div>
            <div className={t.heroMetric}>{pacing.sentRepliesToday}</div>
            <p className={cn("mt-3.5", t.metricCaption)}>sent today</p>
            {pacing.remainingToTarget > 0 ? (
              <p className={cn("mt-1", t.metricCaption)}>
                {pacing.remainingToTarget} to reach {pacing.targetMin}
              </p>
            ) : null}
          </div>
          <p className={cn("text-right", t.metaLine)}>
            Target{" "}
            <span className="font-medium text-foreground">
              {pacing.targetMin}–{pacing.targetMax}
            </span>{" "}
            strong replies / day
          </p>
        </div>

        <p className={t.bodyDetail}>{pacing.detail}</p>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-6 pt-0">
        <div className="flex items-center justify-between gap-2 border-t border-border pt-5">
          <div>
            <p className={t.sectionTitle}>Today&apos;s best windows</p>
            <p className={t.sectionSubtitle}>
              When to spend your remaining budget — from your send history and live feed.
            </p>
          </div>
          <Clock3 className="size-4 text-muted-foreground" />
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {pacing.bestWindows.map((window) => (
            <div
              key={window.label}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className={t.windowTime}>{window.label}</div>
                <p className={cn("max-w-[52ch]", t.windowReason)}>
                  {window.reason}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
                {window.opportunityCount > 0 && (
                  <span className="whitespace-nowrap font-mono tabular-nums">
                    {window.opportunityCount} live
                  </span>
                )}
                {window.noOrMinorRate !== null && (
                  <span className="whitespace-nowrap font-mono tabular-nums">
                    {window.noOrMinorRate}% clean
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
