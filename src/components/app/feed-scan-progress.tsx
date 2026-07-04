"use client";

import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Pulling posts from your X timeline…",
  "Filtering for your focus topics…",
  "Scoring reply windows and velocity…",
  "Surfacing the best opportunities…",
] as const;

export function FeedScanProgress({ keywords }: { keywords: string[] }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <Card className="overflow-hidden border-primary/25 bg-card">
      <CardContent className="px-6 py-10">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div
            className="relative mb-6 flex size-18 items-center justify-center"
            aria-hidden
          >
            <span className="absolute inset-0 animate-ping rounded-full border border-primary/25" />
            <span className="absolute inset-2 animate-pulse rounded-full border border-primary/40" />
            <span className="absolute inset-4 rounded-full bg-primary/10" />
            <Radar className="relative size-7 text-primary" />
          </div>

          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Scanning in background
          </p>
          <h3 className="mt-2 font-serif text-[1.35rem] leading-tight tracking-[-0.02em] text-foreground">
            Reading your feed
          </h3>
          <p
            key={stepIndex}
            className="mt-3 min-h-10 max-w-[28ch] text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-300"
          >
            {STEPS[stepIndex]}
          </p>

          {keywords.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 w-full space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              {STEPS.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "hidden sm:inline transition-colors duration-300",
                    i <= stepIndex ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  {i + 1}
                </span>
              ))}
              <span className="sm:hidden text-primary">
                Step {stepIndex + 1} of {STEPS.length}
              </span>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Results appear here automatically — usually within a few seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
