import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { currentMonth } from "../helpers";
import {
  evaluateFairUse,
  type FairUseAction,
  type FairUseMeter,
  type FairUseStatus,
  utcDayStartMs,
} from "../../shared/fairUse";

export async function loadFairUseMeter(
  ctx: QueryCtx,
  userId: Id<"users">,
  nowMs = Date.now()
): Promise<FairUseMeter> {
  const month = currentMonth(nowMs);
  const usage = await ctx.db
    .query("usage")
    .withIndex("by_user_month", (q) => q.eq("userId", userId).eq("month", month))
    .unique();

  const dayStart = utcDayStartMs(nowMs);
  const recentAnalyses = await ctx.db
    .query("tweetAnalyses")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(40);

  const analysesToday = recentAnalyses.filter(
    (row) => row.createdAt >= dayStart
  ).length;

  return {
    analysesToday,
    analysesThisMonth: usage?.analyses ?? 0,
    generationsThisMonth: usage?.generations ?? 0,
  };
}

export async function getFairUseStatus(
  ctx: QueryCtx,
  user: Doc<"users">,
  action: FairUseAction,
  nowMs = Date.now()
): Promise<FairUseStatus> {
  const usage = await loadFairUseMeter(ctx, user._id, nowMs);
  return evaluateFairUse({
    plan: user.plan,
    isDemo: user.isDemo,
    unlimitedAccess: user.unlimitedAccess,
    usage,
    action,
  });
}

export async function assertFairUseAllowed(
  ctx: QueryCtx,
  user: Doc<"users">,
  action: FairUseAction,
  nowMs = Date.now()
): Promise<FairUseStatus> {
  const status = await getFairUseStatus(ctx, user, action, nowMs);
  if (status.blocked && status.message) {
    throw new Error(status.message);
  }
  return status;
}
