import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;
const FIRST_POLL_DELAY_MS = 5 * 60 * 1000;

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
