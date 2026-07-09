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
      <Card className="w-full max-w-3xl">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-4 w-full" />
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
    <Card className={cn("w-full max-w-3xl", meta.tone)}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Reply budget
            </p>
            <CardTitle className="text-base font-semibold">
              Pace the day, then stop pushing volume
            </CardTitle>
          </div>
          <Badge variant={meta.badge}>{meta.label}</Badge>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="font-mono text-[2rem] leading-none tabular-nums text-foreground">
              {pacing.sentRepliesToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">sent today</p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
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

        <p className="text-sm leading-6 text-muted-foreground">{pacing.detail}</p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Today&apos;s best windows</p>
            <p className="text-xs text-muted-foreground">
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
                <div className="font-mono text-sm tabular-nums text-foreground">
                  {window.label}
                </div>
                <p className="max-w-[52ch] text-xs leading-5 text-muted-foreground">
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
