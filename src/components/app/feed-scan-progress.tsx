"use client";

import { useEffect, useMemo, useState } from "react";
import { Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EnabledSource = "following" | "lists" | "watched" | "search";

function buildScanSteps(enabledSources: EnabledSource[]): string[] {
  const sourceSteps: string[] = [];

  if (enabledSources.includes("following")) {
    sourceSteps.push("Pulling posts from your following timeline…");
  }
  if (enabledSources.includes("lists")) {
    sourceSteps.push("Checking your engage lists…");
  }
  if (enabledSources.includes("watched")) {
    sourceSteps.push("Reading watched accounts…");
  }
  if (enabledSources.includes("search")) {
    sourceSteps.push("Searching recent posts for your topics…");
  }
  if (sourceSteps.length === 0) {
    sourceSteps.push("Pulling posts from your X timeline…");
  }

  return [
    ...sourceSteps,
    "Filtering for your focus topics…",
    "Scoring reply windows and velocity…",
    "Surfacing the best opportunities…",
  ];
}

export function FeedScanProgress({
  keywords,
  enabledSources = ["following"],
}: {
  keywords: string[];
  enabledSources?: readonly EnabledSource[];
}) {
  const steps = useMemo(
    () => buildScanSteps([...enabledSources]),
    [enabledSources]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const activeStepIndex = stepIndex % steps.length;

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIndex((i) => i + 1);
    }, 2600);
    return () => window.clearInterval(id);
  }, [steps.length]);

  const progress = ((activeStepIndex + 1) / steps.length) * 100;

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
            key={activeStepIndex}
            className="mt-3 min-h-10 max-w-[28ch] text-sm leading-relaxed text-muted-foreground animate-in fade-in duration-300"
          >
            {steps[activeStepIndex]}
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
              {steps.map((label, i) => (
                <span
                  key={label}
                  className={cn(
                    "hidden sm:inline transition-colors duration-300",
                    i <= activeStepIndex ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  {i + 1}
                </span>
              ))}
              <span className="sm:hidden text-primary">
                Step {activeStepIndex + 1} of {steps.length}
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
