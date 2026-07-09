"use client";

import Link from "next/link";
import { PaneEyebrow } from "@/components/app/split/pane-chrome";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import {
  trendRadarSentence,
  type TrendTopic,
} from "../../../../shared/trends";

type TrendRadarStripProps = {
  topics: TrendTopic[];
  corpusSize: number;
  demo: boolean;
  /** Active topic slug from `?topic=` — highlights the chip. */
  activeTopicSlug?: string | null;
  className?: string;
};

/**
 * Compact Dark Chrome strip: “N conversations forming around X”.
 * Counts only — no viral predictions or fake engagement %.
 */
export function TrendRadarStrip({
  topics,
  corpusSize,
  demo,
  activeTopicSlug,
  className,
}: TrendRadarStripProps) {
  if (topics.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/40 px-4 py-3 sm:px-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <PaneEyebrow>Trend radar</PaneEyebrow>
        {demo ? (
          <Text size="sm" className="text-muted-foreground">
            Demo topics
          </Text>
        ) : (
          <Text size="sm" className="tabular-nums text-muted-foreground">
            {corpusSize} scanned · 7d
          </Text>
        )}
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {topics.map((topic) => {
          const active = activeTopicSlug === topic.slug;
          const href = active
            ? "/feed"
            : `/feed?topic=${encodeURIComponent(topic.slug)}`;
          return (
            <li key={topic.slug}>
              <Link
                href={href}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                  active
                    ? "bg-card text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                <span className="font-medium text-foreground">
                  {trendRadarSentence(topic)}
                </span>
                {active ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Clear filter
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
