import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { captureConvexException } from "./lib/sentry";
import { readStoredXTokens } from "./tokenSecurity";
import {
  classifyReplyOutcome,
  nextOutcomePollDelayMs,
  type PublishedTweetMetrics,
  type ReplyOutcomeCandidate,
} from "../shared/outcomes";

const RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;
const FIRST_POLL_DELAY_MS = 5 * 60 * 1000;
const X_API_BASE = "https://api.x.com/2";
const DEFAULT_BATCH_SIZE = 20;

const publishModeValidator = v.optional(
  v.union(
    v.literal("threaded"),
    v.literal("standalone"),
    v.literal("url_quote")
  )
);

export const seedPublishedDraft = internalMutation({
  args: {
    draftId: v.id("savedDrafts"),
    publishedTweetId: v.string(),
    publishMode: publishModeValidator,
  },
  handler: async (ctx, { draftId, publishedTweetId, publishMode }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return;

    const existing = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_draft", (q) => q.eq("draftId", draftId))
      .unique();

    const now = Date.now();
    const publishedAt = draft.publishedAt ?? now;
    const opportunity = draft.targetTweetId
      ? await ctx.db
          .query("opportunities")
          .withIndex("by_user_tweet", (q) =>
            q.eq("userId", draft.userId).eq("tweetId", draft.targetTweetId!)
          )
          .unique()
      : null;
    const analysis = draft.analysisId ? await ctx.db.get(draft.analysisId) : null;
    const targetAuthorHandle =
      opportunity?.authorHandle ?? analysis?.tweet.authorHandle;

    const base = {
      userId: draft.userId,
      opportunityId: opportunity?._id,
      analysisId: draft.analysisId,
      kind: draft.kind,
      publishMode: publishMode ?? draft.publishMode,
      targetTweetId: draft.targetTweetId,
      targetTweetUrl: draft.targetTweetUrl,
      targetAuthorHandle,
      publishedTweetId,
      publishedAt,
      windowEndsAt: publishedAt + RESPONSE_WINDOW_MS,
      nextPollAt: now + FIRST_POLL_DELAY_MS,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...base,
        status: existing.status === "responded" ? "responded" : "active",
        pollCount: existing.pollCount,
      });
      return;
    }

    await ctx.db.insert("replyOutcomeTrackers", {
      draftId,
      ...base,
      pollCount: 0,
      status: "active",
      createdAt: now,
    });
  },
});

type DueTracker = {
  _id: Id<"replyOutcomeTrackers">;
  userId: Id<"users">;
  publishedTweetId: string;
  targetTweetId?: string;
  targetAuthorHandle?: string;
  windowEndsAt: number;
  pollCount: number;
  isDemo: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number;
  tokenScope: string;
};

export const dueTrackers = internalQuery({
  args: { now: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, { now, limit }) => {
    const rows = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_status_and_nextPollAt", (q) =>
        q.eq("status", "active").lte("nextPollAt", now)
      )
      .take(limit ?? DEFAULT_BATCH_SIZE);

    const trackers: DueTracker[] = [];
    for (const row of rows) {
      const user = await ctx.db.get(row.userId);
      if (!user) continue;
      const tokenRow = await ctx.db
        .query("xTokens")
        .withIndex("by_user", (q) => q.eq("userId", row.userId))
        .unique();
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      try {
        const tokens = await readStoredXTokens(tokenRow);
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      } catch {
        accessToken = null;
        refreshToken = null;
      }
      trackers.push({
        _id: row._id,
        userId: row.userId,
        publishedTweetId: row.publishedTweetId,
        targetTweetId: row.targetTweetId,
        targetAuthorHandle: row.targetAuthorHandle,
        windowEndsAt: row.windowEndsAt,
        pollCount: row.pollCount,
        isDemo: user.isDemo,
        accessToken,
        refreshToken,
        tokenExpiresAt: tokenRow?.expiresAt ?? 0,
        tokenScope: tokenRow?.scope ?? "",
      });
    }
    return trackers;
  },
});

export const pollDue = internalAction({
  args: { now: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { now, limit }) => {
    const startedAt = now ?? Date.now();
    const trackers: DueTracker[] = await ctx.runQuery(
      internal.outcomes.dueTrackers,
      { now: startedAt, limit }
    );

    for (const tracker of trackers) {
      if (tracker.windowEndsAt <= startedAt) {
        await ctx.runMutation(internal.outcomes.expireTracker, {
          trackerId: tracker._id,
          now: startedAt,
        });
        continue;
      }

      try {
        if (tracker.isDemo) {
          await ctx.runMutation(internal.outcomes.markResponded, {
            trackerId: tracker._id,
            label: "conversation_continued",
            responseTweetId: `demo-response-${tracker.publishedTweetId}`,
            responseAuthorHandle: "demo_customer",
            now: startedAt,
          });
          continue;
        }

        let accessToken = tracker.accessToken;
        if (!accessToken || tracker.tokenExpiresAt <= startedAt) {
          if (!tracker.refreshToken) {
            await ctx.runMutation(internal.outcomes.recordNoResponse, {
              trackerId: tracker._id,
              now: startedAt,
              error: "X account token unavailable; will retry until the 48h window closes.",
            });
            continue;
          }
          const refreshed = await refreshAccessToken(tracker.refreshToken);
          accessToken = refreshed.accessToken;
          await ctx.runMutation(internal.xTokens.updateXTokens, {
            userId: tracker.userId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
            scope: refreshed.scope || tracker.tokenScope,
          });
        }

        const signals = await fetchOutcomeSignals({
          accessToken,
          publishedTweetId: tracker.publishedTweetId,
          searchConversationId: tracker.targetTweetId ?? tracker.publishedTweetId,
        });
        const outcome = classifyReplyOutcome({
          candidates: signals.candidates,
          targetAuthorHandle: tracker.targetAuthorHandle,
          publishedMetrics: signals.metrics,
        });

        if (outcome) {
          await ctx.runMutation(internal.outcomes.markResponded, {
            trackerId: tracker._id,
            label: outcome.label,
            responseTweetId: outcome.responseTweetId,
            responseAuthorHandle: outcome.responseAuthorHandle,
            now: startedAt,
          });
        } else {
          await ctx.runMutation(internal.outcomes.recordNoResponse, {
            trackerId: tracker._id,
            now: startedAt,
          });
        }
      } catch (error) {
        await captureConvexException(error, {
          action: "outcomePoll",
          trackerId: tracker._id,
          userId: tracker.userId,
        });
        await ctx.runMutation(internal.outcomes.recordNoResponse, {
          trackerId: tracker._id,
          now: startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  },
});

export const markResponded = internalMutation({
  args: {
    trackerId: v.id("replyOutcomeTrackers"),
    label: v.union(
      v.literal("author_replied"),
      v.literal("conversation_continued"),
      v.literal("got_ratioed")
    ),
    responseTweetId: v.optional(v.string()),
    responseAuthorHandle: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (
    ctx,
    { trackerId, label, responseTweetId, responseAuthorHandle, now }
  ) => {
    const tracker = await ctx.db.get(trackerId);
    if (!tracker || tracker.status !== "active") return;

    await ctx.db.patch(trackerId, {
      status: "responded",
      responseLabel: label,
      lastResponseTweetId: responseTweetId,
      responseAuthorHandle,
      respondedAt: now,
      lastPolledAt: now,
      updatedAt: now,
      error: undefined,
    });

    if (tracker.opportunityId) {
      await ctx.db.patch(tracker.opportunityId, {
        outcome: "responded",
        respondedAt: now,
        sentAt: tracker.publishedAt,
      });
    }
  },
});

export const recordNoResponse = internalMutation({
  args: {
    trackerId: v.id("replyOutcomeTrackers"),
    now: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { trackerId, now, error }) => {
    const tracker = await ctx.db.get(trackerId);
    if (!tracker || tracker.status !== "active") return;

    if (tracker.windowEndsAt <= now) {
      await ctx.db.patch(trackerId, {
        status: "expired",
        lastPolledAt: now,
        nextPollAt: tracker.windowEndsAt,
        updatedAt: now,
        error,
      });
      return;
    }

    const pollCount = tracker.pollCount + 1;
    const nextPollAt = Math.min(
      now + nextOutcomePollDelayMs(pollCount),
      tracker.windowEndsAt
    );
    await ctx.db.patch(trackerId, {
      pollCount,
      lastPolledAt: now,
      nextPollAt,
      updatedAt: now,
      error,
    });
  },
});

export const expireTracker = internalMutation({
  args: { trackerId: v.id("replyOutcomeTrackers"), now: v.number() },
  handler: async (ctx, { trackerId, now }) => {
    const tracker = await ctx.db.get(trackerId);
    if (!tracker || tracker.status !== "active") return;
    await ctx.db.patch(trackerId, {
      status: "expired",
      lastPolledAt: now,
      nextPollAt: tracker.windowEndsAt,
      updatedAt: now,
    });
  },
});

async function fetchOutcomeSignals(args: {
  accessToken: string;
  publishedTweetId: string;
  searchConversationId: string;
}): Promise<{
  metrics: PublishedTweetMetrics | null;
  candidates: ReplyOutcomeCandidate[];
}> {
  const [metrics, candidates] = await Promise.all([
    fetchPublishedTweetMetrics(args.publishedTweetId, args.accessToken),
    fetchRepliesToPublishedTweet(args),
  ]);
  return { metrics, candidates };
}

async function fetchPublishedTweetMetrics(
  publishedTweetId: string,
  accessToken: string
): Promise<PublishedTweetMetrics | null> {
  const url = new URL(`${X_API_BASE}/tweets/${publishedTweetId}`);
  url.searchParams.set("tweet.fields", "public_metrics");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: { public_metrics?: { like_count: number; reply_count: number } };
  };
  const metrics = json.data?.public_metrics;
  if (!metrics) return null;
  return {
    likeCount: metrics.like_count,
    replyCount: metrics.reply_count,
  };
}

async function fetchRepliesToPublishedTweet(args: {
  accessToken: string;
  publishedTweetId: string;
  searchConversationId: string;
}): Promise<ReplyOutcomeCandidate[]> {
  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set(
    "query",
    `conversation_id:${args.searchConversationId} is:reply`
  );
  url.searchParams.set(
    "tweet.fields",
    "author_id,created_at,public_metrics,referenced_tweets"
  );
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("max_results", "25");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      author_id: string;
      referenced_tweets?: Array<{ type: string; id: string }>;
      public_metrics?: { like_count: number; reply_count: number };
    }>;
    includes?: { users?: Array<{ id: string; username: string }> };
  };
  const users = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u.username] as const)
  );

  return (json.data ?? [])
    .filter((tweet) =>
      (tweet.referenced_tweets ?? []).some(
        (ref) => ref.type === "replied_to" && ref.id === args.publishedTweetId
      )
    )
    .map((tweet) => ({
      tweetId: tweet.id,
      authorHandle: users.get(tweet.author_id),
      likeCount: tweet.public_metrics?.like_count,
      replyCount: tweet.public_metrics?.reply_count,
    }));
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}> {
  const clientId = process.env.X_CLIENT_ID ?? "";
  const clientSecret = process.env.X_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("X OAuth credentials not configured");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${X_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`X token refresh failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000,
    scope: json.scope ?? "",
  };
}
