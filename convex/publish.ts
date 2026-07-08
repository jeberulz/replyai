"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { trackConvexEvent } from "./lib/analytics";
import { captureConvexException } from "./lib/sentry";
import { parseXPublishError } from "../shared/xErrors";
import { refreshAccessToken } from "../shared/xOAuth";
import { composeQuotePostText } from "../shared/xPublish";
import { MAX_WEIGHTED_LENGTH, weightedLength } from "../shared/evals";

const X_API_BASE = "https://api.x.com/2";
const USE_NATIVE_QUOTES = process.env.X_PUBLISH_NATIVE_QUOTES === "true";
const MAX_PUBLISH_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 60_000;
const RETRY_JITTER_MS = 30_000;

type PostResult =
  | { ok: true; tweetId: string }
  | { ok: false; status: number; body: string };

async function postTweet(
  accessToken: string,
  body: Record<string, unknown>
): Promise<PostResult> {
  const res = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  const json = (await res.json()) as { data?: { id?: string } };
  return { ok: true, tweetId: json.data?.id ?? "unknown" };
}

export function isRetryablePublishStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function publishRetryDelayMs(
  attempt: number,
  jitterSource: () => number = Math.random
): number {
  const base = RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt);
  const jitter = Math.floor(jitterSource() * RETRY_JITTER_MS);
  return base + jitter;
}

function ensureWeightedPublishLength(text: string): void {
  const length = weightedLength(text);
  if (length > MAX_WEIGHTED_LENGTH) {
    throw new Error(
      `Post is over X's ${MAX_WEIGHTED_LENGTH}-character limit after URL/emoji weighting (${length}). Shorten it and try again.`
    );
  }
}

function trimToWeightedLength(text: string, maxLength: number): string {
  let output = "";
  for (const char of text) {
    const next = output + char;
    if (weightedLength(next) > maxLength) break;
    output = next;
  }
  return output.trimEnd();
}

export function composeWeightedQuotePostText(
  text: string,
  permalink: string
): string {
  const composed = composeQuotePostText(text, permalink);
  if (weightedLength(composed) <= MAX_WEIGHTED_LENGTH) return composed;

  const trimmed = text.trim();
  const separator = trimmed.length > 0 ? "\n" : "";
  const budget =
    MAX_WEIGHTED_LENGTH - weightedLength(separator) - weightedLength(permalink);
  const shortened =
    budget > 0 ? trimToWeightedLength(trimmed, budget) : "";
  const recomposed = `${shortened}${shortened ? separator : ""}${permalink}`;
  ensureWeightedPublishLength(recomposed);
  return recomposed;
}

/**
 * Publish a scheduled/immediate draft to X. Runs only after an explicit
 * user click on this specific draft — never triggered automatically.
 */
export const run = internalAction({
  args: {
    draftId: v.id("savedDrafts"),
    // Whether this run was queued for a future time the user picked (vs an
    // immediate send/retry) — passed by the caller (drafts.ts) rather than
    // inferred here. savedDrafts.scheduledFor is always populated (even for
    // an immediate publish), so it alone can't distinguish "scheduled" from
    // "now"; retryAsStandalone in particular reuses an old draft whose
    // createdAt is far in the past, which would misclassify a retry as
    // "scheduled" under a time-since-creation heuristic.
    // Optional only for in-flight scheduled jobs enqueued under the old
    // {draftId}-only signature — Convex serializes scheduler args at enqueue
    // time, and a required arg would fail validation and silently drop those
    // publishes. Current callers always pass an explicit true/false.
    scheduled: v.optional(v.boolean()),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, { draftId, scheduled, attempt }) => {
    const wasScheduled = scheduled ?? false;
    const retryAttempt = attempt ?? 0;
    const bundle = await ctx.runQuery(internal.drafts.getForPublish, { draftId });
    if (!bundle) return;
    const {
      draft,
      isDemo,
      userId,
      refreshToken,
      expiresAt,
      scope,
      editBucket,
      editDistanceNormalized,
    } = bundle;
    if (draft.status === "published") return;

    const resolvedMode = draft.publishMode ?? (draft.kind === "quote" ? "url_quote" : "threaded");

    if (isDemo) {
      await ctx.runMutation(internal.drafts.markResult, {
        draftId,
        publishedTweetId: `demo-${Date.now()}`,
      });
      await trackConvexEvent("published", userId, {
        draftId,
        kind: draft.kind,
        publishMode: resolvedMode,
        scheduled: wasScheduled,
        editBucket,
        editDistanceNormalized,
      });
      return;
    }

    let accessToken = bundle.accessToken;

    if (!accessToken) {
      if (refreshToken) {
        try {
          const refreshed = await refreshAccessToken(refreshToken);
          accessToken = refreshed.accessToken;
          await ctx.runMutation(internal.xTokens.updateXTokens, {
            userId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            expiresAt: refreshed.expiresAt,
            scope: refreshed.scope || scope,
          });
        } catch {
          await ctx.runMutation(internal.drafts.markResult, {
            draftId,
            error: "X account not connected or token expired. Reconnect in Settings.",
          });
          return;
        }
      } else {
        await ctx.runMutation(internal.drafts.markResult, {
          draftId,
          error: "X account not connected or token expired. Reconnect in Settings.",
        });
        return;
      }
    } else if (expiresAt <= Date.now() && refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        await ctx.runMutation(internal.xTokens.updateXTokens, {
          userId,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: refreshed.expiresAt,
          scope: refreshed.scope || scope,
        });
      } catch {
        await ctx.runMutation(internal.drafts.markResult, {
          draftId,
          error: "X session expired. Reconnect your account in Settings.",
        });
        return;
      }
    }

    const publishMode = resolvedMode;

    try {
      let result: PostResult;
      let successMode = publishMode;

      if (publishMode === "standalone") {
        ensureWeightedPublishLength(draft.text);
        result = await postTweet(accessToken, { text: draft.text });
      } else if (draft.kind === "quote") {
        const permalink = draft.targetTweetUrl;
        if (!permalink) {
          ensureWeightedPublishLength(draft.text);
          result = await postTweet(accessToken, { text: draft.text });
          successMode = "standalone";
        } else if (USE_NATIVE_QUOTES && draft.targetTweetId) {
          ensureWeightedPublishLength(draft.text);
          result = await postTweet(accessToken, {
            text: draft.text,
            quote_tweet_id: draft.targetTweetId,
          });
          if (!result.ok && result.status === 403) {
            result = await postTweet(accessToken, {
              text: composeWeightedQuotePostText(draft.text, permalink),
            });
            successMode = "url_quote";
          }
        } else {
          result = await postTweet(accessToken, {
            text: composeWeightedQuotePostText(draft.text, permalink),
          });
          successMode = "url_quote";
        }
      } else if (draft.kind === "reply" && draft.targetTweetId) {
        ensureWeightedPublishLength(draft.text);
        result = await postTweet(accessToken, {
          text: draft.text,
          reply: { in_reply_to_tweet_id: draft.targetTweetId },
        });
      } else {
        ensureWeightedPublishLength(draft.text);
        result = await postTweet(accessToken, { text: draft.text });
        successMode = "standalone";
      }

      if (!result.ok) {
        const parsed = parseXPublishError(result.status, result.body);
        if (
          isRetryablePublishStatus(result.status) &&
          retryAttempt < MAX_PUBLISH_RETRIES
        ) {
          await ctx.scheduler.runAfter(
            publishRetryDelayMs(retryAttempt),
            internal.publish.run,
            {
              draftId,
              scheduled: wasScheduled,
              attempt: retryAttempt + 1,
            }
          );
          return;
        }
        throw new Error(parsed.message);
      }

      await ctx.runMutation(internal.drafts.markResult, {
        draftId,
        publishedTweetId: result.tweetId,
        publishMode: successMode,
      });
      await trackConvexEvent("published", userId, {
        draftId,
        kind: draft.kind,
        publishMode: successMode,
        scheduled: wasScheduled,
        editBucket,
        editDistanceNormalized,
      });
    } catch (error) {
      await captureConvexException(error, { action: "publishRun", userId, draftId });
      await ctx.runMutation(internal.drafts.markResult, {
        draftId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
