import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireUser } from "./helpers";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  aiSpendHourKey,
  evaluateAiSpendLimit,
  parseOptionalPositiveInt,
  type AiSpendKind,
} from "../shared/spendLimits";

const SPEND_CHECK_SCAN_LIMIT = 500;

function hourlyLimitFor(kind: AiSpendKind): number | null {
  const value =
    kind === "analysis"
      ? process.env.AI_ANALYSIS_HOURLY_LIMIT
      : kind === "discovery"
        ? process.env.AI_DISCOVERY_HOURLY_LIMIT
      : process.env.AI_GENERATION_HOURLY_LIMIT;
  return parseOptionalPositiveInt(value);
}

async function recordAiSpendAttemptForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    isDemo: boolean;
    unlimitedAccess?: boolean;
    kind: AiSpendKind;
    source: string;
  }
) {
  if (args.isDemo) {
    return { allowed: true as const };
  }

  const hourKey = aiSpendHourKey();
  const limit = hourlyLimitFor(args.kind);
  const rows = await ctx.db
    .query("aiSpendLedger")
    .withIndex("by_user_hour_kind", (q) =>
      q.eq("userId", args.userId).eq("hourKey", hourKey).eq("kind", args.kind)
    )
    .take(Math.min((limit ?? SPEND_CHECK_SCAN_LIMIT) + 1, SPEND_CHECK_SCAN_LIMIT));
  const decision = evaluateAiSpendLimit({
    kind: args.kind,
    usedThisHour: rows.length,
    hourlyLimit: limit,
    killSwitch: process.env.AI_SPEND_KILL_SWITCH === "true",
    limitsRequired: process.env.AI_SPEND_LIMITS_REQUIRED !== "false",
    unlimitedAccess: args.unlimitedAccess ?? false,
  });

  if (!decision.allowed) {
    return {
      allowed: false as const,
      message: decision.message ?? "AI generation is temporarily unavailable.",
    };
  }

  await ctx.db.insert("aiSpendLedger", {
    userId: args.userId,
    kind: args.kind,
    source: args.source.slice(0, 80),
    hourKey,
    createdAt: Date.now(),
  });

  return { allowed: true as const };
}

export const recordAiSpendAttempt = mutation({
  args: {
    sessionToken: v.string(),
    kind: v.union(
      v.literal("analysis"),
      v.literal("generation"),
      v.literal("discovery")
    ),
    source: v.string(),
  },
  returns: v.union(
    v.object({ allowed: v.literal(true) }),
    v.object({ allowed: v.literal(false), message: v.string() })
  ),
  handler: async (ctx, { sessionToken, kind, source }) => {
    const user = await requireUser(ctx, sessionToken);
    return recordAiSpendAttemptForUser(ctx, {
      userId: user._id,
      isDemo: user.isDemo,
      unlimitedAccess: user.unlimitedAccess ?? false,
      kind,
      source,
    });
  },
});

export const recordAiSpendAttemptForUserInternal = internalMutation({
  args: {
    userId: v.id("users"),
    isDemo: v.boolean(),
    unlimitedAccess: v.optional(v.boolean()),
    kind: v.union(
      v.literal("analysis"),
      v.literal("generation"),
      v.literal("discovery")
    ),
    source: v.string(),
  },
  returns: v.union(
    v.object({ allowed: v.literal(true) }),
    v.object({ allowed: v.literal(false), message: v.string() })
  ),
  handler: async (ctx, args) =>
    recordAiSpendAttemptForUser(ctx, {
      userId: args.userId,
      isDemo: args.isDemo,
      unlimitedAccess: args.unlimitedAccess,
      kind: args.kind,
      source: args.source,
    }),
});
