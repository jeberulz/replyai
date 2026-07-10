import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";
import { readStoredXTokens } from "./tokenSecurity";
import { learnFromSentText } from "./voiceProfiles";
import { measureObservedEdit } from "../shared/editDistance";

const publishModeValidator = v.optional(
  v.union(
    v.literal("threaded"),
    v.literal("standalone"),
    v.literal("url_quote")
  )
);

const draftKindValidator = v.union(
  v.literal("reply"),
  v.literal("quote"),
  v.literal("standalone"),
  v.literal("thread"),
  v.literal("longform")
);

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    return await ctx.db
      .query("savedDrafts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

export const scheduledCount = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const rows = await ctx.db
      .query("savedDrafts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "scheduled")
      )
      .take(101);
    return {
      count: rows.length,
      truncated: rows.length > 100,
    };
  },
});

export const get = query({
  args: { sessionToken: v.string(), draftId: v.id("savedDrafts") },
  handler: async (ctx, { sessionToken, draftId }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id) return null;
    return draft;
  },
});

export const save = mutation({
  args: {
    sessionToken: v.string(),
    text: v.string(),
    kind: draftKindValidator,
    analysisId: v.optional(v.id("tweetAnalyses")),
    replyId: v.optional(v.id("generatedReplies")),
    targetTweetId: v.optional(v.string()),
    targetTweetUrl: v.optional(v.string()),
    publishMode: publishModeValidator,
    threadPosts: v.optional(v.array(v.string())),
    title: v.optional(v.string()),
    composeRunId: v.optional(v.id("composeRuns")),
    variantGroupId: v.optional(v.id("variantGroups")),
    variantLabel: v.optional(
      v.union(v.literal("A"), v.literal("B"), v.literal("C"))
    ),
    /** WP15 offline queue idempotency key — create-once on sync. */
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, clientId, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    if (clientId) {
      const existing = await ctx.db
        .query("savedDrafts")
        .withIndex("by_user_client", (q) =>
          q.eq("userId", user._id).eq("clientId", clientId)
        )
        .unique();
      if (existing) {
        // Last-write-wins text if the queued create was edited before sync.
        if (existing.status !== "published" && existing.text !== args.text) {
          const observedEdit = await getObservedEditForDraft(
            ctx,
            user._id,
            args.replyId ?? existing.replyId,
            args.text
          );
          await ctx.db.patch(existing._id, {
            text: args.text,
            ...observedEdit.draftPatch,
          });
          return {
            draftId: existing._id,
            ...observedEdit.analytics,
            deduped: true as const,
          };
        }
        return {
          draftId: existing._id,
          editBucket: existing.editBucket,
          editDistanceNormalized: existing.editDistanceNormalized,
          deduped: true as const,
        };
      }
    }
    if (args.variantGroupId) {
      const group = await ctx.db.get(args.variantGroupId);
      if (!group || group.userId !== user._id) {
        throw new Error("Variant group not found");
      }
    }
    const observedEdit = await getObservedEditForDraft(
      ctx,
      user._id,
      args.replyId,
      args.text
    );
    const draftId = await ctx.db.insert("savedDrafts", {
      userId: user._id,
      ...args,
      ...(clientId ? { clientId } : {}),
      ...observedEdit.draftPatch,
      status: "draft",
      createdAt: Date.now(),
    });
    return {
      draftId,
      ...observedEdit.analytics,
      deduped: false as const,
    };
  },
});

/**
 * Publish a draft, either immediately or at a scheduled time. Always the
 * result of an explicit user click on this specific text — there is no
 * auto-publish path anywhere in the app (see PRD §10, platform risk).
 */
export const publish = mutation({
  args: {
    sessionToken: v.string(),
    text: v.string(),
    kind: draftKindValidator,
    analysisId: v.optional(v.id("tweetAnalyses")),
    replyId: v.optional(v.id("generatedReplies")),
    targetTweetId: v.optional(v.string()),
    targetTweetUrl: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    publishMode: publishModeValidator,
    threadPosts: v.optional(v.array(v.string())),
    title: v.optional(v.string()),
    composeRunId: v.optional(v.id("composeRuns")),
    variantGroupId: v.optional(v.id("variantGroups")),
    variantLabel: v.optional(
      v.union(v.literal("A"), v.literal("B"), v.literal("C"))
    ),
  },
  handler: async (ctx, { sessionToken, scheduledFor, publishMode, kind, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    if (kind === "longform") {
      throw new Error(
        "Long-form / Article drafts are copy-out only — paste into X yourself."
      );
    }
    if (kind === "thread") {
      throw new Error(
        "Thread drafts are saved for copy-out; publish each post with a human click as standalone when ready."
      );
    }
    if (args.variantGroupId) {
      const group = await ctx.db.get(args.variantGroupId);
      if (!group || group.userId !== user._id) {
        throw new Error("Variant group not found");
      }
    }
    const resolvedMode =
      publishMode ??
      (kind === "standalone"
        ? "standalone"
        : kind === "quote"
          ? "url_quote"
          : "threaded");
    const observedEdit = await getObservedEditForDraft(
      ctx,
      user._id,
      args.replyId,
      args.text
    );
    const draftId = await ctx.db.insert("savedDrafts", {
      userId: user._id,
      kind,
      ...args,
      ...observedEdit.draftPatch,
      publishMode: resolvedMode,
      status: "scheduled",
      scheduledFor: scheduledFor ?? Date.now(),
      createdAt: Date.now(),
    });
    if (scheduledFor && scheduledFor > Date.now()) {
      await ctx.scheduler.runAt(scheduledFor, internal.publish.run, {
        draftId,
        scheduled: true,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.publish.run, {
        draftId,
        scheduled: false,
      });
    }
    return {
      draftId,
      ...observedEdit.analytics,
    };
  },
});

/** Re-publish a failed draft as a standalone tweet (no reply/quote threading). */
export const retryAsStandalone = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("savedDrafts"),
  },
  handler: async (ctx, { sessionToken, draftId }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id) throw new Error("Not found");
    if (draft.status !== "failed") throw new Error("Draft is not failed");

    await ctx.db.patch(draftId, {
      status: "scheduled",
      error: undefined,
      publishMode: "standalone",
      scheduledFor: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.publish.run, { draftId, scheduled: false });
  },
});

/** Edit a not-yet-published draft's text in place. */
export const updateContent = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("savedDrafts"),
    text: v.string(),
  },
  handler: async (ctx, { sessionToken, draftId, text }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id) throw new Error("Not found");
    if (draft.status === "published") throw new Error("Already published");
    const observedEdit = await getObservedEditForDraft(
      ctx,
      user._id,
      draft.replyId,
      text
    );
    await ctx.db.patch(draftId, { text, ...observedEdit.draftPatch });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), draftId: v.id("savedDrafts") },
  handler: async (ctx, { sessionToken, draftId }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id) throw new Error("Not found");
    if (draft.status === "published") throw new Error("Already published");
    await ctx.db.delete(draftId);
  },
});

export const getForPublish = internalQuery({
  args: { draftId: v.id("savedDrafts") },
  handler: async (ctx, { draftId }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return null;
    const user = await ctx.db.get(draft.userId);
    if (!user) return null;
    const tokenRow = await ctx.db
      .query("xTokens")
      .withIndex("by_user", (q) => q.eq("userId", draft.userId))
      .unique();
    const tokens = await readStoredXTokens(tokenRow);
    // Best-effort edit-extent metadata for the `published` funnel event
    // (docs/observability.md) — whether the option this draft came from was
    // ever manually edited. Not available for drafts with no linked reply
    // (e.g. a URL-quote composed outside the option workflow).
    const reply = draft.replyId ? await ctx.db.get(draft.replyId) : null;
    return {
      draft,
      isDemo: user.isDemo,
      userId: user._id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokenRow?.expiresAt ?? 0,
      scope: tokenRow?.scope ?? "",
      editDistanceNormalized:
        draft.editDistanceNormalized ?? reply?.editDistanceNormalized,
      editBucket: draft.editBucket ?? reply?.editBucket,
    };
  },
});

export const markResult = internalMutation({
  args: {
    draftId: v.id("savedDrafts"),
    publishedTweetId: v.optional(v.string()),
    error: v.optional(v.string()),
    publishMode: publishModeValidator,
  },
  handler: async (ctx, { draftId, publishedTweetId, error, publishMode }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) return;
    if (publishedTweetId) {
      await ctx.db.patch(draftId, {
        status: "published",
        publishedTweetId,
        publishedAt: Date.now(),
        ...(publishMode ? { publishMode } : {}),
      });
      // Learning loop: the sent text is user-approved voice ground truth.
      await learnFromSentText(ctx, draft.userId, draft.text);
      if (draft.targetTweetId) {
        await ctx.runMutation(internal.opportunities.markSentByTweet, {
          userId: draft.userId,
          tweetId: draft.targetTweetId,
          draftId,
        });
      }
      // Outcome trackers are reply/quote only — compose standalone posts
      // skip the reply-back poller (no in_reply_to target).
      if (draft.kind === "reply" || draft.kind === "quote") {
        await ctx.runMutation(internal.outcomes.seedPublishedDraft, {
          draftId,
          publishedTweetId,
          publishMode,
        });
      }
    } else {
      await ctx.db.patch(draftId, { status: "failed", error });
    }
  },
});

async function getObservedEditForDraft(
  ctx: MutationCtx,
  userId: Id<"users">,
  replyId: Id<"generatedReplies"> | undefined,
  text: string
) {
  if (!replyId) {
    return {
      draftPatch: {},
    };
  }

  const reply = await ctx.db.get(replyId);
  if (!reply || reply.userId !== userId) {
    return {
      draftPatch: {},
    };
  }

  const baseline = reply.baselineContent ?? reply.content;
  const observedEdit = measureObservedEdit(baseline, text);
  const editedBeforeSend = observedEdit.normalizedEditDistance > 0;

  await ctx.db.patch(reply._id, {
    editedBeforeSend,
    editDistanceNormalized: observedEdit.normalizedEditDistance,
    editBucket: observedEdit.bucket,
  });

  return {
    draftPatch: {
      editDistanceNormalized: observedEdit.normalizedEditDistance,
      editBucket: observedEdit.bucket,
    },
    analytics: {
      editDistanceNormalized: observedEdit.normalizedEditDistance,
      editBucket: observedEdit.bucket,
    },
  };
}
