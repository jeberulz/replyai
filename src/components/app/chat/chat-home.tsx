"use client";

import { useSidebar } from "@/components/app/sidebar/sidebar-provider";
import { AnalysisThread } from "./analysis-thread";
import { ChatComposer } from "./chat-composer";
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
}: {
  displayName: string;
  isDemo: boolean;
  initialUrl?: string;
  initialAnalysisId?: string;
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
        </div>
        <div className="py-6">
          <StatStrip />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col gap-6">
      <div className="flex-1">
        <AnalysisThread
          key={activeAnalysisId}
          analysisId={activeAnalysisId}
          isDemo={isDemo}
          onRetry={retry}
        />
      </div>
      <div className="sticky bottom-0 -mx-4 bg-background/95 px-4 pb-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ChatComposer
          onSubmit={submit}
          pending={starting}
          error={startError}
          placeholder="Paste another tweet to start a new analysis…"
        />
      </div>
    </div>
  );
}
