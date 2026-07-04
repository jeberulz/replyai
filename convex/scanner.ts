import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";
import {
  scoreConversation,
  topicRelevanceForKeywords,
  velocityPerHour,
} from "../shared/scoring";
import { DEMO_TWEETS } from "../shared/demoData";

export const settings = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return row ?? null;
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, { sessionToken, enabled, keywords }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { enabled, keywords });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled,
        keywords,
      });
    }
  },
});

/** Run a scan for the current user right now (explicit button click). */
export const scanNow = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    await ctx.scheduler.runAfter(0, internal.scanner.scanUser, {
      userId: user._id,
    });
  },
});

export const enabledSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scannerSettings").collect();
    return all.filter((s) => s.enabled).map((s) => ({ userId: s.userId }));
  },
});

export const scanContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const settingsRow = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const tokenRow = await ctx.db
      .query("xTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      xUserId: user.xUserId,
      isDemo: user.isDemo,
      keywords: settingsRow?.keywords ?? [],
      accessToken:
        tokenRow && tokenRow.expiresAt > Date.now() ? tokenRow.accessToken : null,
    };
  },
});

export const markScanned = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (row) await ctx.db.patch(row._id, { lastScanAt: Date.now() });
  },
});

/** Cron entry point: scan every user who has the feed scanner enabled. */
export const scanAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.scanner.enabledSettings, {});
    for (const { userId } of users) {
      await ctx.runAction(internal.scanner.scanUser, { userId });
    }
  },
});

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

/**
 * Scan a single user's following feed and surface high-opportunity tweets.
 * The scanner only *suggests* — a human clicks send on every reply, always.
 */
export const scanUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const context = await ctx.runQuery(internal.scanner.scanContext, { userId });
    if (!context) return;

    let timeline: TimelineTweet[];
    if (context.isDemo || !context.accessToken) {
      timeline = demoTimeline();
    } else {
      timeline = await fetchXTimeline(context.xUserId, context.accessToken);
    }

    const now = Date.now();
    const items = timeline.map((t) => {
      const ageMinutes = (now - t.postedAt) / 60_000;
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
        topicRelevance: relevance,
        score: score.value,
        reason: score.reason,
        suggestedAngle: suggestAngle(t),
        replyCount: t.replies,
        velocity: velocityPerHour({ ...t, ageMinutes }),
        postedAt: t.postedAt,
      };
    });

    const worthSurfacing = items
      .filter((i) => i.topicRelevance > 0 && i.score >= 40)
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
    await ctx.runMutation(internal.scanner.markScanned, { userId });
  },
});

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
): Promise<TimelineTweet[]> {
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
  if (!res.ok) return [];
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
  return (json.data ?? []).map((t) => {
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
