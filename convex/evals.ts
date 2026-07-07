import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { runGuardrailChecks } from "../shared/evals";

const candidateValidator = v.object({
  model: v.string(),
  options: v.array(
    v.object({
      category: v.string(),
      content: v.string(),
      reason: v.string(),
    })
  ),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costUsd: v.number(),
  score: v.number(),
  notes: v.string(),
});

export const save = mutation({
  args: {
    sessionToken: v.string(),
    analysisId: v.id("tweetAnalyses"),
    judgeModel: v.string(),
    candidates: v.array(candidateValidator),
    winnerModel: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(args.analysisId);
    if (!analysis || analysis.userId !== user._id) throw new Error("Not found");
    return await ctx.db.insert("modelEvals", {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal eval-agent surface: run the deterministic generation guardrails
 * against a supplied option set and return a structured report. Internal-only
 * (no session/`requireUser`) and key-free — it is a pure regression check the
 * CI gate and any future scheduled shadow-sampling can call. Publishes nothing
 * and touches no user data. The LLM-judged pass stays out of this V8 function
 * (it would require the Node runtime, which cannot host the queries/mutations
 * in this same file); it lives behind a key check in the test layer instead.
 */
export const runGuardrails = internalAction({
  args: {
    kind: v.union(v.literal("reply"), v.literal("quote")),
    options: v.array(
      v.object({
        category: v.string(),
        content: v.string(),
        reason: v.string(),
      })
    ),
    expectedCount: v.optional(v.number()),
  },
  handler: (_ctx, args) =>
    runGuardrailChecks(args.options, {
      kind: args.kind,
      expectedCount: args.expectedCount,
    }),
});

/** Most recent eval for an analysis (drives the comparison panel). */
export const latestForAnalysis = query({
  args: { sessionToken: v.string(), analysisId: v.id("tweetAnalyses") },
  handler: async (ctx, { sessionToken, analysisId }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) return null;
    const evals = await ctx.db
      .query("modelEvals")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
      .order("desc")
      .take(1);
    return evals[0] ?? null;
  },
});
