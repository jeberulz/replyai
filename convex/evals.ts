import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

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
