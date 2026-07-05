import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { NicheContext } from "../shared/semanticRelevance";

export const nicheContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<NicheContext> => {
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const profiles = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const defaultProfile =
      profiles.find((p) => p.isDefault) ?? profiles[0] ?? null;

    const voiceTopics: string[] = [];
    if (defaultProfile) {
      voiceTopics.push(defaultProfile.name);
      voiceTopics.push(...defaultProfile.style.commonPhrases.slice(0, 8));
      for (const example of defaultProfile.examples.slice(0, 3)) {
        voiceTopics.push(example.slice(0, 80));
      }
    }

    const analyses = await ctx.db
      .query("tweetAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const recentTopics = analyses
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((a) => a.topic.trim())
      .filter((t) => t.length > 0);

    const keywords = [
      ...new Set([
        ...(settings?.keywords ?? []),
        ...(settings?.searchKeywords ?? []),
      ]),
    ];

    return { keywords, voiceTopics, recentTopics };
  },
});

export const semanticCacheByTweetIds = internalQuery({
  args: {
    userId: v.id("users"),
    tweetIds: v.array(v.string()),
  },
  handler: async (ctx, { userId, tweetIds }) => {
    const cache: Record<
      string,
      {
        semanticRelevance: number;
        textFingerprint: string;
        semanticClassifiedAt: number;
      }
    > = {};

    for (const tweetId of tweetIds) {
      const row = await ctx.db
        .query("opportunities")
        .withIndex("by_user_tweet", (q) =>
          q.eq("userId", userId).eq("tweetId", tweetId)
        )
        .unique();
      if (
        row?.semanticClassifiedAt !== undefined &&
        row.textFingerprint &&
        row.semanticRelevance !== undefined
      ) {
        cache[tweetId] = {
          semanticRelevance: row.semanticRelevance,
          textFingerprint: row.textFingerprint,
          semanticClassifiedAt: row.semanticClassifiedAt,
        };
      }
    }

    return cache;
  },
});
