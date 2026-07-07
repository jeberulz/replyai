import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  DISMISSED_AUTHOR_COOLDOWN_MS,
  isAuthorInCooldown,
  normalizeHandle,
  pruneExpiredDismissedAuthors,
} from "../shared/feedFilters";
import { opportunityStillRelevant } from "../shared/semanticRelevance";
import { requireUser } from "./helpers";

export const list = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const keywords = settings?.keywords ?? [];
    const dismissedAuthors = pruneExpiredDismissedAuthors(
      settings?.dismissedAuthors ?? []
    );
    const repliedIds = await repliedTweetIdsForUser(ctx, user._id);

    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "new")
      )
      .collect();
    return rows
      .filter(
        (opp) =>
          !repliedIds.has(opp.tweetId) &&
          !isAuthorInCooldown(opp.authorHandle, dismissedAuthors) &&
          opportunityStillRelevant(
            opp.text,
            keywords,
            opp.source,
            opp.topicRelevance
          )
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit ?? 20);
  },
});

export const dismiss = mutation({
  args: { sessionToken: v.string(), opportunityId: v.id("opportunities") },
  handler: async (ctx, { sessionToken, opportunityId }) => {
    const user = await requireUser(ctx, sessionToken);
    const opp = await ctx.db.get(opportunityId);
    if (!opp || opp.userId !== user._id) throw new Error("Not found");
    await ctx.db.patch(opportunityId, {
      status: "dismissed",
      outcome: "ignored",
    });

    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!settings) return;

    const now = Date.now();
    const handle = normalizeHandle(opp.authorHandle);
    const pruned = pruneExpiredDismissedAuthors(settings.dismissedAuthors ?? [], now);
    const dismissedAuthors = [
      ...pruned.filter((a) => normalizeHandle(a.handle) !== handle),
      { handle, until: now + DISMISSED_AUTHOR_COOLDOWN_MS },
    ];
    await ctx.db.patch(settings._id, { dismissedAuthors });
  },
});

/** Tweet IDs the user already published a reply/quote to. */
async function repliedTweetIdsForUser(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Set<string>> {
  const drafts = await ctx.db
    .query("savedDrafts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const ids = drafts
    .filter((d) => d.status === "published" && d.targetTweetId)
    .map((d) => d.targetTweetId as string);
  return new Set(ids);
}

export const scanFilterContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    const dismissedAuthors = pruneExpiredDismissedAuthors(
      settings?.dismissedAuthors ?? [],
      now
    );
    const repliedTweetIds = [...(await repliedTweetIdsForUser(ctx, userId))];
    return { dismissedAuthors, repliedTweetIds, now };
  },
});

const STALE_OPPORTUNITY_AGE_MS = 8 * 60 * 60 * 1000;

/** Drop "new" opportunities older than the reply window (8h). */
export const pruneStale = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const cutoff = Date.now() - STALE_OPPORTUNITY_AGE_MS;
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "new")
      )
      .collect();
    for (const row of rows) {
      if (row.postedAt < cutoff) {
        await ctx.db.patch(row._id, {
          status: "dismissed",
          outcome: row.outcome ?? "ignored",
        });
      }
    }
  },
});

/** Dismiss cached opportunities that fail the current relevance filter. */
export const reconcileIrrelevant = internalMutation({
  args: {
    userId: v.id("users"),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, { userId, keywords }) => {
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "new")
      )
      .collect();
    for (const row of rows) {
      if (
        !opportunityStillRelevant(
          row.text,
          keywords,
          row.source,
          row.topicRelevance
        )
      ) {
        await ctx.db.patch(row._id, { status: "dismissed", outcome: "ignored" });
      }
    }
  },
});

export const upsertMany = internalMutation({
  args: {
    userId: v.id("users"),
    items: v.array(
      v.object({
        tweetId: v.string(),
        tweetUrl: v.string(),
        authorHandle: v.string(),
        authorName: v.string(),
        authorFollowers: v.number(),
        text: v.string(),
        score: v.number(),
        reason: v.string(),
        suggestedAngle: v.string(),
        replyCount: v.number(),
        velocity: v.number(),
        postedAt: v.number(),
        source: v.optional(
          v.union(
            v.literal("following"),
            v.literal("list"),
            v.literal("watched"),
            v.literal("search")
          )
        ),
        sourceLabel: v.optional(v.string()),
        keywordRelevance: v.optional(v.number()),
        semanticRelevance: v.optional(v.number()),
        topicRelevance: v.optional(v.number()),
        semanticClassifiedAt: v.optional(v.number()),
        textFingerprint: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { userId, items }) => {
    const now = Date.now();
    let inserted = 0;
    for (const item of items) {
      const existing = await ctx.db
        .query("opportunities")
        .withIndex("by_user_tweet", (q) =>
          q.eq("userId", userId).eq("tweetId", item.tweetId)
        )
        .unique();
      if (existing) {
        if (existing.status === "analyzed" || existing.status === "dismissed") {
          continue;
        }
        await ctx.db.patch(existing._id, {
          score: item.score,
          reason: item.reason,
          replyCount: item.replyCount,
          velocity: item.velocity,
          scannedAt: now,
          status: "new",
          source: item.source,
          sourceLabel: item.sourceLabel,
          keywordRelevance: item.keywordRelevance,
          semanticRelevance: item.semanticRelevance,
          topicRelevance: item.topicRelevance,
          semanticClassifiedAt: item.semanticClassifiedAt,
          textFingerprint: item.textFingerprint,
        });
      } else {
        await ctx.db.insert("opportunities", {
          userId,
          ...item,
          scannedAt: now,
          status: "new",
        });
        inserted += 1;
      }
    }
    // Reported by the calling action as the opportunity_surfaced funnel
    // event (docs/observability.md) — this mutation itself can't call
    // fetch to capture it directly (Convex mutations have no network I/O).
    return { inserted };
  },
});

/** Mark opportunity as sent when a reply publishes to its tweet. */
export const markSentByTweet = internalMutation({
  args: {
    userId: v.id("users"),
    tweetId: v.string(),
  },
  handler: async (ctx, { userId, tweetId }) => {
    const opp = await ctx.db
      .query("opportunities")
      .withIndex("by_user_tweet", (q) =>
        q.eq("userId", userId).eq("tweetId", tweetId)
      )
      .unique();
    if (!opp) return;
    const now = Date.now();
    await ctx.db.patch(opp._id, {
      outcome: "sent",
      sentAt: now,
      analyzedAt: opp.analyzedAt ?? now,
    });
  },
});
