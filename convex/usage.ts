import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentMonth, requireUser } from "./helpers";
import {
  assertFairUseAllowed,
  getFairUseStatus,
} from "./lib/fairUse";
import {
  opportunityToAnalyzeRate,
  type OpportunityFunnelRow,
} from "../shared/rankingWeights";
import { countObservedEditBuckets } from "../shared/editDistance";
import {
  collectPacingPublishPoints,
  countPacingPublishesOnLocalDay,
  isPacingPublishKind,
  isPublishedOnLocalDay,
  summarizeReplyPacing,
} from "../shared/replyPacing";
import { replyResponseStats } from "../shared/outcomes";
import {
  buildPersonalAnalytics,
  chooseObservedAngle,
  type ObservedAnalyticsRow,
} from "../shared/personalAnalytics";
import { assessDuplicateReplyRisk, DUPLICATE_REPLY_LOOKBACK_MS } from "../shared/duplicateReply";

const PERSONAL_ANALYTICS_SCAN_LIMIT = 400;
const PERSONAL_ANALYTICS_COMPLETED_LIMIT = 250;

export const record = mutation({
  args: {
    sessionToken: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    analyses: v.number(),
    generations: v.number(),
  },
  handler: async (ctx, { sessionToken, tokensIn, tokensOut, analyses, generations }) => {
    const user = await requireUser(ctx, sessionToken);
    if (analyses > 0) {
      await assertFairUseAllowed(ctx, user, "run_analysis");
    }
    if (generations > 0) {
      await assertFairUseAllowed(ctx, user, "generate");
    }
    const month = currentMonth();
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("month", month)
      )
      .unique();
    if (row) {
      await ctx.db.patch(row._id, {
        tokensIn: row.tokensIn + tokensIn,
        tokensOut: row.tokensOut + tokensOut,
        requests: row.requests + 1,
        analyses: row.analyses + analyses,
        generations: row.generations + generations,
      });
    } else {
      await ctx.db.insert("usage", {
        userId: user._id,
        month,
        tokensIn,
        tokensOut,
        requests: 1,
        analyses,
        generations,
      });
    }
  },
});

export const fairUseStatus = query({
  args: {
    sessionToken: v.string(),
    action: v.optional(
      v.union(
        v.literal("start_analysis"),
        v.literal("run_analysis"),
        v.literal("generate")
      )
    ),
  },
  handler: async (ctx, { sessionToken, action }) => {
    const user = await requireUser(ctx, sessionToken);
    return await getFairUseStatus(ctx, user, action ?? "start_analysis");
  },
});

export const duplicateReplyCheck = query({
  args: {
    sessionToken: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { sessionToken, text }) => {
    const user = await requireUser(ctx, sessionToken);
    const nowMs = Date.now();
    const lookbackStart = nowMs - DUPLICATE_REPLY_LOOKBACK_MS;

    const publishedDrafts = await ctx.db
      .query("savedDrafts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "published")
      )
      .order("desc")
      .take(80);

    return assessDuplicateReplyRisk({
      candidateText: text,
      nowMs,
      recentPublished: publishedDrafts
        .filter(
          (draft) =>
            isPacingPublishKind(draft.kind) &&
            Boolean(draft.publishedAt) &&
            draft.publishedAt! >= lookbackStart
        )
        .map((draft) => ({
          text: draft.text,
          publishedAt: draft.publishedAt!,
        })),
    });
  },
});

/**
 * Dashboard stats, including the north-star metric: the share of published
 * replies that were used with no or minor edits.
 */
export const stats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const month = currentMonth();
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("month", month)
      )
      .unique();

    const published = await ctx.db
      .query("savedDrafts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "published")
      )
      .collect();

    const observedBuckets: Array<
      "no_edit" | "minor_edit" | "major_edit" | null | undefined
    > = [];
    const publishDurationsMs: number[] = [];
    for (const draft of published) {
      if (!draft.replyId) continue;
      const reply = await ctx.db.get(draft.replyId);
      observedBuckets.push(draft.editBucket ?? reply?.editBucket);
      // Supporting metric: time from drafting the option to publishing it.
      if (reply && draft.publishedAt) {
        publishDurationsMs.push(draft.publishedAt - reply.createdAt);
      }
    }

    const observedEditBuckets = countObservedEditBuckets(observedBuckets);

    const medianMs = median(publishDurationsMs);

    const monthPrefix = month;
    const monthStart = Date.parse(`${month}-01T00:00:00.000Z`);
    const nextMonthStart = nextMonthStartMs(monthStart);
    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const monthOpportunities: OpportunityFunnelRow[] = opportunities
      .filter((o) =>
        new Date(o.scannedAt).toISOString().slice(0, 7) === monthPrefix
      )
      .map((o) => ({
        source: o.source,
        authorFollowers: o.authorFollowers,
        score: o.score,
        scannedAt: o.scannedAt,
        // Auto-archived rows behave like dismissed for the funnel — the
        // window closed unattended, same as a user-dismissed row.
        status: o.status === "archived" ? ("dismissed" as const) : o.status,
        outcome: o.outcome,
      }));
    const replyOutcomeRows = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_user_and_publishedAt", (q) =>
        q
          .eq("userId", user._id)
          .gte("publishedAt", monthStart)
          .lt("publishedAt", nextMonthStart)
      )
      .collect();
    const replyBack = replyResponseStats(replyOutcomeRows);

    return {
      month,
      tokensIn: usage?.tokensIn ?? 0,
      tokensOut: usage?.tokensOut ?? 0,
      requests: usage?.requests ?? 0,
      analyses: usage?.analyses ?? 0,
      generations: usage?.generations ?? 0,
      published: published.length,
      // North star: % of generated replies published with no or minor edits.
      noOrMinorEditRate: observedEditBuckets.noOrMinorRate,
      observedEditBuckets,
      // Supporting metric: median seconds from draft to publish.
      medianSecondsToPublish:
        medianMs === null ? null : Math.round(medianMs / 1000),
      opportunityToAnalyzeRate: opportunityToAnalyzeRate(monthOpportunities),
      opportunitiesSurfaced: monthOpportunities.length,
      replyBackRate: replyBack.rate,
      replyBackResponded: replyBack.responded,
      replyBackSent: replyBack.sent,
    };
  },
});

export const pacingCoach = query({
  args: {
    sessionToken: v.string(),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { sessionToken, timezoneOffsetMinutes }) => {
    const user = await requireUser(ctx, sessionToken);
    const nowMs = Date.now();

    const [publishedDrafts, scheduledDrafts, recentTrackers] = await Promise.all([
      ctx.db
        .query("savedDrafts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", "published")
        )
        .order("desc")
        .take(200),
      ctx.db
        .query("savedDrafts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", "scheduled")
        )
        .order("desc")
        .take(50),
      ctx.db
        .query("replyOutcomeTrackers")
        .withIndex("by_user_and_publishedAt", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(100),
    ]);

    const opportunities = await ctx.db
      .query("opportunities")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);

    const pacingDrafts = [...publishedDrafts, ...scheduledDrafts].map((draft) => ({
      id: draft._id,
      kind: draft.kind,
      status: draft.status,
      publishedAt: draft.publishedAt,
      scheduledFor: draft.scheduledFor,
      editBucket: draft.editBucket,
    }));

    const publishedReplies = collectPacingPublishPoints(pacingDrafts, nowMs);

    const countedDraftIds = new Set(
      [...publishedDrafts, ...scheduledDrafts]
        .filter((draft) => isPacingPublishKind(draft.kind))
        .map((draft) => draft._id)
    );
    for (const tracker of recentTrackers) {
      if (!isPacingPublishKind(tracker.kind)) continue;
      if (countedDraftIds.has(tracker.draftId)) continue;
      publishedReplies.push({ publishedAt: tracker.publishedAt });
      countedDraftIds.add(tracker.draftId);
    }

    return summarizeReplyPacing({
      nowMs,
      timezoneOffsetMinutes,
      publishedReplies,
      liveOpportunities: opportunities.map((opportunity) => ({
        postedAt: opportunity.postedAt,
        scannedAt: opportunity.scannedAt,
        score: opportunity.score,
        status: opportunity.status,
      })),
    });
  },
});

export const personalAnalytics = query({
  args: {
    sessionToken: v.string(),
    timezoneOffsetMinutes: v.number(),
  },
  handler: async (ctx, { sessionToken, timezoneOffsetMinutes }) => {
    const user = await requireUser(ctx, sessionToken);

    const recentTrackers = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_user_and_publishedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(PERSONAL_ANALYTICS_SCAN_LIMIT);

    const completedReplyTrackers = recentTrackers
      .filter(
        (tracker) =>
          isPacingPublishKind(tracker.kind) &&
          (tracker.status === "responded" || tracker.status === "expired")
      )
      .slice(0, PERSONAL_ANALYTICS_COMPLETED_LIMIT);

    const nowMs = Date.now();
    const publishedToday = countPacingPublishesOnLocalDay(
      recentTrackers
        .filter((tracker) => isPacingPublishKind(tracker.kind))
        .map((tracker) => tracker.publishedAt),
      nowMs,
      timezoneOffsetMinutes
    );
    const awaitingOutcome = recentTrackers.filter(
      (tracker) =>
        isPacingPublishKind(tracker.kind) &&
        tracker.status === "active" &&
        isPublishedOnLocalDay(
          tracker.publishedAt,
          nowMs,
          timezoneOffsetMinutes
        )
    ).length;

    const rows: ObservedAnalyticsRow[] = [];

    for (const tracker of completedReplyTrackers) {
      const draft = await ctx.db.get(tracker.draftId);
      if (!draft) continue;

      const reply = draft.replyId ? await ctx.db.get(draft.replyId) : null;
      const analysisId = tracker.analysisId ?? draft.analysisId;
      const analysis = analysisId ? await ctx.db.get(analysisId) : null;

      let suggestedAngle: string | undefined;
      if (tracker.opportunityId) {
        suggestedAngle = (await ctx.db.get(tracker.opportunityId))?.suggestedAngle;
      } else if (draft.targetTweetId) {
        suggestedAngle = (
          await ctx.db
            .query("opportunities")
            .withIndex("by_user_tweet", (q) =>
              q.eq("userId", user._id).eq("tweetId", draft.targetTweetId!)
            )
            .unique()
        )?.suggestedAngle;
      }

      rows.push({
        category: reply?.category,
        angle: chooseObservedAngle({
          suggestedAngle,
          missingAngles: analysis?.missingAngles,
          replyText: draft.text,
        }),
        publishedAt: tracker.publishedAt,
        responded: tracker.status === "responded",
        editBucket: draft.editBucket ?? reply?.editBucket,
      });
    }

    return {
      historyLimit: PERSONAL_ANALYTICS_COMPLETED_LIMIT,
      scanLimit: PERSONAL_ANALYTICS_SCAN_LIMIT,
      publishedToday,
      awaitingOutcome,
      ...buildPersonalAnalytics({
        rows,
        timezoneOffsetMinutes,
      }),
    };
  },
});

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function nextMonthStartMs(monthStart: number): number {
  const date = new Date(monthStart);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}
