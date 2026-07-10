"use client";

import { Clock3, ShieldAlert, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReplyPacingWarningLevel } from "../../../../shared/replyPacing";
import { useReplyPacing } from "@/components/app/reply-pacing/use-reply-pacing";

const warningMeta: Record<
  ReplyPacingWarningLevel,
  {
    badge: "accent" | "warning" | "destructive";
    label: string;
    tone: string;
  }
> = {
  none: {
    badge: "accent",
    label: "Target 15-20",
    tone: "border-border",
  },
  watch: {
    badge: "warning",
    label: "Stay selective",
    tone: "border-warning/30 bg-warning/5",
  },
  warning: {
    badge: "warning",
    label: "Slow the pace",
    tone: "border-warning/40 bg-warning/10",
  },
  limit: {
    badge: "destructive",
    label: "Back off volume",
    tone: "border-destructive/40 bg-destructive/10",
  },
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

  const meta = warningMeta[pacing.warningLevel];

  return (
    <Card className={cn("w-full", meta.tone)}>
      <CardHeader className="space-y-3 p-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
              Reply budget
            </p>
            <CardTitle className="font-serif text-xl leading-8 text-foreground">
              Pace the day, then stop pushing volume
            </CardTitle>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6 pb-5">
          <div>
            <div className="font-mono text-[2.5rem] font-bold leading-none tabular-nums text-foreground">
              {pacing.sentRepliesToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">sent today</p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-x-6 gap-y-3 text-[13px] leading-[18px] text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <span>
                Aim for{" "}
                <span className="font-medium text-foreground">
                  {pacing.targetMin}-{pacing.targetMax}
                </span>{" "}
                strong replies
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <ShieldAlert
                className={cn(
                  "size-4",
                  pacing.warningLevel === "limit"
                    ? "text-destructive"
                    : pacing.warningLevel === "none"
                      ? "text-muted-foreground"
                      : "text-warning"
                )}
              />
              <span>{pacing.headline}</span>
            </div>
          </div>
        </div>

        <p className="text-[15px] leading-[22px] text-foreground">{pacing.detail}</p>
      </CardHeader>

      <CardContent className="space-y-3 px-6 pb-6 pt-0">
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <div>
            <p className="text-lg font-semibold text-foreground">Today&apos;s best windows</p>
            <p className="text-sm text-muted-foreground">
              Ranked from your sent-reply history plus live opportunity timing.
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
                <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {window.label}
                </div>
                <p className="max-w-[52ch] text-base leading-6 text-muted-foreground">
                  {window.reason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {window.opportunityCount > 0 && (
                  <span className="font-mono tabular-nums">
                    {window.opportunityCount} live
                  </span>
                )}
                {window.noOrMinorRate !== null && (
                  <span className="font-mono tabular-nums">
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
