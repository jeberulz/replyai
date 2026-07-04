import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { tweetSnapshot } from "./schema";

export const create = mutation({
  args: {
    sessionToken: v.string(),
    tweetUrl: v.string(),
    tweetId: v.string(),
    tweet: tweetSnapshot,
    topReplies: v.array(
      v.object({
        authorHandle: v.string(),
        text: v.string(),
        likes: v.number(),
      })
    ),
    summary: v.string(),
    topic: v.string(),
    stance: v.string(),
    existingOpinions: v.array(v.string()),
    missingAngles: v.array(v.string()),
    score: v.object({
      value: v.number(),
      reason: v.string(),
      factors: v.object({
        audienceSize: v.number(),
        topicRelevance: v.number(),
        replyTiming: v.number(),
        growthVelocity: v.number(),
      }),
    }),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    // Mark any matching feed opportunity as handled.
    const opp = await ctx.db
      .query("opportunities")
      .withIndex("by_user_tweet", (q) =>
        q.eq("userId", user._id).eq("tweetId", args.tweetId)
      )
      .unique();
    if (opp && opp.status === "new") {
      await ctx.db.patch(opp._id, { status: "analyzed" });
    }
    return await ctx.db.insert("tweetAnalyses", {
      userId: user._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { sessionToken: v.string(), analysisId: v.id("tweetAnalyses") },
  handler: async (ctx, { sessionToken, analysisId }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) return null;
    return analysis;
  },
});

export const listRecent = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    return await ctx.db
      .query("tweetAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit ?? 10);
  },
});
