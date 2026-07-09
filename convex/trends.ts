/**
 * WP37 — niche trend radar.
 * On-demand clustering of recent opportunities. Optional trendRuns cache.
 * No viral predictions / fake engagement scores.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import {
  TREND_DEFAULTS,
  clusterTrends,
  demoTrendTopics,
  type TrendOpportunityInput,
  type TrendTopic,
} from "../shared/trends";
import { requireUser } from "./helpers";

/** Bound how many opportunity rows we scan per radar request. */
const MAX_CORPUS = 200;

const topicValidator = v.object({
  slug: v.string(),
  label: v.string(),
  conversationCount: v.number(),
  opportunityIds: v.array(v.string()),
  matchedKeywords: v.array(v.string()),
});

const radarReturnValidator = v.object({
  topics: v.array(topicValidator),
  windowMs: v.number(),
  corpusSize: v.number(),
  demo: v.boolean(),
  /** Client-passed clock when this snapshot was computed. */
  computedAt: v.number(),
});

async function nicheKeywordsForUser(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<string[]> {
  const settings = await ctx.db
    .query("scannerSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const keywords = settings?.keywords ?? [];
  const search = settings?.searchKeywords ?? [];
  return [...keywords, ...search];
}

/**
 * Recent scan corpus for clustering. Excludes dismissed. Bounded + windowed.
 */
async function recentCorpus(
  ctx: QueryCtx,
  userId: Id<"users">,
  nowMs: number,
  windowMs: number
): Promise<TrendOpportunityInput[]> {
  const rows = await ctx.db
    .query("opportunities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const cutoff = nowMs - windowMs;
  return rows
    .filter(
      (o) =>
        o.status !== "dismissed" &&
        o.scannedAt >= cutoff &&
        o.scannedAt <= nowMs
    )
    .sort((a, b) => b.scannedAt - a.scannedAt)
    .slice(0, MAX_CORPUS)
    .map((o) => ({
      id: o._id,
      text: o.text,
      scannedAt: o.scannedAt,
      suggestedAngle: o.suggestedAngle,
    }));
}

/**
 * On-demand trend radar for the session user.
 * Demo accounts get deterministic fixture topics.
 * Pass `nowMs` from the client — queries must not call Date.now().
 */
export const radar = query({
  args: {
    sessionToken: v.string(),
    nowMs: v.number(),
    limit: v.optional(v.number()),
  },
  returns: radarReturnValidator,
  handler: async (ctx, { sessionToken, nowMs, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const maxTopics = Math.min(
      TREND_DEFAULTS.maxTopics,
      Math.max(1, limit ?? TREND_DEFAULTS.maxTopics)
    );

    if (user.isDemo) {
      const demo = demoTrendTopics(nowMs);
      return {
        topics: demo.topics.slice(0, maxTopics),
        windowMs: demo.windowMs,
        corpusSize: demo.corpusSize,
        demo: true,
        computedAt: nowMs,
      };
    }

    const windowMs = TREND_DEFAULTS.windowMs;
    const [keywords, opportunities] = await Promise.all([
      nicheKeywordsForUser(ctx, user._id),
      recentCorpus(ctx, user._id, nowMs, windowMs),
    ]);

    const clustered = clusterTrends({
      opportunities,
      nicheKeywords: keywords,
      nowMs,
      windowMs,
      maxTopics,
    });

    return {
      topics: clustered.topics,
      windowMs: clustered.windowMs,
      corpusSize: clustered.corpusSize,
      demo: false,
      computedAt: nowMs,
    };
  },
});

/**
 * Optional cache write — not required for MVP page-load path.
 * Kept for a future cron / briefing hook.
 */
export const recordRun = internalMutation({
  args: {
    userId: v.id("users"),
    windowMs: v.number(),
    corpusSize: v.number(),
    topics: v.array(topicValidator),
    demo: v.boolean(),
    createdAt: v.number(),
  },
  returns: v.id("trendRuns"),
  handler: async (ctx: MutationCtx, args) => {
    return await ctx.db.insert("trendRuns", {
      userId: args.userId,
      windowMs: args.windowMs,
      corpusSize: args.corpusSize,
      topics: args.topics as TrendTopic[],
      demo: args.demo,
      createdAt: args.createdAt,
    });
  },
});
