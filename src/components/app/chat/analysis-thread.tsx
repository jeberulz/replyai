"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/components/app/convex-provider";
import { ModelEval } from "@/components/app/model-eval";
import { OptionsPanel } from "@/components/app/options-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  apiPublishLimitationNotice,
  replySettingsWarning,
} from "../../../../shared/xErrors";
import { buildTweetPermalink } from "../../../../shared/xPublish";
import { BreakdownBlock } from "./blocks/breakdown-block";
import { ScoreBlock } from "./blocks/score-block";
import { TweetBlock } from "./blocks/tweet-block";

// A pipeline stage with no doc write for this long is considered abandoned
// (the tab that was driving it closed) and gets a Resume affordance. The
// analyze stage alone can take over a minute on thinking-enabled models, so
// keep this comfortably above that.
const STALE_AFTER_MS = 120_000;

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "done" | "running" | "pending";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        state === "pending" && "opacity-40"
      )}
    >
      {state === "running" ? (
        <Loader2 className="size-3 animate-spin text-primary" />
      ) : (
        <Check
          className={cn(
            "size-3",
            state === "done" ? "text-primary" : "opacity-0"
          )}
        />
      )}
      {label}
    </span>
  );
}

export function AnalysisThread({
  analysisId,
  isDemo,
  onRetry,
}: {
  analysisId: string;
  isDemo: boolean;
  onRetry: (analysisId: string) => void;
}) {
  const sessionToken = useSessionToken();
  const analysis = useQuery(
    api.analyses.get,
    sessionToken
      ? { sessionToken, analysisId: analysisId as Id<"tweetAnalyses"> }
      : "skip"
  );
  const options = useQuery(
    api.replies.listByAnalysis,
    sessionToken
      ? { sessionToken, analysisId: analysisId as Id<"tweetAnalyses"> }
      : "skip"
  );
  const voiceProfiles = useQuery(
    api.voiceProfiles.list,
    sessionToken ? { sessionToken } : "skip"
  );
  const me = useQuery(api.users.me, sessionToken ? { sessionToken } : "skip");

  // Clock tick so an in-progress analysis can go "stale" without new data.
  const [now, setNow] = useState(() => Date.now());
  const status = analysis?.status ?? (analysis ? "complete" : undefined);
  const inProgress = status === "analyzing" || status === "generating";
  useEffect(() => {
    if (!inProgress) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [inProgress]);

  if (analysis === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (analysis === null) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        This analysis doesn&apos;t exist or belongs to another account.
      </p>
    );
  }

  const { tweet, score } = analysis;
  const hasBreakdown = analysis.summary !== "";
  const hasOptions = (options?.length ?? 0) > 0;
  const isStale =
    inProgress && now - (analysis.updatedAt ?? analysis.createdAt) > STALE_AFTER_MS;

  const hasNumericTweetId = /^\d+$/.test(analysis.tweetId);
  const targetTweetId = hasNumericTweetId ? analysis.tweetId : "";
  const targetTweetUrl =
    analysis.tweetUrl ||
    (hasNumericTweetId
      ? buildTweetPermalink(tweet.authorHandle, analysis.tweetId)
      : "");
  const restrictionWarning = replySettingsWarning(analysis.replySettings);
  const apiNotice = targetTweetUrl ? apiPublishLimitationNotice() : null;

  return (
    <div className="space-y-6">
      {/* User turn: what was pasted */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-3 sm:max-w-[70%]">
          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed">
            {tweet.text}
          </p>
          {analysis.tweetUrl && (
            <a
              href={analysis.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block truncate font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {analysis.tweetUrl}
            </a>
          )}
        </div>
      </div>

      {/* Assistant turn: staged analysis blocks */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <ProgressStep label="Captured" state="done" />
          <ProgressStep
            label="Conversation read"
            state={
              hasBreakdown
                ? "done"
                : status === "analyzing"
                  ? "running"
                  : "pending"
            }
          />
          <ProgressStep
            label="Options drafted"
            state={
              status === "complete"
                ? "done"
                : status === "generating" || hasOptions
                  ? "running"
                  : "pending"
            }
          />
        </div>

        <TweetBlock tweet={tweet} tweetUrl={analysis.tweetUrl || undefined} />
        <ScoreBlock score={score} />
        <BreakdownBlock
          breakdown={analysis}
          pending={!hasBreakdown && status !== "failed"}
        />

        {status === "failed" && (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-destructive">
                {analysis.error ?? "Analysis failed partway through."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(analysisId)}
              >
                <RotateCcw /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isStale && (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                This analysis stalled — the tab running it probably closed.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(analysisId)}
              >
                <RotateCcw /> Resume
              </Button>
            </CardContent>
          </Card>
        )}

        {hasOptions ? (
          <div>
            {apiNotice && (
              <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {apiNotice}
              </div>
            )}
            {restrictionWarning && (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                {restrictionWarning}
              </div>
            )}
            <OptionsPanel
              analysisId={String(analysis._id)}
              targetTweetId={targetTweetId}
              targetTweetUrl={targetTweetUrl}
              voiceProfiles={(voiceProfiles ?? []).map((p) => ({
                _id: String(p._id),
                name: p.name,
                isDefault: p.isDefault,
              }))}
              initialOptions={(options ?? []).map((o) => ({
                _id: String(o._id),
                kind: o.kind,
                category: o.category,
                content: o.content,
                reason: o.reason,
                editedBeforeSend: o.editedBeforeSend,
              }))}
              isDemo={isDemo}
              defaultModel={me?.defaultModel}
            />
            {status === "generating" && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Still drafting the remaining options…
              </p>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Nothing is posted without your explicit click on that specific
              reply.
            </p>
            {status === "complete" && (
              <div className="mt-6">
                <ModelEval
                  analysisId={String(analysis._id)}
                  defaultModel={me?.defaultModel}
                />
              </div>
            )}
          </div>
        ) : (
          status !== "failed" && (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <p className="text-xs text-muted-foreground">
                Drafting 3 replies and 3 quote tweets in your voice…
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
