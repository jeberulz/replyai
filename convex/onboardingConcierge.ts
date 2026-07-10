import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser, currentMonth } from "./helpers";
import { onboardingConciergeProposal } from "./schema";
import { assertFairUseAllowed } from "./lib/fairUse";
import { isGoalId } from "../shared/onboarding";
import {
  ONBOARDING_CONCIERGE_KEYWORD_MAX,
  parseOnboardingConciergeProposal,
} from "../shared/onboardingConcierge";
import { sanitizeKeywordList } from "../shared/contentTokens";

const runStatus = v.union(
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
  v.literal("skipped"),
  v.literal("accepted")
);

const runSummary = v.object({
  _id: v.id("onboardingConciergeRuns"),
  status: runStatus,
  error: v.optional(v.string()),
  proposal: v.optional(onboardingConciergeProposal),
  acceptedHandles: v.optional(v.array(v.string())),
  demo: v.boolean(),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

function uniqueKeywords(list: string[]): string[] {
  return sanitizeKeywordList(list, ONBOARDING_CONCIERGE_KEYWORD_MAX);
}

/**
 * Latest concierge run for the session user (any status).
 * UI polls this after startRun.
 */
export const latest = query({
  args: { sessionToken: v.string() },
  returns: v.union(runSummary, v.null()),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db
      .query("onboardingConciergeRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!run) return null;
    return {
      _id: run._id,
      status: run.status,
      error: run.error,
      proposal: run.proposal,
      acceptedHandles: run.acceptedHandles,
      demo: run.demo,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    };
  },
});

/**
 * Start (or reuse) a concierge run. Counts as one analysis toward fair-use.
 * Never auto-applies goal/keywords/watches — proposal awaits explicit confirm.
 */
export const startRun = mutation({
  args: { sessionToken: v.string() },
  returns: v.id("onboardingConciergeRuns"),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);

    const existing = await ctx.db
      .query("onboardingConciergeRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (existing?.status === "running") {
      return existing._id;
    }
    // Reuse a complete/accepted proposal so we don't re-bill fair-use on
    // every niche-step remount; user can still skip to manual flow.
    if (
      existing &&
      (existing.status === "complete" || existing.status === "accepted") &&
      existing.proposal
    ) {
      return existing._id;
    }

    await assertFairUseAllowed(ctx, user, "run_analysis");

    const runId = await ctx.db.insert("onboardingConciergeRuns", {
      userId: user._id,
      status: "running",
      demo: false,
      createdAt: Date.now(),
    });

    // Fair-use: one concierge run = one analysis bucket (documented in progress).
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

    await ctx.scheduler.runAfter(
      0,
      internal.onboardingConciergeActions.runConcierge,
      { userId: user._id, runId }
    );

    return runId;
  },
});

/** User chose manual wizard — mark latest complete/running run as skipped. */
export const skipRun = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db
      .query("onboardingConciergeRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!run) return null;
    if (run.status === "skipped" || run.status === "accepted") return null;
    await ctx.db.patch(run._id, {
      status: "skipped",
      completedAt: run.completedAt ?? Date.now(),
    });
    return null;
  },
});

/**
 * Apply goal + keywords from the proposal. Watch handles are NOT applied
 * here — use acceptWatch per handle (WP33 / RULINGS).
 */
export const acceptProposal = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("onboardingConciergeRuns"),
    goalId: v.union(
      v.literal("audience"),
      v.literal("leads"),
      v.literal("authority")
    ),
    keywords: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { sessionToken, runId, goalId, keywords }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Concierge run not found");
    }
    if (run.status !== "complete" && run.status !== "accepted") {
      throw new Error("Proposal is not ready to accept");
    }
    if (!run.proposal) {
      throw new Error("No proposal on this run");
    }
    if (!isGoalId(goalId)) {
      throw new Error("Unknown goal");
    }

    const cleaned = uniqueKeywords(keywords);
    if (cleaned.length === 0) {
      throw new Error("Pick at least one keyword");
    }

    await ctx.db.patch(user._id, { goal: goalId });

    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (settings) {
      await ctx.db.patch(settings._id, { keywords: cleaned });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled: false,
        keywords: cleaned,
      });
    }

    await ctx.db.patch(runId, {
      status: "accepted",
      completedAt: run.completedAt ?? Date.now(),
      proposal: {
        ...run.proposal,
        goalId,
        keywords: cleaned,
      },
    });
    return null;
  },
});

/**
 * Explicit per-handle watch accept (same rule as WP33 research curator).
 * Never batch-auto-adds watches from the proposal.
 */
export const acceptWatch = mutation({
  args: {
    sessionToken: v.string(),
    runId: v.id("onboardingConciergeRuns"),
    handle: v.string(),
  },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, { sessionToken, runId, handle }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Concierge run not found");
    }
    if (!run.proposal) {
      throw new Error("No proposal on this run");
    }

    const normalized = normalizeHandle(handle);
    const candidate = run.proposal.watches.find(
      (w) => normalizeHandle(w.handle) === normalized
    );
    if (!candidate) {
      throw new Error("Handle was not in the proposal");
    }

    const already = (run.acceptedHandles ?? []).some(
      (h) => normalizeHandle(h) === normalized
    );
    if (already) {
      return { accepted: true };
    }

    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const watched = settings?.watchedHandles ?? [];
    const nextHandles = watched.some(
      (h) => normalizeHandle(h) === normalized
    )
      ? watched
      : [...watched, normalized];

    const enabledSources = settings?.enabledSources?.length
      ? settings.enabledSources.includes("watched")
        ? settings.enabledSources
        : [...settings.enabledSources, "watched" as const]
      : (["following", "watched"] as const);

    if (settings) {
      await ctx.db.patch(settings._id, {
        watchedHandles: nextHandles,
        enabledSources: [...enabledSources],
      });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled: false,
        keywords: [],
        watchedHandles: nextHandles,
        enabledSources: ["following", "watched"],
      });
    }

    await ctx.db.patch(runId, {
      acceptedHandles: [...(run.acceptedHandles ?? []), normalized],
    });
    return { accepted: true };
  },
});

/** Lightweight user fields for the concierge action prompt. */
export const userContext = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      xUserId: v.string(),
      username: v.string(),
      displayName: v.string(),
      isDemo: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      xUserId: user.xUserId,
      username: user.username,
      displayName: user.displayName,
      isDemo: user.isDemo,
    };
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("onboardingConciergeRuns"),
    userId: v.id("users"),
    proposal: onboardingConciergeProposal,
    demo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, userId, proposal, demo }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== userId) return null;
    if (run.status !== "running") return null;

    const parsed = parseOnboardingConciergeProposal(proposal);
    if (!parsed) {
      await ctx.db.patch(runId, {
        status: "failed",
        error: "Invalid proposal payload",
        demo,
        completedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.patch(runId, {
      status: "complete",
      proposal: parsed,
      demo,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("onboardingConciergeRuns"),
    userId: v.id("users"),
    error: v.string(),
    demo: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { runId, userId, error, demo }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== userId) return null;
    if (run.status !== "running") return null;
    await ctx.db.patch(runId, {
      status: "failed",
      error,
      demo: demo ?? run.demo,
      completedAt: Date.now(),
    });
    return null;
  },
});
