import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { passesOpportunityRelevance } from "../shared/scoring";
import { requireUser } from "./helpers";

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const keywords = settings?.keywords ?? [];

    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "new")
      )
      .collect();
    return rows
      .filter((opp) =>
        passesOpportunityRelevance(opp.text, keywords, opp.source)
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit ?? 20);
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

const STALE_OPPORTUNITY_AGE_MS = 8 * 60 * 60 * 1000;

/** Drop "new" opportunities older than the reply window (8h). */
export const pruneStale = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const cutoff = Date.now() - STALE_OPPORTUNITY_AGE_MS;
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "new")
      )
      .collect();
    for (const row of rows) {
      if (row.postedAt < cutoff) {
        await ctx.db.patch(row._id, { status: "dismissed" });
      }
    }
  },
});

/** Dismiss cached opportunities that fail the current relevance filter. */
export const reconcileIrrelevant = internalMutation({
  args: {
    userId: v.id("users"),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, { userId, keywords }) => {
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "new")
      )
      .collect();
    for (const row of rows) {
      if (!passesOpportunityRelevance(row.text, keywords, row.source)) {
        await ctx.db.patch(row._id, { status: "dismissed" });
      }
    }
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
        source: v.optional(
          v.union(
            v.literal("following"),
            v.literal("list"),
            v.literal("watched"),
            v.literal("search")
          )
        ),
        sourceLabel: v.optional(v.string()),
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
        if (existing.status === "analyzed" || existing.status === "dismissed") {
          continue;
        }
        await ctx.db.patch(existing._id, {
          score: item.score,
          reason: item.reason,
          replyCount: item.replyCount,
          velocity: item.velocity,
          scannedAt: now,
          status: "new",
          source: item.source,
          sourceLabel: item.sourceLabel,
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
