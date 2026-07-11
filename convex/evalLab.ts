import { v } from "convex/values";
import {
  EVAL_CANDIDATE_CATALOG,
  freezeEvalCandidateSnapshot,
  validateEvalCandidateIds,
} from "../shared/evalLab";
import { mutation, query } from "./_generated/server";
import { requireEvalOperator } from "./helpers";

const evalKindValidator = v.union(
  v.literal("generation"),
  v.literal("discovery"),
  v.literal("pipeline")
);

const evalDatasetSourcePolicyValidator = v.union(
  v.literal("synthetic"),
  v.literal("product_team"),
  v.literal("consented_user")
);

const evalExperimentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("failed")
);

export const catalog = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    await requireEvalOperator(ctx, sessionToken);
    return EVAL_CANDIDATE_CATALOG.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      label: entry.label,
      description: entry.description,
      stages: freezeEvalCandidateSnapshot(entry).stages,
    }));
  },
});

export const createDataset = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    kind: evalKindValidator,
    version: v.string(),
    sourcePolicy: evalDatasetSourcePolicyValidator,
    caseCount: v.number(),
    datasetHash: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const now = Date.now();
    return await ctx.db.insert("evalDatasets", {
      userId: operator._id,
      creatorUserId: operator._id,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createExperiment = mutation({
  args: {
    sessionToken: v.string(),
    datasetId: v.id("evalDatasets"),
    name: v.string(),
    kind: evalKindValidator,
    status: v.optional(evalExperimentStatusValidator),
    candidateCatalogIds: v.array(v.string()),
    promptVersion: v.string(),
    schemaVersion: v.string(),
    seed: v.string(),
    budgetUsd: v.number(),
    concurrency: v.number(),
    caseLimit: v.number(),
  },
  handler: async (ctx, { sessionToken, status, ...args }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset || dataset.userId !== operator._id) throw new Error("Not found");
    if (dataset.kind !== args.kind) {
      throw new Error("Experiment kind must match dataset kind");
    }

    const candidates = validateEvalCandidateIds({
      kind: args.kind,
      candidateCatalogIds: args.candidateCatalogIds,
    });
    const now = Date.now();

    return await ctx.db.insert("evalExperiments", {
      userId: operator._id,
      creatorUserId: operator._id,
      datasetId: args.datasetId,
      name: args.name,
      kind: args.kind,
      status: status ?? "draft",
      candidateCatalogIds: args.candidateCatalogIds,
      candidateSnapshots: candidates.map(freezeEvalCandidateSnapshot),
      promptVersion: args.promptVersion,
      schemaVersion: args.schemaVersion,
      seed: args.seed,
      budgetUsd: args.budgetUsd,
      concurrency: args.concurrency,
      caseLimit: args.caseLimit,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listExperiments = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    return await ctx.db
      .query("evalExperiments")
      .withIndex("by_user", (q) => q.eq("userId", operator._id))
      .order("desc")
      .take(50);
  },
});
