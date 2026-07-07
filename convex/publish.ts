"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { trackConvexEvent } from "./lib/analytics";
import { captureConvexException } from "./lib/sentry";
import { parseXPublishError } from "../shared/xErrors";
import { refreshAccessToken } from "../shared/xOAuth";
import { composeQuotePostText } from "../shared/xPublish";

// A publish more than a minute after the draft was created is treated as a
// user-scheduled send for the `published` event's `scheduled` property.
// savedDrafts.scheduledFor is always set (drafts.publish defaults it to
// Date.now() for an immediate send), so presence alone can't distinguish
// "scheduled" from "now" — see docs/wp/wp04-progress.md.
const SCHEDULED_THRESHOLD_MS = 60_000;

const X_API_BASE = "https://api.x.com/2";
const USE_NATIVE_QUOTES = process.env.X_PUBLISH_NATIVE_QUOTES === "true";

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

/**
 * Publish a scheduled/immediate draft to X. Runs only after an explicit
 * user click on this specific draft — never triggered automatically.
 */
export const run = internalAction({
  args: { draftId: v.id("savedDrafts") },
  handler: async (ctx, { draftId }) => {
    const bundle = await ctx.runQuery(internal.drafts.getForPublish, { draftId });
    if (!bundle) return;
    const { draft, isDemo, userId, refreshToken, expiresAt, scope, editedBeforeSend } = bundle;
    if (draft.status === "published") return;

    const scheduled = Boolean(
      draft.scheduledFor && draft.scheduledFor > draft.createdAt + SCHEDULED_THRESHOLD_MS
    );
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
        scheduled,
        editedBeforeSend,
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
        result = await postTweet(accessToken, { text: draft.text });
      } else if (draft.kind === "quote") {
        const permalink = draft.targetTweetUrl;
        if (!permalink) {
          result = await postTweet(accessToken, { text: draft.text });
          successMode = "standalone";
        } else if (USE_NATIVE_QUOTES && draft.targetTweetId) {
          result = await postTweet(accessToken, {
            text: draft.text,
            quote_tweet_id: draft.targetTweetId,
          });
          if (!result.ok && result.status === 403) {
            result = await postTweet(accessToken, {
              text: composeQuotePostText(draft.text, permalink),
            });
            successMode = "url_quote";
          }
        } else {
          result = await postTweet(accessToken, {
            text: composeQuotePostText(draft.text, permalink),
          });
          successMode = "url_quote";
        }
      } else if (draft.kind === "reply" && draft.targetTweetId) {
        result = await postTweet(accessToken, {
          text: draft.text,
          reply: { in_reply_to_tweet_id: draft.targetTweetId },
        });
      } else {
        result = await postTweet(accessToken, { text: draft.text });
        successMode = "standalone";
      }

      if (!result.ok) {
        const parsed = parseXPublishError(result.status, result.body);
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
        scheduled,
        editedBeforeSend,
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
