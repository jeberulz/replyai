import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser, currentMonth } from "./helpers";
import { voiceDriftSuggestion, voiceStyle } from "./schema";
import { assertFairUseAllowed } from "./lib/fairUse";
import {
  applyDriftSelection,
  type ApplyableDriftField,
  type VoiceDriftSuggestion,
} from "../shared/voiceDrift";
import {
  buildVoiceNegativeConstraints,
  normalizeNegativeConstraints,
} from "../shared/voice";

const APPLYABLE_FIELDS = v.union(
  v.literal("tone"),
  v.literal("sentenceLength"),
  v.literal("formatting"),
  v.literal("emojiUse"),
  v.literal("punctuation"),
  v.literal("readingLevel"),
  v.literal("commonPhrases"),
  v.literal("examples")
);

const MAX_PUBLISHED_EXAMPLES = 40;

const runStatus = v.union(
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
  v.literal("dismissed")
);

const driftSource = v.union(
  v.literal("published_drafts"),
  v.literal("x_timeline"),
  v.literal("demo")
);

export const latestForProfile = query({
  args: {
    sessionToken: v.string(),
    profileId: v.id("voiceProfiles"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceDriftRuns"),
      profileId: v.id("voiceProfiles"),
      status: runStatus,
      error: v.optional(v.string()),
      sources: v.array(driftSource),
      exampleCount: v.number(),
      suggestion: v.optional(voiceDriftSuggestion),
      appliedFields: v.optional(v.array(v.string())),
      demo: v.boolean(),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) return null;

    const run = await ctx.db
      .query("voiceDriftRuns")
      .withIndex("by_profile", (q) => q.eq("profileId", profileId))
      .order("desc")
      .first();
    if (!run || run.userId !== user._id) return null;

    return {
      _id: run._id,
      profileId: run.profileId,
      status: run.status,
      error: run.error,
      sources: run.sources,
      exampleCount: run.exampleCount,
      suggestion: run.suggestion,
      appliedFields: run.appliedFields,
      demo: run.demo,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    };
  },
});

/**
 * Start an on-demand voice-drift check. Counts as one analysis toward fair-use.
 * Never auto-applies — suggestion lands on the run for the user to Apply/Dismiss.
 */
export const startCheck = mutation({
  args: {
    sessionToken: v.string(),
    profileId: v.id("voiceProfiles"),
  },
  returns: v.id("voiceDriftRuns"),
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    await assertFairUseAllowed(ctx, user, "run_analysis");

    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) {
      throw new Error("Voice profile not found");
    }

    const existing = await ctx.db
      .query("voiceDriftRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (existing.some((r) => r.status === "running")) {
      throw new Error("A voice-drift check is already running.");
    }

    const runId = await ctx.db.insert("voiceDriftRuns", {
      userId: user._id,
      profileId,
      status: "running",
      sources: [],
      exampleCount: 0,
      demo: false,
      createdAt: Date.now(),
    });

    // Fair-use: one drift run = one analysis bucket (documented in progress).
    const month = currentMonth();
    const usage = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", user._id).eq("month", month)
      )
      .unique();
    if (usage) {
      await ctx.db.patch(usage._id, {
        analyses: usage.analyses + 1,
        requests: usage.requests + 1,
      });
    } else {
      await ctx.db.insert("usage", {
        userId: user._id,
        month,
        tokensIn: 0,
        tokensOut: 0,
        requests: 1,
        analyses: 1,
        generations: 0,
      });
    }

    await ctx.scheduler.runAfter(0, internal.voiceDriftActions.runDriftCheck, {
      userId: user._id,
      runId,
      profileId,
    });

    return runId;
  },
});

export const dismiss = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("voiceDriftRuns"),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, runId }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) throw new Error("Not found");
    if (run.status !== "complete") {
      throw new Error("Only a completed suggestion can be dismissed.");
    }
    await ctx.db.patch(runId, {
      status: "dismissed",
      appliedFields: [],
    });
    return null;
  },
});

/**
 * Apply selected fields from a completed drift suggestion onto the profile.
 * User must pick specific fields — never applies the whole suggestion blindly
 * unless they select every field.
 */
export const applySuggestion = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("voiceDriftRuns"),
    selectedFields: v.array(APPLYABLE_FIELDS),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, runId, selectedFields }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) throw new Error("Not found");
    if (run.status !== "complete" || !run.suggestion) {
      throw new Error("No completed suggestion to apply.");
    }
    if (selectedFields.length === 0) {
      throw new Error("Select at least one field to apply.");
    }

    const profile = await ctx.db.get(run.profileId);
    if (!profile || profile.userId !== user._id) {
      throw new Error("Voice profile not found");
    }

    const { style, examples } = applyDriftSelection({
      currentStyle: profile.style,
      suggestion: run.suggestion as VoiceDriftSuggestion,
      selectedFields: selectedFields as ApplyableDriftField[],
      currentExamples: profile.examples,
    });

    const patch: {
      style: typeof style;
      examples?: string[];
      bannedPhrases?: string[];
      antiPatterns?: string[];
    } = { style };

    if (examples !== undefined) {
      patch.examples = examples;
    }

    if (selectedFields.includes("examples") || selectedFields.length > 0) {
      const nextExamples = examples ?? profile.examples;
      const constraints = buildVoiceNegativeConstraints(nextExamples, style);
      const existing = normalizeNegativeConstraints({
        bannedPhrases: profile.bannedPhrases,
        antiPatterns: profile.antiPatterns,
      });
      if (
        existing.bannedPhrases.length === 0 &&
        existing.antiPatterns.length === 0
      ) {
        patch.bannedPhrases = constraints.bannedPhrases;
        patch.antiPatterns = constraints.antiPatterns;
      }
    }

    await ctx.db.patch(profile._id, patch);
    await ctx.db.patch(runId, {
      appliedFields: selectedFields,
    });
    return null;
  },
});

export const getRunContext = internalQuery({
  args: {
    userId: v.id("users"),
    profileId: v.id("voiceProfiles"),
  },
  returns: v.union(
    v.object({
      profile: v.object({
        _id: v.id("voiceProfiles"),
        style: voiceStyle,
        examples: v.array(v.string()),
        source: v.union(v.literal("manual"), v.literal("trained")),
      }),
      publishedTexts: v.array(v.string()),
      xUserId: v.optional(v.string()),
      isDemo: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, { userId, profileId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== userId) return null;

    const drafts = await ctx.db
      .query("savedDrafts")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "published")
      )
      .order("desc")
      .take(MAX_PUBLISHED_EXAMPLES);

    return {
      profile: {
        _id: profile._id,
        style: profile.style,
        examples: profile.examples,
        source: profile.source,
      },
      publishedTexts: drafts
        .map((d) => d.text)
        .filter((t) => t.trim().length > 0),
      xUserId: user.xUserId,
      isDemo: user.isDemo,
    };
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("voiceDriftRuns"),
    suggestion: voiceDriftSuggestion,
    sources: v.array(driftSource),
    exampleCount: v.number(),
    demo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "running") return null;
    await ctx.db.patch(args.runId, {
      status: "complete",
      suggestion: args.suggestion,
      sources: args.sources,
      exampleCount: args.exampleCount,
      demo: args.demo,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("voiceDriftRuns"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, error }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "running") return null;
    await ctx.db.patch(runId, {
      status: "failed",
      error,
      completedAt: Date.now(),
    });
    return null;
  },
});
