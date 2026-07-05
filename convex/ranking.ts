import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { computeRankingWeights } from "../shared/rankingWeights";
import type { OpportunityFunnelRow } from "../shared/rankingWeights";

function toFunnelRow(row: {
  source?: "following" | "list" | "watched" | "search";
  authorFollowers: number;
  score: number;
  scannedAt: number;
  status: "new" | "dismissed" | "analyzed";
  outcome?: "ignored" | "analyzed" | "sent" | "responded";
}): OpportunityFunnelRow {
  return {
    source: row.source,
    authorFollowers: row.authorFollowers,
    score: row.score,
    scannedAt: row.scannedAt,
    status: row.status,
    outcome: row.outcome,
  };
}

export const recomputeForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settings) return;

    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const weights = computeRankingWeights(
      rows.map(toFunnelRow),
      Date.now()
    );
    await ctx.db.patch(settings._id, {
      rankingWeights: weights ?? undefined,
    });
  },
});

/** Weekly: refresh ranking multipliers for every user with scanner settings. */
export const recomputeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scannerSettings").collect();
    for (const settings of all) {
      const rows = await ctx.db
        .query("opportunities")
        .withIndex("by_user", (q) => q.eq("userId", settings.userId))
        .collect();
      const weights = computeRankingWeights(
        rows.map(toFunnelRow),
        Date.now()
      );
      await ctx.db.patch(settings._id, {
        rankingWeights: weights ?? undefined,
      });
    }
  },
});
