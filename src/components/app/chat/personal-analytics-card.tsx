"use client";

import { Clock3, Lightbulb, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePersonalAnalytics } from "@/components/app/personal-analytics/use-personal-analytics";
import { insightCardTypography as t } from "./insight-card-typography";
import { rpType } from "@/theme/typography";
import {
  personalAnalyticsHeroCaption,
  personalAnalyticsHeroMetric,
  personalAnalyticsHistoryLabel,
  personalAnalyticsInProgressLabel,
  personalAnalyticsSections,
  personalAnalyticsSparseCopy,
  personalAnalyticsTitle,
  personalAnalyticsTitleSubtitle,
} from "@/lib/dashboard-insight-copy";

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${rate}%`;
}

function formatWindow(hour: number) {
  const startHour = hour % 24;
  const endHour = (hour + 1) % 24;
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

function formatHour(hour: number) {
  const period = hour >= 12 ? "p" : "a";
  const hour12 = hour % 12 || 12;
  return `${hour12}${period}`;
}

function intensityClass(sent: number, rate: number | null) {
  if (sent === 0 || rate === null) return "border-border bg-background";
  if (rate >= 67) return "border-primary/50 bg-primary/30";
  if (rate >= 34) return "border-primary/35 bg-primary/20";
  return "border-border bg-muted";
}

export function PersonalAnalyticsCard() {
  const analytics = usePersonalAnalytics();

  if (!analytics) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-3 p-6 pb-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-6 pt-0">
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const {
    sample,
    categories,
    angles,
    timeOfDay,
    historyLimit,
    publishedToday,
    awaitingOutcome,
  } = analytics;

  const inProgressLabel = personalAnalyticsInProgressLabel(awaitingOutcome);
  const sparseCopy = personalAnalyticsSparseCopy({
    sent: sample.sent,
    isSparse: sample.isSparse,
    publishedToday,
  });

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 p-6 pb-4">
        <div className="space-y-1">
          <p className={t.eyebrow}>Personal analytics</p>
          <CardTitle className={t.title}>{personalAnalyticsTitle()}</CardTitle>
          <p className={cn(rpType.sm, "text-muted-foreground")}>
            {personalAnalyticsTitleSubtitle()}
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <div className={t.heroMetric}>
              {personalAnalyticsHeroMetric({
                responded: sample.responded,
                sent: sample.sent,
                publishedToday,
              })}
            </div>
            <p className={cn("mt-1", t.metricCaption)}>
              {personalAnalyticsHeroCaption()}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <div className={t.listValue}>{formatRate(sample.responseRate)}</div>
            <p className={t.metricCaption}>
              {inProgressLabel ??
                personalAnalyticsHistoryLabel(sample.sent, historyLimit)}
            </p>
          </div>
        </div>
        <p className={t.body}>{sparseCopy}</p>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-6 pt-0">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="space-y-3">
            <div className={cn("inline-flex items-center gap-2", t.sectionLabel)}>
              <Tag className="size-4 text-primary" />
              {personalAnalyticsSections.categories}
            </div>
            {categories.length === 0 ? (
              <p className={t.body}>{personalAnalyticsSections.emptyCategories}</p>
            ) : (
              <ul className="space-y-2">
                {categories.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className={t.listLabel}>{item.label}</p>
                      <p className={t.listMeta}>
                        {item.responded}/{item.sent}{" "}
                        {personalAnalyticsSections.listReplied}
                        {item.isSparse ? personalAnalyticsSections.sparseSample : ""}
                      </p>
                    </div>
                    <div className={t.listValue}>{item.responseRate}%</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className={cn("inline-flex items-center gap-2", t.sectionLabel)}>
              <Lightbulb className="size-4 text-primary" />
              {personalAnalyticsSections.angles}
            </div>
            {angles.length === 0 ? (
              <p className={t.body}>{personalAnalyticsSections.emptyAngles}</p>
            ) : (
              <ul className="space-y-2">
                {angles.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className={t.listLabel}>{item.label}</p>
                      <p className={t.listMeta}>
                        {item.responded}/{item.sent}{" "}
                        {personalAnalyticsSections.listReplied}
                        {item.isSparse ? personalAnalyticsSections.sparseSample : ""}
                      </p>
                    </div>
                    <div className={t.listValue}>{item.responseRate}%</div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className={cn("inline-flex items-center gap-2", t.sectionLabel)}>
              <Clock3 className="size-4 text-primary" />
              {personalAnalyticsSections.sendHours}
            </div>
            {timeOfDay.bestHours.length === 0 ? (
              <p className={t.body}>{personalAnalyticsSections.emptySendHours}</p>
            ) : (
              <ul className="space-y-2">
                {timeOfDay.bestHours.map((bucket) => (
                  <li
                    key={bucket.hour}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className={t.windowTime}>
                        {formatWindow(bucket.hour)}
                      </p>
                      <p className={t.listMeta}>
                        {bucket.responded}/{bucket.sent}{" "}
                        {personalAnalyticsSections.listReplied}
                        {bucket.isSparse ? personalAnalyticsSections.sparseSample : ""}
                      </p>
                    </div>
                    <div className={t.listValue}>
                      {formatRate(bucket.responseRate)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={t.title}>{personalAnalyticsSections.heatmapTitle}</p>
              <p className={t.sectionSubtitle}>
                {personalAnalyticsSections.heatmapSubtitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(26px,1fr))] gap-1">
            {timeOfDay.buckets.map((bucket) => (
              <div key={bucket.hour} className="space-y-1">
                <div
                  className={cn(
                    "h-8 rounded-md border transition-colors",
                    intensityClass(bucket.sent, bucket.responseRate)
                  )}
                  title={`${formatWindow(bucket.hour)} · ${bucket.responded}/${bucket.sent} ${personalAnalyticsSections.listReplied}${bucket.responseRate === null ? "" : ` · ${bucket.responseRate}%`}`}
                />
                <div className={cn("pt-1 text-center", t.hourLabel)}>
                  {formatHour(bucket.hour)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
