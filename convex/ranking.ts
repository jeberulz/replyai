import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { computeRankingWeights } from "../shared/rankingWeights";
import type { OpportunityFunnelRow, RankingWeights } from "../shared/rankingWeights";
import { rankingChangelogSentence } from "../shared/rankingChangelog";

/**
 * Changelog is set on every successful recompute (not only "material"
 * changes) — `rankingChangelogSentence` already falls back to a plain
 * "refreshed recently" sentence when there's no meaningful multiplier delta,
 * so every recompute with enough data produces a fresh, truthful sentence.
 */
function changelogPatch(
  weights: RankingWeights | null,
  nowMs: number
): { rankingChangelog?: string; rankingChangelogAt?: number } {
  if (!weights) {
    return { rankingChangelog: undefined, rankingChangelogAt: undefined };
  }
  return {
    rankingChangelog: rankingChangelogSentence(weights, nowMs) ?? undefined,
    rankingChangelogAt: nowMs,
  };
}

function toFunnelRow(row: {
  source?: "following" | "list" | "watched" | "search";
  authorFollowers: number;
  score: number;
  scannedAt: number;
  status: "new" | "dismissed" | "analyzed" | "archived";
  outcome?: "ignored" | "analyzed" | "sent" | "responded";
}): OpportunityFunnelRow {
  return {
    source: row.source,
    authorFollowers: row.authorFollowers,
    score: row.score,
    scannedAt: row.scannedAt,
    // Auto-archived rows behave like dismissed for the ranking funnel — the
    // window closed unattended, same as a user-dismissed row.
    status: row.status === "archived" ? "dismissed" : row.status,
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

    const now = Date.now();
    const weights = computeRankingWeights(rows.map(toFunnelRow), now);
    await ctx.db.patch(settings._id, {
      rankingWeights: weights ?? undefined,
      ...changelogPatch(weights, now),
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
      const now = Date.now();
      const weights = computeRankingWeights(rows.map(toFunnelRow), now);
      await ctx.db.patch(settings._id, {
        rankingWeights: weights ?? undefined,
        ...changelogPatch(weights, now),
      });
    }
  },
});
