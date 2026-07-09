"use client";

import { Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEngagementWindow } from "@/components/app/engagement-window/use-engagement-window";
import {
  formatEngagementMinutes,
  formatEngagementWindowGuidance,
} from "../../../../shared/engagementWindow";

function bandLabel(curve: {
  authorBandLabel: string;
  topicTag: string | null;
}) {
  return curve.topicTag
    ? `${curve.authorBandLabel} · ${curve.topicTag}`
    : curve.authorBandLabel;
}

export function EngagementWindowCard() {
  const snapshot = useEngagementWindow();

  if (!snapshot) {
    return (
      <Card className="w-full max-w-3xl">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const primary = snapshot.primary;
  const guidance = primary
    ? formatEngagementWindowGuidance({ curve: primary })
    : null;

  const empty =
    !primary ||
    (snapshot.totalResponded === 0 && !snapshot.isDemo);

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="space-y-3 pb-4">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Engagement window
            {snapshot.isDemo ? " · demo" : ""}
          </p>
          <CardTitle className="text-base font-semibold">
            When reply-backs actually land in your niches
          </CardTitle>
        </div>

        {empty || !guidance ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock3 className="size-4 text-primary" />
              Not enough data yet
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Need at least {snapshot.minSampleSize} reply-backs in an author
              band before showing a timing window. Observed counts only — never
              a fake engagement score.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="font-mono text-[2rem] leading-none tabular-nums text-foreground">
              {primary.hasEnoughData && primary.medianPeakMinutes != null
                ? formatEngagementMinutes(primary.medianPeakMinutes)
                : "—"}
            </div>
            <p className="text-sm font-medium text-foreground">
              {guidance.headline}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {guidance.detail}
            </p>
          </div>
        )}
      </CardHeader>

      {!empty && snapshot.buckets.length > 0 ? (
        <CardContent className="space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Per author-size band
            {snapshot.buckets.some((b) => b.topicTag)
              ? " × topic"
              : ""}{" "}
            — medians from closed reply-backs only.
          </p>
          <ul className="space-y-2">
            {snapshot.buckets.map((curve) => {
              const key = `${curve.authorBand}:${curve.topicTag ?? ""}`;
              return (
                <li
                  key={key}
                  className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {bandLabel(curve)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      n={curve.sampleSize}
                      {curve.hasEnoughData
                        ? ""
                        : ` · need ${snapshot.minSampleSize}`}
                    </p>
                  </div>
                  <div className="font-mono text-sm tabular-nums text-foreground">
                    {curve.hasEnoughData && curve.medianPeakMinutes != null
                      ? formatEngagementMinutes(curve.medianPeakMinutes)
                      : "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
