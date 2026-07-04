"use client";

import { useTransition } from "react";
import { useQuery } from "convex/react";
import { Check, FlaskConical, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { runModelEvalAction, setDefaultModelAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUsd, modelInfo, modelLabel } from "../../../shared/models";
import { timeAgo } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export function ModelEval({
  analysisId,
  defaultModel,
}: {
  analysisId: string;
  defaultModel?: string;
}) {
  const sessionToken = useSessionToken();
  const [running, startRun] = useTransition();
  const [saving, startSave] = useTransition();

  const evaluation = useQuery(api.evals.latestForAnalysis, {
    sessionToken,
    analysisId: analysisId as Id<"tweetAnalyses">,
  });

  const runEval = () => {
    startRun(async () => {
      try {
        await runModelEvalAction(analysisId);
        toast.success("Model comparison complete");
      } catch {
        toast.error("Eval failed — try again");
      }
    });
  };

  const setDefault = (model: string) => {
    startSave(async () => {
      try {
        await setDefaultModelAction(model);
        toast.success(`${modelLabel(model)} is now your default model`);
      } catch {
        toast.error("Could not save default model");
      }
    });
  };

  const candidates = evaluation
    ? [...evaluation.candidates].sort((a, b) => b.score - a.score)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Model comparison</CardTitle>
            <CardDescription>
              Same tweet, same voice — every model generates 3 replies, a
              stronger model blind-scores them, and you see quality next to
              cost.
            </CardDescription>
          </div>
          <Button variant="outline" disabled={running} onClick={runEval}>
            {running ? <Loader2 className="animate-spin" /> : <FlaskConical />}
            {running
              ? "Comparing…"
              : evaluation
                ? "Run again"
                : "Compare models"}
          </Button>
        </div>
      </CardHeader>
      {evaluation && (
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const info = modelInfo(candidate.model);
              const isWinner = candidate.model === evaluation.winnerModel;
              const isDefault = candidate.model === defaultModel;
              return (
                <div
                  key={candidate.model}
                  className={`rounded-lg border p-4 ${
                    isWinner ? "border-primary/60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {modelLabel(candidate.model)}
                      </span>
                      {info && (
                        <span className="text-xs text-muted-foreground">
                          {info.tier}
                        </span>
                      )}
                      {isWinner && (
                        <Badge variant="success">
                          <Trophy className="size-3" /> Judge&apos;s pick
                        </Badge>
                      )}
                      {isDefault && (
                        <Badge variant="secondary">
                          <Check className="size-3" /> Your default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span>
                        score{" "}
                        <span className="text-foreground">
                          {candidate.score}
                        </span>
                        /100
                      </span>
                      <span className="text-muted-foreground">
                        {formatUsd(candidate.costUsd)}/run
                      </span>
                    </div>
                  </div>
                  {candidate.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {candidate.notes}
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {candidate.options.map((option, i) => (
                      <p
                        key={i}
                        className="rounded-md bg-muted px-3 py-2 text-xs leading-5"
                      >
                        <span className="mr-1.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {option.category}
                        </span>
                        {option.content}
                      </p>
                    ))}
                  </div>
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      disabled={saving}
                      onClick={() => setDefault(candidate.model)}
                    >
                      Set as default model
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            judged by {modelLabel(evaluation.judgeModel)} ·{" "}
            {timeAgo(evaluation.createdAt)} · costs are estimates from token
            usage
          </p>
        </CardContent>
      )}
    </Card>
  );
}
