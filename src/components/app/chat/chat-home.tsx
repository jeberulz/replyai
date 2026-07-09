"use client";

import { useEffect } from "react";
import { useSidebar } from "@/components/app/sidebar/sidebar-provider";
import { parseTweetUrl } from "../../../../shared/scoring";
import { AnalysisThread } from "./analysis-thread";
import { ChatComposer } from "./chat-composer";
import { ReplyPacingCard } from "./reply-pacing-card";
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
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="space-y-2 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Your reply desk
            </p>
            <h1 className="font-serif text-[2rem] leading-[1.05] tracking-[-0.02em] text-foreground">
              What conversation are you joining, {displayName.split(" ")[0]}?
            </h1>
            <p className="mx-auto max-w-[48ch] text-sm leading-6 text-muted-foreground">
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
          <SuggestionChips onPick={submit} disabled={starting} />
          <ReplyPacingCard />
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
