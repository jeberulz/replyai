import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentMonth, requireUser } from "./helpers";
import {
  opportunityToAnalyzeRate,
  type OpportunityFunnelRow,
} from "../shared/rankingWeights";

export const record = mutation({
  args: {
    sessionToken: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    analyses: v.number(),
    generations: v.number(),
  },
  handler: async (ctx, { sessionToken, tokensIn, tokensOut, analyses, generations }) => {
    const user = await requireUser(ctx, sessionToken);
    const month = currentMonth();
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("month", month)
      )
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        tokensIn: row.tokensIn + tokensIn,
        tokensOut: row.tokensOut + tokensOut,
        requests: row.requests + 1,
        analyses: row.analyses + analyses,
        generations: row.generations + generations,
      });
    } else {
      await ctx.db.insert("usage", {
        userId: user._id,
        month,
        tokensIn,
        tokensOut,
        requests: 1,
        analyses,
        generations,
      });
    }
  },
});

/**
 * Dashboard stats, including the north-star metric: the share of published
 * replies that were used with no edits.
 */
export const stats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const month = currentMonth();
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("month", month)
      )
      .unique();

    const published = await ctx.db
      .query("savedDrafts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "published")
      )
      .collect();

    let usedUnedited = 0;
    let usedFromGenerated = 0;
    const publishDurationsMs: number[] = [];
    for (const draft of published) {
      if (!draft.replyId) continue;
      usedFromGenerated++;
      const reply = await ctx.db.get(draft.replyId);
      if (reply && !reply.editedBeforeSend) usedUnedited++;
      // Supporting metric: time from drafting the option to publishing it.
      if (reply && draft.publishedAt) {
        publishDurationsMs.push(draft.publishedAt - reply.createdAt);
      }
    }

    const medianMs = median(publishDurationsMs);

    const monthPrefix = month;
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const monthOpportunities: OpportunityFunnelRow[] = opportunities
      .filter((o) =>
        new Date(o.scannedAt).toISOString().slice(0, 7) === monthPrefix
      )
      .map((o) => ({
        source: o.source,
        authorFollowers: o.authorFollowers,
        score: o.score,
        scannedAt: o.scannedAt,
        status: o.status,
        outcome: o.outcome,
      }));

    return {
      month,
      tokensIn: usage?.tokensIn ?? 0,
      tokensOut: usage?.tokensOut ?? 0,
      requests: usage?.requests ?? 0,
      analyses: usage?.analyses ?? 0,
      generations: usage?.generations ?? 0,
      published: published.length,
      // North star: % of generated replies published without edits.
      noEditRate:
        usedFromGenerated === 0
          ? null
          : Math.round((usedUnedited / usedFromGenerated) * 100),
      // Supporting metric: median seconds from draft to publish.
      medianSecondsToPublish:
        medianMs === null ? null : Math.round(medianMs / 1000),
      opportunityToAnalyzeRate: opportunityToAnalyzeRate(monthOpportunities),
      opportunitiesSurfaced: monthOpportunities.length,
    };
  },
});

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
