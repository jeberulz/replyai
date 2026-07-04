import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";

export const settings = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return row ?? null;
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, { sessionToken, enabled, keywords }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { enabled, keywords });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled,
        keywords,
      });
    }

    await ctx.scheduler.runAfter(0, internal.opportunities.reconcileIrrelevant, {
      userId: user._id,
      keywords,
    });
  },
});

/** Run a scan for the current user right now (explicit button click). */
export const scanNow = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    await ctx.scheduler.runAfter(0, internal.scannerActions.scanUser, {
      userId: user._id,
    });
  },
});

export const enabledSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scannerSettings").collect();
    return all.filter((s) => s.enabled).map((s) => ({ userId: s.userId }));
  },
});

export const scanContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const settingsRow = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const tokenRow = await ctx.db
      .query("xTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      xUserId: user.xUserId,
      isDemo: user.isDemo,
      keywords: settingsRow?.keywords ?? [],
      accessToken: tokenRow?.accessToken ?? null,
      refreshToken: tokenRow?.refreshToken ?? null,
      expiresAt: tokenRow?.expiresAt ?? 0,
      scope: tokenRow?.scope ?? "",
    };
  },
});

export const recordScanResult = internalMutation({
  args: {
    userId: v.id("users"),
    resultCount: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { userId, resultCount, error }) => {
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, {
      lastScanAt: Date.now(),
      lastScanCount: resultCount,
      lastScanError: error,
    });
  },
});
