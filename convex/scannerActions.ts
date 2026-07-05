"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import {
  passesOpportunityRelevance,
  scoreConversation,
  topicRelevanceForKeywords,
  velocityPerHour,
} from "../shared/scoring";
import {
  DEMO_TWEETS,
  DEMO_WATCHED_HANDLES,
  demoListTweets,
} from "../shared/demoData";
import { refreshAccessToken } from "../shared/xOAuth";

const MIN_OPPORTUNITY_SCORE = 30;

/** Max watched handles fetched per scan; see selectWatchedHandlesForScan. */
const MAX_WATCHED_HANDLES_PER_SCAN = 15;
/** Cap on merged/deduped candidates before scoring, to bound per-scan cost. */
const MAX_CANDIDATES = 150;

type EnabledSource = "following" | "lists" | "watched" | "search";

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
  /** Where this tweet was discovered. Missing = legacy following-timeline tweet. */
  source?: "following" | "list" | "watched";
  /** e.g. "AI Builders list" — only set for source "list". */
  sourceLabel?: string;
};

type ScanContext = {
  xUserId: string;
  isDemo: boolean;
  keywords: string[];
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number;
  scope: string;
  engageListIds: string[];
  engageListNames: string[];
  watchedHandles: string[];
  enabledSources: EnabledSource[];
};

function resolveEnabledSources(sources: EnabledSource[]): EnabledSource[] {
  return sources.length > 0 ? sources : ["following"];
}

function scanHasConfiguredSources(context: ScanContext): boolean {
  const enabledSources = resolveEnabledSources(context.enabledSources);
  return (
    (enabledSources.includes("lists") && context.engageListIds.length > 0) ||
    (enabledSources.includes("watched") && context.watchedHandles.length > 0)
  );
}

/**
 * Watched-handle scans are capped at MAX_WATCHED_HANDLES_PER_SCAN to respect
 * X search rate limits. When more are configured, rotate the starting point
 * through a coarse 30-minute time bucket (matching the cron cadence) so every
 * handle gets periodic coverage across scans instead of only the first N ever
 * running.
 */
function selectWatchedHandlesForScan(handles: string[]): string[] {
  if (handles.length <= MAX_WATCHED_HANDLES_PER_SCAN) return handles;
  const bucket = Math.floor(Date.now() / (30 * 60_000)) % handles.length;
  const rotated = [...handles.slice(bucket), ...handles.slice(0, bucket)];
  return rotated.slice(0, MAX_WATCHED_HANDLES_PER_SCAN);
}

/**
 * Merge candidate lists giving priority to the highest-intent source when the
 * same tweet appears in more than one (watched > list > following), then cap
 * at MAX_CANDIDATES total.
 */
function dedupeCandidates(bySourcePriority: TimelineTweet[][]): TimelineTweet[] {
  const merged = new Map<string, TimelineTweet>();
  for (const tweets of bySourcePriority) {
    for (const t of tweets) {
      if (!merged.has(t.tweetId)) merged.set(t.tweetId, t);
    }
  }
  return Array.from(merged.values()).slice(0, MAX_CANDIDATES);
}

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
      if (context.keywords.length === 0 && !scanHasConfiguredSources(context)) {
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

      let candidates: TimelineTweet[];
      if (context.isDemo) {
        candidates = collectDemoCandidates(context);
      } else {
        const fetched = await collectCandidates(ctx, userId, context);
        if (fetched.error) {
          await ctx.runMutation(internal.scanner.recordScanResult, {
            userId,
            resultCount: 0,
            error: fetched.error,
          });
          return;
        }
        candidates = fetched.tweets;
      }

      const now = Date.now();
      const items = candidates.map((t) => {
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
          source: t.source,
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
          source: t.source,
          sourceLabel: t.sourceLabel,
        };
      });

      const worthSurfacing = items
        .filter(
          (i) =>
            passesOpportunityRelevance(i.text, context.keywords, i.source) &&
            i.score >= MIN_OPPORTUNITY_SCORE
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);

      await ctx.runMutation(internal.opportunities.upsertMany, {
        userId,
        items: worthSurfacing,
      });
      await ctx.runMutation(internal.opportunities.pruneStale, { userId });

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

/** Resolve a usable X access token for this user, refreshing it if expired. */
async function resolveAccessToken(
  ctx: ActionCtx,
  userId: Id<"users">,
  context: ScanContext
): Promise<{ accessToken: string | null; error?: string }> {
  let accessToken = context.accessToken;

  if (!accessToken || context.expiresAt <= Date.now()) {
    if (!context.refreshToken) {
      return {
        accessToken: null,
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
    } catch {
      return {
        accessToken: null,
        error: "X session expired. Reconnect your account in Settings.",
      };
    }
  }

  return { accessToken };
}

/**
 * Fetch following-timeline + configured X lists + watched-handle tweets,
 * tag each with its source, dedup by tweetId (watched > list > following
 * priority), and cap the merged set at MAX_CANDIDATES.
 *
 * Error propagation: a single source failing (e.g. missing list.read scope)
 * is a soft warning — we proceed with whatever sources succeeded. Only when
 * every *attempted* source fails (or the access token itself can't be
 * resolved) do we return a hard error with an empty candidate list, mirroring
 * the previous single-source "reconnect in Settings" behavior.
 */
async function collectCandidates(
  ctx: ActionCtx,
  userId: Id<"users">,
  context: ScanContext
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  const enabledSources = resolveEnabledSources(context.enabledSources);

  const resolved = await resolveAccessToken(ctx, userId, context);
  if (!resolved.accessToken) {
    return {
      tweets: [],
      error: resolved.error ?? "X session expired. Reconnect your account in Settings.",
    };
  }
  const accessToken = resolved.accessToken;

  const following: TimelineTweet[] = [];
  const lists: TimelineTweet[] = [];
  const watched: TimelineTweet[] = [];
  let firstError: string | undefined;
  let attempted = false;
  let succeeded = false;

  if (enabledSources.includes("following")) {
    attempted = true;
    const fetched = await fetchXTimeline(context.xUserId, accessToken);
    if (fetched.error) {
      firstError = firstError ?? fetched.error;
    } else {
      succeeded = true;
      following.push(...fetched.tweets.map((t) => ({ ...t, source: "following" as const })));
    }
  }

  if (enabledSources.includes("lists") && context.engageListIds.length > 0) {
    for (let i = 0; i < context.engageListIds.length; i++) {
      attempted = true;
      const listId = context.engageListIds[i];
      const listName = context.engageListNames[i];
      const fetched = await fetchListTweets(listId, accessToken);
      if (fetched.error) {
        firstError = firstError ?? fetched.error;
      } else {
        succeeded = true;
        lists.push(
          ...fetched.tweets.map((t) => ({ ...t, sourceLabel: listName }))
        );
      }
    }
  }

  if (enabledSources.includes("watched") && context.watchedHandles.length > 0) {
    const handles = selectWatchedHandlesForScan(context.watchedHandles);
    for (const handle of handles) {
      attempted = true;
      const fetched = await fetchHandleTweets(handle, accessToken);
      if (fetched.error) {
        firstError = firstError ?? fetched.error;
      } else {
        succeeded = true;
        watched.push(...fetched.tweets);
      }
    }
  }

  if (attempted && !succeeded) {
    return {
      tweets: [],
      error: firstError ?? "Could not read your feed. Reconnect your account in Settings.",
    };
  }

  return { tweets: dedupeCandidates([watched, lists, following]) };
}

/** Demo-mode mirror of collectCandidates — deterministic, no network calls. */
function collectDemoCandidates(context: {
  engageListIds: string[];
  engageListNames: string[];
  watchedHandles: string[];
  enabledSources: EnabledSource[];
}): TimelineTweet[] {
  const enabledSources = resolveEnabledSources(context.enabledSources);
  const now = Date.now();
  const toTimelineTweet = (t: (typeof DEMO_TWEETS)[number]) => ({
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
  });

  const following: TimelineTweet[] = enabledSources.includes("following")
    ? DEMO_TWEETS.map((t) => ({ ...toTimelineTweet(t), source: "following" as const }))
    : [];

  const lists: TimelineTweet[] = [];
  if (enabledSources.includes("lists")) {
    for (let i = 0; i < context.engageListIds.length; i++) {
      const listName = context.engageListNames[i];
      lists.push(
        ...demoListTweets(context.engageListIds[i]).map((t) => ({
          ...toTimelineTweet(t),
          source: "list" as const,
          sourceLabel: listName,
        }))
      );
    }
  }

  const watched: TimelineTweet[] = enabledSources.includes("watched")
    ? DEMO_TWEETS.filter((t) =>
        (context.watchedHandles.length > 0
          ? context.watchedHandles
          : DEMO_WATCHED_HANDLES
        ).includes(t.authorHandle)
      ).map((t) => ({ ...toTimelineTweet(t), source: "watched" as const }))
    : [];

  return dedupeCandidates([watched, lists, following]);
}

type XTimelineResponse = {
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

/** Shared tweet.fields/expansions/user.fields params for all X read endpoints below. */
function setSharedTweetParams(url: URL): void {
  url.searchParams.set("tweet.fields", "public_metrics,created_at,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "public_metrics,username,name");
}

function mapTweetsResponse(json: XTimelineResponse): Omit<TimelineTweet, "source" | "sourceLabel">[] {
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

async function fetchXTimeline(
  xUserId: string,
  accessToken: string
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  const url = new URL(
    `https://api.x.com/2/users/${xUserId}/timelines/reverse_chronological`
  );
  url.searchParams.set("max_results", "50");
  setSharedTweetParams(url);

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

  const json = (await res.json()) as XTimelineResponse;
  return { tweets: mapTweetsResponse(json) };
}

/** Tweets from a single X list the user has chosen to engage with. */
async function fetchListTweets(
  listId: string,
  accessToken: string
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  const url = new URL(`https://api.x.com/2/lists/${listId}/tweets`);
  url.searchParams.set("max_results", "50");
  setSharedTweetParams(url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("X list tweets fetch failed", { status: res.status, body, listId });
    if (res.status === 401 || res.status === 403) {
      return {
        tweets: [],
        error: "X denied list access. Reconnect your account in Settings to grant list permissions.",
      };
    }
    return {
      tweets: [],
      error: `Could not read list tweets (${res.status}). Try again shortly.`,
    };
  }

  const json = (await res.json()) as XTimelineResponse;
  return {
    tweets: mapTweetsResponse(json).map((t) => ({ ...t, source: "list" as const })),
  };
}

/** Recent original tweets from a single watched handle. */
async function fetchHandleTweets(
  handle: string,
  accessToken: string
): Promise<{ tweets: TimelineTweet[]; error?: string }> {
  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", `from:${handle} -is:retweet -is:reply`);
  url.searchParams.set("max_results", "10");
  setSharedTweetParams(url);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("X handle search fetch failed", { status: res.status, body, handle });
    if (res.status === 401 || res.status === 403) {
      return {
        tweets: [],
        error: "X denied search access. Reconnect your account in Settings.",
      };
    }
    return {
      tweets: [],
      error: `Could not read @${handle}'s tweets (${res.status}). Try again shortly.`,
    };
  }

  const json = (await res.json()) as XTimelineResponse;
  return {
    tweets: mapTweetsResponse(json).map((t) => ({ ...t, source: "watched" as const })),
  };
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
