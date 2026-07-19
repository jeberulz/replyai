import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { requireUser } from "./helpers";
import {
  evalUsageSnapshot,
  shadowGrokAvailability,
  shadowGrokCandidateProvenance,
  shadowGrokHydrationFailure,
  shadowGrokMode,
  shadowGrokRunStatus,
} from "./schema";

async function latestPromotedShadowRunForUser(
  ctx: QueryCtx,
  userId: Id<"users">
) {
  const decisions = await ctx.db
    .query("evalDecisions")
    .withIndex("by_user_and_decision", (q) =>
      q.eq("userId", userId).eq("decision", "promote_to_shadow")
    )
    .order("desc")
    .take(10);
  for (const decision of decisions) {
    if (!decision.runId) continue;
    const run = await ctx.db.get(decision.runId);
    if (run?.userId === userId) {
      return {
        runId: run._id,
        experimentId: run.experimentId,
      };
    }
  }
  return null;
}

export const latestPromotedShadowRun = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) =>
    latestPromotedShadowRunForUser(ctx, userId),
});

export const circuitState = internalQuery({
  args: {
    providerId: v.string(),
    operation: v.string(),
    now: v.number(),
  },
  handler: async (ctx, { providerId, operation, now }) => {
    const row = await ctx.db
      .query("providerCircuitBreakers")
      .withIndex("by_provider_operation", (q) =>
        q.eq("providerId", providerId).eq("operation", operation)
      )
      .unique();
    return {
      open: Boolean(row?.openedUntil && row.openedUntil > now),
      openedUntil: row?.openedUntil ?? null,
      failureCount: row?.failureCount ?? 0,
      lastError: row?.lastError ?? null,
    };
  },
});

async function upsertCircuit(
  ctx: MutationCtx,
  args: {
    providerId: string;
    operation: string;
    success: boolean;
    failureThreshold: number;
    cooldownMs: number;
    error?: string;
    now: number;
  }
) {
  const row = await ctx.db
    .query("providerCircuitBreakers")
    .withIndex("by_provider_operation", (q) =>
      q.eq("providerId", args.providerId).eq("operation", args.operation)
    )
    .unique();
  if (args.success) {
    const patch = {
      failureCount: 0,
      openedUntil: undefined,
      lastSuccessAt: args.now,
      lastError: undefined,
      updatedAt: args.now,
    };
    if (row) {
      await ctx.db.patch(row._id, patch);
      return row._id;
    }
    return await ctx.db.insert("providerCircuitBreakers", {
      providerId: args.providerId,
      operation: args.operation,
      ...patch,
    });
  }

  const failureCount = (row?.failureCount ?? 0) + 1;
  const openedUntil =
    failureCount >= args.failureThreshold
      ? args.now + Math.max(1, args.cooldownMs)
      : row?.openedUntil;
  const patch = {
    failureCount,
    openedUntil,
    lastFailureAt: args.now,
    lastError: args.error?.slice(0, 240),
    updatedAt: args.now,
  };
  if (row) {
    await ctx.db.patch(row._id, patch);
    return row._id;
  }
  return await ctx.db.insert("providerCircuitBreakers", {
    providerId: args.providerId,
    operation: args.operation,
    ...patch,
  });
}

export const recordCircuitResult = internalMutation({
  args: {
    providerId: v.string(),
    operation: v.string(),
    success: v.boolean(),
    failureThreshold: v.number(),
    cooldownMs: v.number(),
    error: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => upsertCircuit(ctx, args),
});

export const recordRun = internalMutation({
  args: {
    userId: v.id("users"),
    scanStartedAt: v.number(),
    mode: shadowGrokMode,
    sampleRatePercent: v.number(),
    sampled: v.boolean(),
    sampleKey: v.string(),
    version: v.string(),
    status: shadowGrokRunStatus,
    availability: shadowGrokAvailability,
    reason: v.optional(v.string()),
    query: v.optional(v.string()),
    requestJson: v.optional(v.string()),
    providerId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    reasoningEffort: v.optional(v.string()),
    evalRunId: v.optional(v.id("evalRuns")),
    evalExperimentId: v.optional(v.id("evalExperiments")),
    rawProviderResponseId: v.optional(v.string()),
    citations: v.array(v.string()),
    hydrationFailures: v.array(shadowGrokHydrationFailure),
    candidates: v.array(shadowGrokCandidateProvenance),
    usage: v.optional(evalUsageSnapshot),
    costUsd: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("shadowGrokDiscoveryRuns", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (settings) {
      await ctx.db.patch(settings._id, {
        lastGrokDiscoveryShadowAt: now,
        lastGrokDiscoveryShadowStatus: args.status,
        lastGrokDiscoveryShadowError: args.errorMessage ?? args.reason,
      });
    }

    return { runId };
  },
});

export const latestStatus = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const [latestRun] = await ctx.db
      .query("shadowGrokDiscoveryRuns")
      .withIndex("by_user_scan", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);
    const circuit = await ctx.db
      .query("providerCircuitBreakers")
      .withIndex("by_provider_operation", (q) =>
        q.eq("providerId", "xai").eq("operation", "discovery")
      )
      .unique();
    return {
      latestRun,
      circuit: circuit
        ? {
            providerId: circuit.providerId,
            operation: circuit.operation,
            failureCount: circuit.failureCount,
            openedUntil: circuit.openedUntil,
            lastFailureAt: circuit.lastFailureAt,
            lastSuccessAt: circuit.lastSuccessAt,
            lastError: circuit.lastError,
          }
        : null,
    };
  },
});
