"use client";

import { Check } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { BuildModelResult } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { PillButton } from "./wizard-ui";

export function ReadyStep({
  firstName,
  result,
  onStart,
  pending,
}: {
  firstName: string;
  result: BuildModelResult;
  onStart: () => void;
  pending: boolean;
}) {
  const sessionToken = useSessionToken();
  // Live via Convex reactivity: the count ticks up as the first scan lands.
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken ? { sessionToken, limit: 50 } : "skip"
  );
  const queued = opportunities?.length ?? 0;

  const learned: Array<[string, React.ReactNode]> = [
    ["tone", result.style.tone],
    ["sentences", result.style.sentenceLength],
    ["punctuation", result.style.punctuation],
    ["emoji", result.style.emojiUse],
  ];

  return (
    <div className="w-full max-w-[620px] rounded-2xl border border-border/60 bg-card px-6 py-12 text-center sm:px-14">
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-primary/20 text-primary">
        <Check className="size-6" strokeWidth={2.6} />
      </div>
      <h1 className="text-balance font-serif text-[2.1rem] leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
        {firstName}&apos;s model is ready.
      </h1>
      <p className="mx-auto mt-3.5 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
        Built from{" "}
        <span className="font-medium text-foreground">
          {result.postCount} posts
        </span>
        {result.usedSampleTweets && " (sample posts — demo mode)"}. It keeps
        improving as you reply and edit.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-panel p-6 text-left">
        <p className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          What we learned
        </p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1.5 text-[13.5px]">
          {learned.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="pt-px font-mono text-xs text-muted-foreground/70">
                {label}
              </dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
          {result.style.commonPhrases.length > 0 && (
            <div className="contents">
              <dt className="pt-px font-mono text-xs text-muted-foreground/70">
                phrases
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {result.style.commonPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded border border-border/60 bg-muted px-2 py-0.5 font-mono text-[11.5px] text-muted-foreground"
                  >
                    {phrase}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className="contents">
            <dt className="pt-px font-mono text-xs text-muted-foreground/70">
              queue
            </dt>
            <dd className="text-foreground">
              <span className="font-mono tabular-nums text-primary">
                {queued}
              </span>{" "}
              {queued === 1 ? "conversation" : "conversations"} scored in your
              niche so far
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-7">
        <PillButton onClick={onStart} disabled={pending}>
          Start replying
        </PillButton>
      </div>
      <p className="mt-4 font-mono text-[11.5px] text-muted-foreground/70">
        <span className="text-muted-foreground">You click send. Always.</span>{" "}
        — nothing posts without your approval on that exact text.
      </p>
    </div>
  );
}
