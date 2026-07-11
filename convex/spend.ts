import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./helpers";
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
      : process.env.AI_GENERATION_HOURLY_LIMIT;
  return parseOptionalPositiveInt(value);
}

export const recordAiSpendAttempt = mutation({
  args: {
    sessionToken: v.string(),
    kind: v.union(v.literal("analysis"), v.literal("generation")),
    source: v.string(),
  },
  returns: v.union(
    v.object({ allowed: v.literal(true) }),
    v.object({ allowed: v.literal(false), message: v.string() })
  ),
  handler: async (ctx, { sessionToken, kind, source }) => {
    const user = await requireUser(ctx, sessionToken);
    if (user.isDemo) {
      return { allowed: true as const };
    }

    const hourKey = aiSpendHourKey();
    const limit = hourlyLimitFor(kind);
    const rows = await ctx.db
      .query("aiSpendLedger")
      .withIndex("by_user_hour_kind", (q) =>
        q.eq("userId", user._id).eq("hourKey", hourKey).eq("kind", kind)
      )
      .take(Math.min((limit ?? SPEND_CHECK_SCAN_LIMIT) + 1, SPEND_CHECK_SCAN_LIMIT));
    const decision = evaluateAiSpendLimit({
      kind,
      usedThisHour: rows.length,
      hourlyLimit: limit,
      killSwitch: process.env.AI_SPEND_KILL_SWITCH === "true",
      limitsRequired: process.env.AI_SPEND_LIMITS_REQUIRED !== "false",
      unlimitedAccess: user.unlimitedAccess ?? false,
    });

    if (!decision.allowed) {
      return {
        allowed: false as const,
        message: decision.message ?? "AI generation is temporarily unavailable.",
      };
    }

    await ctx.db.insert("aiSpendLedger", {
      userId: user._id,
      kind,
      source: source.slice(0, 80),
      hourKey,
      createdAt: Date.now(),
    });

    return { allowed: true as const };
  },
});
