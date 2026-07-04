import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "new")
      )
      .collect();
    return rows.sort((a, b) => b.score - a.score).slice(0, limit ?? 20);
  },
});

export const dismiss = mutation({
  args: { sessionToken: v.string(), opportunityId: v.id("opportunities") },
  handler: async (ctx, { sessionToken, opportunityId }) => {
    const user = await requireUser(ctx, sessionToken);
    const opp = await ctx.db.get(opportunityId);
    if (!opp || opp.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(opportunityId, { status: "dismissed" });
  },
});

export const upsertMany = internalMutation({
  args: {
    userId: v.id("users"),
    items: v.array(
      v.object({
        tweetId: v.string(),
        tweetUrl: v.string(),
        authorHandle: v.string(),
        authorName: v.string(),
        authorFollowers: v.number(),
        text: v.string(),
        score: v.number(),
        reason: v.string(),
        suggestedAngle: v.string(),
        replyCount: v.number(),
        velocity: v.number(),
        postedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, { userId, items }) => {
    const now = Date.now();
    for (const item of items) {
      const existing = await ctx.db
        .query("opportunities")
        .withIndex("by_user_tweet", (q) =>
          q.eq("userId", userId).eq("tweetId", item.tweetId)
        )
        .unique();
      if (existing) {
        // Refresh metrics but never resurrect dismissed/analyzed items.
        await ctx.db.patch(existing._id, {
          score: item.score,
          reason: item.reason,
          replyCount: item.replyCount,
          velocity: item.velocity,
          scannedAt: now,
        });
      } else {
        await ctx.db.insert("opportunities", {
          userId,
          ...item,
          scannedAt: now,
          status: "new",
        });
      }
    }
  },
});
