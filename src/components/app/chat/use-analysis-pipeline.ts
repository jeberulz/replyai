"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  continueAnalysisAction,
  startAnalysisAction,
} from "@/app/actions";

export type AnalyzeInput = {
  text?: string;
  url?: string;
  authorHandle?: string;
  authorFollowers?: number;
  projectId?: string;
};

/**
 * Client orchestration for the two-stage analyze pipeline. start() captures
 * the tweet (fast) and returns an analysisId to subscribe to, then fires the
 * AI stages without awaiting them — the thread renders their results live
 * from Convex. The doc's status field is the source of truth for progress;
 * the un-awaited continue call only toasts as a fallback signal.
 */
export function useAnalysisPipeline(initialAnalysisId?: string) {
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(
    initialAnalysisId ?? null
  );
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const runStages = useCallback((analysisId: string) => {
    void continueAnalysisAction(analysisId).then((result) => {
      if ("error" in result) toast.error(result.error);
    });
  }, []);

  const start = useCallback(
    async (input: AnalyzeInput) => {
      setStarting(true);
      setStartError(null);
      const result = await startAnalysisAction(input);
      setStarting(false);
      if ("error" in result) {
        setStartError(result.error);
        return false;
      }
      // Dispatch the AI stages BEFORE touching history: pushState can turn
      // into a real navigation (dev compiles the route on demand), and once
      // the request is on the wire the server finishes and writes to Convex
      // even if this page instance dies.
      runStages(result.analysisId);
      setActiveAnalysisId(result.analysisId);
      // Shallow-route so refresh/back/share land on the real analysis route.
      window.history.pushState(null, "", `/analysis/${result.analysisId}`);
      return true;
    },
    [runStages]
  );

  // Retry after a failure and Resume after an abandoned tab both re-run the
  // same resumable continue action — only missing stages execute.
  const retry = useCallback(
    (analysisId: string) => runStages(analysisId),
    [runStages]
  );

  return { activeAnalysisId, starting, startError, start, retry };
}
