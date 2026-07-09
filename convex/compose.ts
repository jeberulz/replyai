import { v } from "convex/values";
import {
  clusterWinningReplies,
  demoTopicClusters,
  type WinningReplyRow,
} from "../shared/compose";
import { chooseObservedAngle } from "../shared/personalAnalytics";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { assertFairUseAllowed } from "./lib/fairUse";

const COMPOSE_SOURCE_SCAN_LIMIT = 400;
const COMPOSE_SOURCE_COMPLETED_LIMIT = 250;

const composeFormatValidator = v.union(
  v.literal("standalone"),
  v.literal("thread"),
  v.literal("longform")
);

const composeOptionStandalone = v.object({
  category: v.string(),
  content: v.string(),
  reason: v.string(),
});

const composeOptionThread = v.object({
  category: v.string(),
  posts: v.array(v.string()),
  reason: v.string(),
});

const composeOptionLongform = v.object({
  category: v.string(),
  title: v.string(),
  content: v.string(),
  reason: v.string(),
});

const composeOutputsValidator = v.object({
  standalone: v.array(composeOptionStandalone),
  thread: v.array(composeOptionThread),
  longform: v.array(composeOptionLongform),
});

/**
 * Eligible winning replies → topic clusters for the compose ladder.
 * Falls back to deterministic demo clusters when the user has no outcomes.
 */
export const listClusters = query({
  args: { sessionToken: v.string() },
  returns: v.object({
    demo: v.boolean(),
    clusters: v.array(
      v.object({
        id: v.string(),
        topic: v.string(),
        reason: v.string(),
        unusedAngles: v.array(v.string()),
        replies: v.array(
          v.object({
            draftId: v.string(),
            analysisId: v.optional(v.string()),
            replyText: v.string(),
            usedAngle: v.optional(v.string()),
            category: v.optional(v.string()),
            publishedAt: v.number(),
            targetAuthorHandle: v.optional(v.string()),
          })
        ),
      })
    ),
  }),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);

    const recentTrackers = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_user_and_publishedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(COMPOSE_SOURCE_SCAN_LIMIT);

    const completed = recentTrackers
      .filter(
        (tracker) =>
          tracker.kind === "reply" &&
          (tracker.status === "responded" || tracker.status === "expired")
      )
      .slice(0, COMPOSE_SOURCE_COMPLETED_LIMIT);

    const rows: WinningReplyRow[] = [];

    for (const tracker of completed) {
      if (tracker.status !== "responded") continue;

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

      const usedAngle =
        chooseObservedAngle({
          suggestedAngle,
          missingAngles: analysis?.missingAngles,
          replyText: draft.text,
        }) ?? undefined;

      rows.push({
        draftId: String(draft._id),
        analysisId: analysisId ? String(analysisId) : undefined,
        publishedTweetId: tracker.publishedTweetId,
        publishedAt: tracker.publishedAt,
        replyText: draft.text,
        topic: analysis?.topic?.trim() || "Untitled",
        missingAngles: analysis?.missingAngles ?? [],
        usedAngle,
        category: reply?.category,
        editBucket: draft.editBucket ?? reply?.editBucket,
        responded: true,
        targetAuthorHandle: tracker.targetAuthorHandle,
      });
    }

    const clusters = clusterWinningReplies(rows);
    if (clusters.length === 0) {
      return { demo: true, clusters: demoTopicClusters() };
    }
    return { demo: false, clusters };
  },
});

export const listRuns = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("composeRuns"),
      status: v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("failed")
      ),
      format: composeFormatValidator,
      clusterId: v.string(),
      topic: v.string(),
      demo: v.boolean(),
      error: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const runs = await ctx.db
      .query("composeRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
    return runs.map((run) => ({
      _id: run._id,
      status: run.status,
      format: run.format,
      clusterId: run.clusterId,
      topic: run.topic,
      demo: run.demo,
      error: run.error,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    }));
  },
});

export const getRun = query({
  args: {
    sessionToken: v.string(),
    runId: v.id("composeRuns"),
  },
  returns: v.union(
    v.object({
      _id: v.id("composeRuns"),
      status: v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("complete"),
        v.literal("failed")
      ),
      format: composeFormatValidator,
      clusterId: v.string(),
      topic: v.string(),
      inputSummary: v.object({
        replyCount: v.number(),
        unusedAngleCount: v.number(),
        draftIds: v.array(v.string()),
        unusedAngles: v.array(v.string()),
        reason: v.string(),
      }),
      outputs: v.optional(composeOutputsValidator),
      voiceProfileId: v.optional(v.id("voiceProfiles")),
      demo: v.boolean(),
      error: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { sessionToken, runId }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) return null;
    return {
      _id: run._id,
      status: run.status,
      format: run.format,
      clusterId: run.clusterId,
      topic: run.topic,
      inputSummary: run.inputSummary,
      outputs: run.outputs,
      voiceProfileId: run.voiceProfileId,
      demo: run.demo,
      error: run.error,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      completedAt: run.completedAt,
    };
  },
});

/**
 * Start a compose run shell. Generation fills outputs via completeRun /
 * failRun from the server action (mirrors analysis pipeline).
 */
export const start = mutation({
  args: {
    sessionToken: v.string(),
    format: composeFormatValidator,
    clusterId: v.string(),
    topic: v.string(),
    reason: v.string(),
    draftIds: v.array(v.string()),
    unusedAngles: v.array(v.string()),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    demo: v.boolean(),
  },
  returns: v.id("composeRuns"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    await assertFairUseAllowed(ctx, user, "generate");

    if (args.voiceProfileId) {
      const profile = await ctx.db.get(args.voiceProfileId);
      if (!profile || profile.userId !== user._id) {
        throw new Error("Voice profile not found");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("composeRuns", {
      userId: user._id,
      status: "generating",
      format: args.format,
      clusterId: args.clusterId,
      topic: args.topic,
      inputSummary: {
        replyCount: args.draftIds.length,
        unusedAngleCount: args.unusedAngles.length,
        draftIds: args.draftIds,
        unusedAngles: args.unusedAngles,
        reason: args.reason,
      },
      voiceProfileId: args.voiceProfileId,
      demo: args.demo,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeRun = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("composeRuns"),
    outputs: composeOutputsValidator,
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, runId, outputs }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Compose run not found");
    }
    const now = Date.now();
    await ctx.db.patch(runId, {
      status: "complete",
      outputs,
      error: undefined,
      updatedAt: now,
      completedAt: now,
    });
    return null;
  },
});

export const failRun = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("composeRuns"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, runId, error }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Compose run not found");
    }
    await ctx.db.patch(runId, {
      status: "failed",
      error,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Save a compose option as a draft. Longform is copy-out only (never publish). */
export const saveDraftFromOption = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("composeRuns"),
    format: composeFormatValidator,
    text: v.string(),
    threadPosts: v.optional(v.array(v.string())),
    title: v.optional(v.string()),
  },
  returns: v.id("savedDrafts"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Compose run not found");
    }

    const kind =
      args.format === "standalone"
        ? ("standalone" as const)
        : args.format === "thread"
          ? ("thread" as const)
          : ("longform" as const);

    const publishMode =
      args.format === "standalone" ? ("standalone" as const) : undefined;

    return await ctx.db.insert("savedDrafts", {
      userId: user._id,
      kind,
      text: args.text,
      threadPosts: args.threadPosts,
      title: args.title,
      composeRunId: args.runId as Id<"composeRuns">,
      publishMode,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});
