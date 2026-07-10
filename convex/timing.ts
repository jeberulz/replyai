import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./helpers";
import {
  ENGAGEMENT_WINDOW_MAX_BUCKETS,
  ENGAGEMENT_WINDOW_SCAN_LIMIT,
  MIN_ENGAGEMENT_WINDOW_SAMPLE,
  buildEngagementWindowSnapshot,
  demoEngagementWindowSnapshot,
  type EngagementWindowObservation,
} from "../shared/engagementWindow";
import {
  countPacingPublishesOnLocalDay,
  isPacingPublishKind,
} from "../shared/replyPacing";

const curveValidator = v.object({
  authorBand: v.union(
    v.literal("micro"),
    v.literal("small"),
    v.literal("medium"),
    v.literal("large")
  ),
  authorBandLabel: v.string(),
  topicTag: v.union(v.string(), v.null()),
  sampleSize: v.number(),
  medianPeakMinutes: v.union(v.number(), v.null()),
  minPeakMinutes: v.union(v.number(), v.null()),
  maxPeakMinutes: v.union(v.number(), v.null()),
  medianReplyBackMinutes: v.union(v.number(), v.null()),
  hasEnoughData: v.boolean(),
});

const snapshotValidator = v.object({
  minSampleSize: v.number(),
  scanLimit: v.number(),
  totalResponded: v.number(),
  publishedToday: v.number(),
  buckets: v.array(curveValidator),
  primary: v.union(curveValidator, v.null()),
  isDemo: v.boolean(),
});

/**
 * Per-user engagement-window curves from replyOutcomeTrackers.
 * Observed counts only — never invents ML percentages.
 */
export const engagementWindow = query({
  args: {
    sessionToken: v.string(),
    timezoneOffsetMinutes: v.optional(v.number()),
  },
  returns: snapshotValidator,
  handler: async (ctx, { sessionToken, timezoneOffsetMinutes = 0 }) => {
    const user = await requireUser(ctx, sessionToken);
    const nowMs = Date.now();

    if (user.isDemo) {
      return { ...demoEngagementWindowSnapshot(), publishedToday: 1 };
    }

    const recentTrackers = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_user_and_publishedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(ENGAGEMENT_WINDOW_SCAN_LIMIT);

    const publishedToday = countPacingPublishesOnLocalDay(
      recentTrackers
        .filter((tracker) => isPacingPublishKind(tracker.kind))
        .map((tracker) => tracker.publishedAt),
      nowMs,
      timezoneOffsetMinutes
    );

    const observations: EngagementWindowObservation[] = [];

    for (const tracker of recentTrackers) {
      if (!isPacingPublishKind(tracker.kind)) continue;
      if (tracker.status !== "responded" || tracker.respondedAt == null) {
        continue;
      }

      let authorFollowers: number | null = null;
      let originalPostedAt: number | null = null;
      let topicTag: string | null = null;

      if (tracker.opportunityId) {
        const opportunity = await ctx.db.get(tracker.opportunityId);
        if (opportunity) {
          authorFollowers = opportunity.authorFollowers;
          originalPostedAt = opportunity.postedAt;
        }
      }

      const analysisId = tracker.analysisId;
      if (analysisId) {
        const analysis = await ctx.db.get(analysisId);
        if (analysis) {
          topicTag = analysis.topic;
          if (authorFollowers == null) {
            authorFollowers = analysis.tweet.authorFollowers;
          }
          if (originalPostedAt == null) {
            originalPostedAt = analysis.tweet.postedAt;
          }
        }
      }

      if (authorFollowers == null || originalPostedAt == null) {
        const draft = await ctx.db.get(tracker.draftId);
        if (draft?.analysisId) {
          const analysis = await ctx.db.get(draft.analysisId);
          if (analysis) {
            topicTag = topicTag ?? analysis.topic;
            authorFollowers =
              authorFollowers ?? analysis.tweet.authorFollowers;
            originalPostedAt =
              originalPostedAt ?? analysis.tweet.postedAt;
          }
        }
      }

      observations.push({
        originalPostedAt,
        publishedAt: tracker.publishedAt,
        respondedAt: tracker.respondedAt,
        authorFollowers,
        topicTag,
      });
    }

    return {
      ...buildEngagementWindowSnapshot({
        observations,
        isDemo: false,
        minSampleSize: MIN_ENGAGEMENT_WINDOW_SAMPLE,
        maxBuckets: ENGAGEMENT_WINDOW_MAX_BUCKETS,
        scanLimit: ENGAGEMENT_WINDOW_SCAN_LIMIT,
      }),
      publishedToday,
    };
  },
});
