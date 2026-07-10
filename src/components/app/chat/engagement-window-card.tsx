"use client";

import { Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEngagementWindow } from "@/components/app/engagement-window/use-engagement-window";
import { formatEngagementMinutes } from "../../../../shared/engagementWindow";
import { insightCardTypography as t } from "./insight-card-typography";
import { rpType } from "@/theme/typography";
import {
  engagementWindowBucketFooter,
  engagementWindowBucketSampleMeta,
  engagementWindowEmptyBody,
  engagementWindowEmptyStatus,
  engagementWindowFilledCopy,
  engagementWindowTitle,
  engagementWindowTitleSubtitle,
} from "@/lib/dashboard-insight-copy";

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
      <Card className="w-full">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const primary = snapshot.primary;
  const empty =
    !primary ||
    (snapshot.totalResponded === 0 && !snapshot.isDemo);

  const filledCopy = primary
    ? engagementWindowFilledCopy({
        curve: primary,
        minSampleSize: snapshot.minSampleSize,
      })
    : null;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 p-6 pb-4">
        <div className="space-y-1">
          <p className={t.eyebrow}>
            Engagement window
            {snapshot.isDemo ? " · demo" : ""}
          </p>
          <CardTitle className={t.title}>{engagementWindowTitle()}</CardTitle>
          <p className={cn(rpType.sm, "text-muted-foreground")}>
            {engagementWindowTitleSubtitle()}
          </p>
        </div>

        {empty || !filledCopy ? (
          <div className="space-y-2">
            <div className={cn("inline-flex items-center gap-2", t.statusLine)}>
              <Clock3 className="size-4 text-primary" />
              {engagementWindowEmptyStatus()}
            </div>
            <p className={t.body}>
              {engagementWindowEmptyBody({
                publishedToday: snapshot.publishedToday,
                minSampleSize: snapshot.minSampleSize,
              })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className={t.heroMetric}>
              {primary.hasEnoughData && primary.medianPeakMinutes != null
                ? formatEngagementMinutes(primary.medianPeakMinutes)
                : "—"}
            </div>
            <p className={cn(rpType.smMedium, "text-foreground")}>
              {filledCopy.headline}
            </p>
            <p className={t.body}>{filledCopy.detail}</p>
          </div>
        )}
      </CardHeader>

      {!empty && snapshot.buckets.length > 0 ? (
        <CardContent className="space-y-3 border-t border-border px-6 pb-6 pt-4">
          <p className={t.sectionSubtitle}>
            {engagementWindowBucketFooter(
              snapshot.buckets.some((b) => b.topicTag)
            )}
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
                    <p className={t.listLabel}>{bandLabel(curve)}</p>
                    <p className={t.listMeta}>
                      {engagementWindowBucketSampleMeta({
                        sampleSize: curve.sampleSize,
                        minSampleSize: snapshot.minSampleSize,
                        hasEnoughData: curve.hasEnoughData,
                      })}
                    </p>
                  </div>
                  <div className={t.listValue}>
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
