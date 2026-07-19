import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireEvalOperator } from "./helpers";
import {
  buildEvalReviewItems,
  nextEvalReviewRevision,
  validateEvalReviewSubmission,
} from "../shared/evalReview";

const reviewChoiceValidator = v.union(
  v.literal("a"),
  v.literal("b"),
  v.literal("tie"),
  v.literal("neither"),
  v.literal("relevant"),
  v.literal("not_relevant")
);

const discoveryLabelsValidator = v.optional(
  v.object({
    actionable: v.optional(v.boolean()),
    novel: v.optional(v.boolean()),
    unsafe: v.optional(v.boolean()),
    stale: v.optional(v.boolean()),
    duplicate: v.optional(v.boolean()),
  })
);

export const queue = query({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, experimentId, limit }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const experiment = await ctx.db.get(experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }

    const runs = await ctx.db
      .query("evalRuns")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experimentId))
      .order("desc")
      .take(1);
    const run = runs[0] ?? null;
    if (!run) {
      return {
        experiment: publicExperiment(experiment),
        run: null,
        items: [],
      };
    }

    const outputs = await ctx.db
      .query("evalOutputs")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .take(500);
    const items = buildEvalReviewItems({
      kind: experiment.kind,
      seed: run.seed ?? experiment.seed,
      runId: run._id,
      outputs: outputs.map((output) => ({
        id: output._id,
        caseId: output.caseId,
        blindKey: output.blindKey,
        kind: output.kind,
        status: output.status,
        inputSnapshotJson: output.inputSnapshotJson,
        normalizedOutputJson: output.normalizedOutputJson,
        error: output.error,
      })),
      limit: limit ?? 100,
    });

    const judgments = await ctx.db
      .query("evalJudgments")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .order("desc")
      .take(500);
    return {
      experiment: publicExperiment(experiment),
      run: {
        _id: run._id,
        status: run.status,
        counts: run.counts,
        spendUsd: run.spendUsd,
        seed: run.seed ?? experiment.seed,
      },
      items: items.map((item) => {
        const matchingJudgments = judgments.filter(
          (judgment) =>
            judgment.caseId === item.caseId &&
            sameBlindOrder(judgment.blindOrder, item.blindOrder)
        );
        const reviewerJudgments = matchingJudgments.filter(
          (judgment) => judgment.reviewerUserId === operator._id
        );
        return {
          ...item,
          judgmentCount: matchingJudgments.length,
          reviewerRevisionCount: reviewerJudgments.length,
          latestReviewerChoice: reviewerJudgments[0]?.choice,
          latestReviewerSubmittedAt: reviewerJudgments[0]?.submittedAt,
        };
      }),
    };
  },
});

export const submit = mutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    runId: v.id("evalRuns"),
    assignmentId: v.string(),
    choice: reviewChoiceValidator,
    reasonCodes: v.array(v.string()),
    labels: discoveryLabelsValidator,
    editedDraft: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const operator = await requireEvalOperator(ctx, args.sessionToken);
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }
    const run = await ctx.db.get(args.runId);
    if (!run || run.experimentId !== experiment._id) {
      throw new Error("Review run not found");
    }

    const outputs = await ctx.db
      .query("evalOutputs")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .take(500);
    const items = buildEvalReviewItems({
      kind: experiment.kind,
      seed: run.seed ?? experiment.seed,
      runId: run._id,
      outputs: outputs.map((output) => ({
        id: output._id,
        caseId: output.caseId,
        blindKey: output.blindKey,
        kind: output.kind,
        status: output.status,
        inputSnapshotJson: output.inputSnapshotJson,
        normalizedOutputJson: output.normalizedOutputJson,
        error: output.error,
      })),
      limit: 500,
    });
    const item = items.find(
      (candidate) => candidate.assignmentId === args.assignmentId
    );
    if (!item) throw new Error("Review assignment is no longer available");

    const validation = validateEvalReviewSubmission({
      kind: item.kind,
      choice: args.choice,
      reasonCodes: args.reasonCodes,
      labels: args.labels,
    });
    if (!validation.ok) {
      throw new Error(validation.errors.join(" "));
    }

    const prior = await ctx.db
      .query("evalJudgments")
      .withIndex("by_run_and_case", (q) =>
        q.eq("runId", run._id).eq("caseId", item.caseId as Id<"evalCases">)
      )
      .take(100);
    const revision = nextEvalReviewRevision(
      prior.map((judgment) => ({
        reviewerUserId: judgment.reviewerUserId,
        blindOrder: judgment.blindOrder,
        revision: judgment.revision,
      })),
      operator._id,
      item.blindOrder
    );
    const now = Date.now();
    const judgmentId = await ctx.db.insert("evalJudgments", {
      userId: experiment.userId,
      experimentId: experiment._id,
      runId: run._id,
      caseId: item.caseId as Id<"evalCases">,
      reviewerUserId: operator._id,
      kind: item.kind,
      blindOrder: [...item.blindOrder],
      choice: validation.value.choice,
      reasonCodes: validation.value.reasonCodes,
      labels: validation.value.labels,
      editedDraft: args.editedDraft?.trim() || undefined,
      revision,
      submittedAt: now,
      createdAt: now,
    });
    return { judgmentId, revision };
  },
});

function publicExperiment(experiment: {
  _id: string;
  name: string;
  kind: "generation" | "discovery" | "pipeline";
  status: "draft" | "ready" | "running" | "completed" | "cancelled" | "failed";
  datasetId: string;
  promptVersion: string;
  schemaVersion: string;
  caseLimit: number;
  createdAt: number;
  updatedAt: number;
}) {
  return {
    _id: experiment._id,
    name: experiment.name,
    kind: experiment.kind,
    status: experiment.status,
    datasetId: experiment.datasetId,
    promptVersion: experiment.promptVersion,
    schemaVersion: experiment.schemaVersion,
    caseLimit: experiment.caseLimit,
    createdAt: experiment.createdAt,
    updatedAt: experiment.updatedAt,
  };
}

function sameBlindOrder(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
