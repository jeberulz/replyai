"use client";

import { Clock3, Lightbulb, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePersonalAnalytics } from "@/components/app/personal-analytics/use-personal-analytics";

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

function historyLabel(sent: number, historyLimit: number) {
  return sent >= historyLimit
    ? `Most recent ${historyLimit} closed replies`
    : `${sent} closed ${sent === 1 ? "reply" : "replies"}`;
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

  const { sample, categories, angles, timeOfDay, historyLimit } = analytics;

  const sparseCopy =
    sample.sent === 0
      ? "Once a sent reply either gets a response or ages out of its observation window, this fills with observed patterns."
      : sample.isSparse
        ? "Early read only — keep sending before treating any pattern here as durable."
        : "Observed counts only — these are closed outcomes, not predictions.";

  return (
    <Card className="w-full">
      <CardHeader className="space-y-3 p-6 pb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
            Personal analytics
          </p>
          <CardTitle className="font-serif text-xl leading-8 text-foreground">
            What your closed reply outcomes are actually showing
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <div className="font-mono text-[2.5rem] font-bold leading-none tabular-nums text-foreground">
              {sample.responded}/{sample.sent}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              replies earned a response back
            </p>
          </div>
          <div className="space-y-1 text-right">
            <div className="font-mono text-sm tabular-nums text-foreground">
              {formatRate(sample.responseRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {historyLabel(sample.sent, historyLimit)}
            </p>
          </div>
        </div>
        <p className="text-[13px] leading-[18px] text-muted-foreground">{sparseCopy}</p>
      </CardHeader>

      <CardContent className="space-y-5 px-6 pb-6 pt-0">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="size-4 text-primary" />
              Categories
            </div>
            {categories.length === 0 ? (
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                No generated-reply category history yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {categories.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.responded}/{item.sent} replied
                        {item.isSparse ? " · thin sample" : ""}
                      </p>
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground">
                      {item.responseRate}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="size-4 text-primary" />
              Openings
            </div>
            {angles.length === 0 ? (
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                No attributed opening history yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {angles.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.responded}/{item.sent} replied
                        {item.isSparse ? " · thin sample" : ""}
                      </p>
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground">
                      {item.responseRate}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="size-4 text-primary" />
              Response windows
            </div>
            {timeOfDay.bestHours.length === 0 ? (
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                No closed reply windows yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {timeOfDay.bestHours.map((bucket) => (
                  <li
                    key={bucket.hour}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-mono text-sm tabular-nums text-foreground">
                        {formatWindow(bucket.hour)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bucket.responded}/{bucket.sent} replied
                        {bucket.isSparse ? " · thin sample" : ""}
                      </p>
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground">
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
              <p className="font-serif text-xl leading-8 text-foreground">Hourly response map</p>
              <p className="text-sm text-muted-foreground">
                Each hour reflects closed reply outcomes in your local time.
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
                  title={`${formatWindow(bucket.hour)} · ${bucket.responded}/${bucket.sent} replied${bucket.responseRate === null ? "" : ` · ${bucket.responseRate}%`}`}
                />
                <div className="pt-1 text-center font-mono text-xs text-muted-foreground">
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
