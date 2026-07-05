"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { BuildModelResult } from "@/app/actions";

/**
 * The "building your model" moment. The checklist is paced for legibility,
 * but every row only completes after the real server action has returned —
 * counts and detected traits come from the result, never invented.
 */
export function BuildingStep({
  firstName,
  username,
  keywords,
  result,
  onFinished,
}: {
  firstName: string;
  username: string;
  keywords: string[];
  result: BuildModelResult | null;
  onFinished: () => void;
}) {
  const [doneCount, setDoneCount] = useState(0);
  const resultAt = useRef<number | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const id = window.setInterval(() => {
      if (!result) return;
      if (resultAt.current === null) resultAt.current = Date.now();
      if (reducedMotion) {
        setDoneCount(4);
        return;
      }
      const since = Date.now() - resultAt.current;
      // Row 1 completes with the result; the rest reveal on a short cadence.
      const n = 1 + [1100, 2200, 3200].filter((d) => since >= d).length;
      setDoneCount(n);
    }, 120);
    return () => window.clearInterval(id);
  }, [result]);

  useEffect(() => {
    if (doneCount < 4) return;
    const t = window.setTimeout(onFinished, 800);
    return () => window.clearTimeout(t);
  }, [doneCount, onFinished]);

  const rows: Array<{ title: string; running: string; done: string }> = [
    {
      title: "Reading your posts",
      running: `fetching from @${username}…`,
      done: result
        ? `${result.postCount} posts read${result.usedSampleTweets ? " (sample posts — demo mode)" : ""}`
        : "",
    },
    {
      title: "Measuring your style",
      running: "sentence length · punctuation · phrases…",
      done: result
        ? `${result.style.sentenceLength} · emoji: ${result.style.emojiUse}`
        : "",
    },
    {
      title: "Scanning your niche",
      running:
        keywords.length > 0 ? keywords.slice(0, 3).join(" · ") + "…" : "scanning…",
      done: "scan running — results land in your feed",
    },
    {
      title: "Building your voice profile",
      running: "assembling…",
      done: result ? `"${result.profileName}" set as your default` : "",
    },
  ];

  return (
    <div className="w-full max-w-[640px] rounded-2xl border border-border/60 bg-card px-6 py-14 text-center sm:px-14">
      <h1 className="text-balance font-serif text-[2.1rem] leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
        Building {firstName}&apos;s writing model…
      </h1>
      <p className="mx-auto mt-3.5 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
        This usually takes under a minute. Every number below is real.
      </p>

      <div className="mx-auto mt-10 max-w-[400px] text-left">
        {rows.map((row, i) => {
          const state =
            i < doneCount ? "done" : i === doneCount ? "running" : "pending";
          return (
            <div key={row.title} className="relative flex gap-4 pb-8 last:pb-0">
              {i < rows.length - 1 && (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 left-[13px] top-[30px] w-px bg-border/60"
                />
              )}
              <span
                className={`z-10 grid size-[27px] flex-none place-items-center rounded-full border transition-colors ${
                  state === "done"
                    ? "border-primary bg-primary"
                    : "border-border bg-card"
                }`}
              >
                {state === "done" ? (
                  <Check className="size-3.5 text-white" strokeWidth={2.6} />
                ) : state === "running" ? (
                  <span
                    aria-hidden
                    className="size-[15px] animate-spin rounded-full border-2 border-accent border-t-primary"
                  />
                ) : null}
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={`block text-[15px] transition-colors ${
                    state === "pending"
                      ? "text-muted-foreground/50"
                      : "text-foreground"
                  }`}
                >
                  {row.title}
                </span>
                <span
                  className={`mt-0.5 block min-h-[17px] font-mono text-[11.5px] uppercase tracking-[0.1em] transition-opacity ${
                    state === "pending"
                      ? "opacity-0"
                      : state === "running"
                        ? "text-muted-foreground/70 opacity-100"
                        : "text-muted-foreground opacity-100"
                  }`}
                >
                  {state === "done" ? row.done : row.running}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
