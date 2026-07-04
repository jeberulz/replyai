"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import {
  passesFeedScannerFilter,
  scoreConversation,
  topicRelevanceForKeywords,
  velocityPerHour,
} from "../shared/scoring";
import { DEMO_TWEETS } from "../shared/demoData";
import { refreshAccessToken } from "../shared/xOAuth";

const MIN_OPPORTUNITY_SCORE = 30;

type TimelineTweet = {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  authorFollowers: number;
  text: string;
  postedAt: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
};

type ScanContext = {
  xUserId: string;
  isDemo: boolean;
  keywords: string[];
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
  scope: string;
};

/** Cron entry point: scan every user who has the feed scanner enabled. */
export const scanAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.scanner.enabledSettings, {});
    for (const { userId } of users) {
      await ctx.runAction(internal.scannerActions.scanUser, { userId });
    }
  },
});

/**
 * Scan a single user's following feed and surface high-opportunity tweets.
 * The scanner only *suggests* — a human clicks send on every reply, always.
 */
export const scanUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const context = await ctx.runQuery(internal.scanner.scanContext, { userId });
    if (!context) return;

    try {
      if (context.keywords.length === 0) {
        await ctx.runMutation(internal.scanner.recordScanResult, {
          userId,
          resultCount: 0,
          error: "Add at least one topic keyword to scan your feed.",
        });
        return;
      }

      await ctx.runMutation(internal.opportunities.reconcileIrrelevant, {
        userId,
        keywords: context.keywords,
      });

      let timeline: TimelineTweet[];
      if (context.isDemo) {
        timeline = demoTimeline();
      } else {
        const fetched = await fetchTimelineForUser(ctx, userId, context);
        if (fetched.error) {
          await ctx.runMutation(internal.scanner.recordScanResult, {
            userId,
            resultCount: 0,
            error: fetched.error,
          });
          return;
        }
        timeline = fetched.tweets;
      }

      const now = Date.now();
      const items = timeline.map((t) => {
        const ageMinutes = Math.max(1, (now - t.postedAt) / 60_000);
        const relevance = topicRelevanceForKeywords(t.text, context.keywords);
        const score = scoreConversation({
          followers: t.authorFollowers,
          likes: t.likes,
          retweets: t.retweets,
          replies: t.replies,
          quotes: t.quotes,
          ageMinutes,
          topicRelevance: relevance,
        });
        return {
          tweetId: t.tweetId,
          tweetUrl: `https://x.com/${t.authorHandle}/status/${t.tweetId}`,
          authorHandle: t.authorHandle,
          authorName: t.authorName,
          authorFollowers: t.authorFollowers,
          text: t.text,
          score: score.value,
          reason: score.reason,
          suggestedAngle: suggestAngle(t),
          replyCount: t.replies,
          velocity: velocityPerHour({ ...t, ageMinutes }),
          postedAt: t.postedAt,
        };
      });

      const worthSurfacing = items
        .filter(
          (i) =>
            passesFeedScannerFilter(i.text, context.keywords) &&
            i.score >= MIN_OPPORTUNITY_SCORE
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      await ctx.runMutation(internal.opportunities.upsertMany, {
        userId,
        items: worthSurfacing,
      });
      await ctx.runMutation(internal.opportunities.pruneStale, {
        userId,
        activeTweetIds: worthSurfacing.map((i) => i.tweetId),
      });

      await ctx.runMutation(internal.scanner.recordScanResult, {
        userId,
        resultCount: worthSurfacing.length,
      });
    } catch (error) {
      console.error("scanUser failed", { userId, error });
      await ctx.runMutation(internal.scanner.recordScanResult, {
        userId,
        resultCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Feed scan failed unexpectedly.",
      });
    }
  },
});

async function fetchTimelineForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  context: ScanContext
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  let accessToken = context.accessToken;

  if (!accessToken || context.expiresAt <= Date.now()) {
    if (!context.refreshToken) {
      return {
        tweets: [],
        error: "X session expired. Reconnect your account in Settings.",
      };
    }
    try {
      const refreshed = await refreshAccessToken(context.refreshToken);
      accessToken = refreshed.accessToken;
      await ctx.runMutation(internal.xTokens.updateXTokens, {
        userId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: refreshed.scope || context.scope,
      });
    } catch (error) {
      return {
        tweets: [],
        error: "X session expired. Reconnect your account in Settings.",
      };
    }
  }

  const result = await fetchXTimeline(context.xUserId, accessToken);
  if (result.error) {
    return { tweets: [], error: result.error };
  }
  return { tweets: result.tweets };
}

function demoTimeline(): TimelineTweet[] {
  const now = Date.now();
  return DEMO_TWEETS.map((t) => ({
    tweetId: t.id,
    authorHandle: t.authorHandle,
    authorName: t.authorName,
    authorFollowers: t.authorFollowers,
    text: t.text,
    postedAt: now - t.minutesAgo * 60_000,
    likes: t.likes,
    retweets: t.retweets,
    replies: t.replies,
    quotes: t.quotes,
  }));
}

async function fetchXTimeline(
  xUserId: string,
  accessToken: string
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  const url = new URL(
    `https://api.x.com/2/users/${xUserId}/timelines/reverse_chronological`
  );
  url.searchParams.set("max_results", "50");
  url.searchParams.set("tweet.fields", "public_metrics,created_at,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "public_metrics,username,name");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("X timeline fetch failed", { status: res.status, body });
    if (res.status === 401 || res.status === 403) {
      return {
        tweets: [],
        error: "X denied feed access. Reconnect your account in Settings.",
      };
    }
    return {
      tweets: [],
      error: `Could not read your X feed (${res.status}). Try again shortly.`,
    };
  }

  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      text: string;
      author_id: string;
      created_at: string;
      public_metrics: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        quote_count: number;
      };
    }>;
    includes?: {
      users?: Array<{
        id: string;
        name: string;
        username: string;
        public_metrics?: { followers_count: number };
      }>;
    };
  };

  const authors = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u] as const)
  );
  const tweets = (json.data ?? []).map((t) => {
    const author = authors.get(t.author_id);
    return {
      tweetId: t.id,
      authorHandle: author?.username ?? "unknown",
      authorName: author?.name ?? "Unknown",
      authorFollowers: author?.public_metrics?.followers_count ?? 0,
      text: t.text,
      postedAt: Date.parse(t.created_at),
      likes: t.public_metrics.like_count,
      retweets: t.public_metrics.retweet_count,
      replies: t.public_metrics.reply_count,
      quotes: t.public_metrics.quote_count,
    };
  });

  return { tweets };
}

function suggestAngle(t: TimelineTweet): string {
  const text = t.text.toLowerCase();
  if (text.includes("unpopular opinion") || text.includes("hot take")) {
    return "Take a measured contrarian stance — agree with the core but name the exception they're missing.";
  }
  if (text.includes("?")) {
    return "Answer the question directly with a specific example from your own work.";
  }
  if (/\d/.test(text)) {
    return "Add your own data point — numbers replying to numbers performs well.";
  }
  if (t.replies > 200) {
    return "The obvious takes are taken; reply with the second-order consequence nobody has raised.";
  }
  return "Share a short, concrete story from experience that confirms or complicates the claim.";
}
