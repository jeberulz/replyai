"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const X_API_BASE = "https://api.x.com/2";

/**
 * Publish a scheduled/immediate draft to X. Runs only after an explicit
 * user click on this specific draft — never triggered automatically.
 */
export const run = internalAction({
  args: { draftId: v.id("savedDrafts") },
  handler: async (ctx, { draftId }) => {
    const bundle = await ctx.runQuery(internal.drafts.getForPublish, { draftId });
    if (!bundle) return;
    const { draft, isDemo, accessToken } = bundle;
    if (draft.status === "published") return;

    if (isDemo || !accessToken) {
      if (isDemo) {
        // Demo accounts simulate a successful publish.
        await ctx.runMutation(internal.drafts.markResult, {
          draftId,
          publishedTweetId: `demo-${Date.now()}`,
        });
      } else {
        await ctx.runMutation(internal.drafts.markResult, {
          draftId,
          error: "X account not connected or token expired. Reconnect in Settings.",
        });
      }
      return;
    }

    const body: Record<string, unknown> = { text: draft.text };
    if (draft.kind === "reply" && draft.targetTweetId) {
      body.reply = { in_reply_to_tweet_id: draft.targetTweetId };
    } else if (draft.kind === "quote" && draft.targetTweetId) {
      body.quote_tweet_id = draft.targetTweetId;
    }

    try {
      const res = await fetch(`${X_API_BASE}/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`X API ${res.status}: ${detail.slice(0, 300)}`);
      }
      const json = (await res.json()) as { data?: { id?: string } };
      await ctx.runMutation(internal.drafts.markResult, {
        draftId,
        publishedTweetId: json.data?.id ?? "unknown",
      });
    } catch (error) {
      await ctx.runMutation(internal.drafts.markResult, {
        draftId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
