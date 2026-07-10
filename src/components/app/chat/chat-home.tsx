"use client";

import { useEffect } from "react";
import { useSidebar } from "@/components/app/sidebar/sidebar-provider";
import { cn } from "@/lib/utils";
import { parseTweetUrl } from "../../../../shared/scoring";
import { AnalysisThread } from "./analysis-thread";
import { ChatComposer } from "./chat-composer";
import { EngagementWindowCard } from "./engagement-window-card";
import { PersonalAnalyticsCard } from "./personal-analytics-card";
import { ReplyPacingCard } from "./reply-pacing-card";
import { FairUseBanner } from "@/components/app/fair-use/fair-use-banner";
import { rpType } from "@/theme/typography";
import { StatStrip } from "./stat-strip";
import { SuggestionChips } from "./suggestion-chips";
import { type AnalyzeInput, useAnalysisPipeline } from "./use-analysis-pipeline";

/**
 * The chat-first home surface. Empty state leads with the composer; once an
 * analysis starts (or when opened via /analysis/[id]) the thread takes the
 * window and the composer docks below it for the next paste.
 */
export function ChatHome({
  displayName,
  isDemo,
  initialUrl,
  initialAnalysisId,
  autoStart = false,
}: {
  displayName: string;
  isDemo: boolean;
  initialUrl?: string;
  initialAnalysisId?: string;
  /** When true with a valid initialUrl, start analysis once (extension deep link). */
  autoStart?: boolean;
}) {
  const { selectedProjectId } = useSidebar();
  const { activeAnalysisId, starting, startError, start, retry } =
    useAnalysisPipeline(initialAnalysisId);

  const submit = (input: AnalyzeInput) => {
    void start({
      ...input,
      projectId: selectedProjectId ?? undefined,
    });
  };

  // Browser extension (WP10): /dashboard?url=…&auto=1 opens the workbench
  // without a second Analyze click. Strip `auto` from the URL before starting
  // so React Strict Mode remounts / refresh cannot double-fire. Never publishes.
  useEffect(() => {
    if (!autoStart || !initialUrl || initialAnalysisId) return;
    if (!parseTweetUrl(initialUrl)) return;
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    if (auto !== "1" && auto !== "true") return;
    params.delete("auto");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
    void start({
      url: initialUrl,
      projectId: selectedProjectId ?? undefined,
    });
  }, [autoStart, initialUrl, initialAnalysisId, selectedProjectId, start]);

  if (!activeAnalysisId) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-[1200px] flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex w-full max-w-3xl flex-col items-center gap-8">
            <div className="space-y-2 text-center">
              <p className={cn(rpType.xsUpper, "text-foreground")}>
                Your reply desk
              </p>
              <h1 className={cn(rpType.pageTitle, "text-foreground")}>
                What conversation are you joining, {displayName.split(" ")[0]}?
              </h1>
              <p className={cn(rpType.body, "mx-auto max-w-[485px] text-muted-foreground")}>
                Paste a tweet to get a worth-replying score, the conversation&apos;s
                missing angles, and 3 replies + 3 quote tweets in your voice.
              </p>
            </div>
            <ChatComposer
              onSubmit={submit}
              pending={starting}
              error={startError}
              initialValue={initialUrl}
            />
            <FairUseBanner className="w-full max-w-xl" />
            <SuggestionChips onPick={submit} disabled={starting} />
          </div>
          <div className="grid w-full items-start gap-6 lg:grid-cols-2">
            <ReplyPacingCard />
            <div className="grid gap-6">
              <EngagementWindowCard />
              <PersonalAnalyticsCard />
            </div>
          </div>
        </div>
        <div className="py-6">
          <StatStrip />
        </div>
      </div>
    );
  }

  const composer = (
    <ChatComposer
      onSubmit={submit}
      pending={starting}
      error={startError}
      placeholder="Paste another tweet to start a new analysis…"
    />
  );

  return (
    <div className="lg:-mx-10 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <AnalysisThread
        key={activeAnalysisId}
        analysisId={activeAnalysisId}
        isDemo={isDemo}
        onRetry={retry}
        composer={composer}
      />
    </div>
  );
}
