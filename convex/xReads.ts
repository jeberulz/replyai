import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { requireUser } from "./helpers";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  evaluateXReadBudget,
  parseOptionalNonNegativeInt,
  xReadDayKey,
  type XReadSource,
} from "../shared/xReadLimits";

const RESOURCE_HASH_LIMIT = 200;

const sourceValidator = v.union(
  v.literal("manual_analysis"),
  v.literal("onboarding"),
  v.literal("scanner_following"),
  v.literal("scanner_list"),
  v.literal("scanner_watched"),
  v.literal("scanner_search"),
  v.literal("research"),
  v.literal("voice_refresh"),
  v.literal("reply_back"),
  v.literal("owned_lists")
);

const priorityValidator = v.union(v.literal("high"), v.literal("low"));

async function countRequestsForDay(
  ctx: MutationCtx,
  args: { userId?: Id<"users">; dayKey: string }
): Promise<number> {
  let count = 0;
  if (args.userId) {
    for await (const row of ctx.db
      .query("xReadLedger")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", args.userId as Id<"users">).eq("dayKey", args.dayKey)
      )) {
      count += row.requestCount;
    }
  } else {
    for await (const row of ctx.db
      .query("xReadLedger")
      .withIndex("by_day", (q) => q.eq("dayKey", args.dayKey))) {
      count += row.requestCount;
    }
  }
  return count;
}

function readCaps() {
  return {
    killSwitch: process.env.X_READ_KILL_SWITCH === "true",
    limitsRequired: process.env.X_READ_LIMITS_REQUIRED !== "false",
    userDailyLimit: parseOptionalNonNegativeInt(process.env.X_READ_USER_DAILY_LIMIT),
    globalDailyLimit: parseOptionalNonNegativeInt(
      process.env.X_READ_GLOBAL_DAILY_LIMIT
    ),
  };
}

async function recordAttemptForUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    isDemo: boolean;
    unlimitedAccess?: boolean;
    source: XReadSource;
    endpoint: string;
    priority: "high" | "low";
  }
) {
  if (args.isDemo) {
    return { allowed: true as const, demo: true as const };
  }

  const dayKey = xReadDayKey();
  const [userRequestsToday, globalRequestsToday] = await Promise.all([
    countRequestsForDay(ctx, { userId: args.userId, dayKey }),
    countRequestsForDay(ctx, { dayKey }),
  ]);
  const decision = evaluateXReadBudget({
    priority: args.priority,
    userRequestsToday,
    globalRequestsToday,
    unlimitedAccess: args.unlimitedAccess ?? false,
    ...readCaps(),
  });
  if (!decision.allowed) {
    return {
      allowed: false as const,
      reason: decision.reason,
      message: decision.message,
    };
  }

  const ledgerId = await ctx.db.insert("xReadLedger", {
    userId: args.userId,
    dayKey,
    source: args.source,
    endpoint: args.endpoint.slice(0, 120),
    priority: args.priority,
    requestCount: 1,
    rawResourceCount: 0,
    uniqueResourceCount: 0,
    resourceHashes: [],
    status: "attempted",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return { allowed: true as const, ledgerId };
}

export const recordAttempt = mutation({
  args: {
    sessionToken: v.string(),
    source: sourceValidator,
    endpoint: v.string(),
    priority: priorityValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    return recordAttemptForUser(ctx, {
      userId: user._id,
      isDemo: user.isDemo,
      unlimitedAccess: user.unlimitedAccess ?? false,
      source: args.source,
      endpoint: args.endpoint,
      priority: args.priority,
    });
  },
});

export const recordAttemptForUserInternal = internalMutation({
  args: {
    userId: v.id("users"),
    isDemo: v.boolean(),
    unlimitedAccess: v.optional(v.boolean()),
    source: sourceValidator,
    endpoint: v.string(),
    priority: priorityValidator,
  },
  handler: async (ctx, args) => recordAttemptForUser(ctx, args),
});

export const completeAttempt = mutation({
  args: {
    sessionToken: v.string(),
    ledgerId: v.optional(v.id("xReadLedger")),
    rawResourceCount: v.number(),
    resourceHashes: v.array(v.string()),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    if (!args.ledgerId) return;
    const row = await ctx.db.get(args.ledgerId);
    if (!row || row.userId !== user._id) return;

    const previousRows = await ctx.db
      .query("xReadLedger")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", user._id).eq("dayKey", row.dayKey)
      )
      .collect();
    const seen = new Set<string>();
    for (const previous of previousRows) {
      if (previous._id === args.ledgerId) continue;
      for (const hash of previous.resourceHashes) seen.add(hash);
    }

    const hashes = args.resourceHashes.slice(0, RESOURCE_HASH_LIMIT);
    const uniqueResourceCount = hashes.filter((hash) => !seen.has(hash)).length;
    await ctx.db.patch(args.ledgerId, {
      rawResourceCount: args.rawResourceCount,
      uniqueResourceCount,
      resourceHashes: hashes,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const completeAttemptInternal = internalMutation({
  args: {
    userId: v.id("users"),
    ledgerId: v.optional(v.id("xReadLedger")),
    rawResourceCount: v.number(),
    resourceHashes: v.array(v.string()),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    if (!args.ledgerId) return;
    const row = await ctx.db.get(args.ledgerId);
    if (!row || row.userId !== args.userId) return;

    const previousRows = await ctx.db
      .query("xReadLedger")
      .withIndex("by_user_day", (q) =>
        q.eq("userId", args.userId).eq("dayKey", row.dayKey)
      )
      .collect();
    const seen = new Set<string>();
    for (const previous of previousRows) {
      if (previous._id === args.ledgerId) continue;
      for (const hash of previous.resourceHashes) seen.add(hash);
    }

    const hashes = args.resourceHashes.slice(0, RESOURCE_HASH_LIMIT);
    const uniqueResourceCount = hashes.filter((hash) => !seen.has(hash)).length;
    await ctx.db.patch(args.ledgerId, {
      rawResourceCount: args.rawResourceCount,
      uniqueResourceCount,
      resourceHashes: hashes,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
