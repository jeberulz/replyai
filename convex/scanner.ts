import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";

type EnabledSource = "following" | "lists" | "watched" | "search";

const enabledSourceValidator = v.union(
  v.literal("following"),
  v.literal("lists"),
  v.literal("watched"),
  v.literal("search")
);

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "");
}

export const settings = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    // Preserve the pre-existing null-when-no-row contract (onboarding's
    // ensureDefaults relies on `!settings` to decide whether to create the
    // row) — needsListScope is only meaningful once a row exists anyway.
    if (!row) return null;

    let needsListScope = false;
    if (!user.isDemo) {
      const tokenRow = await ctx.db
        .query("xTokens")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      needsListScope = !!tokenRow && !tokenRow.scope.includes("list.read");
    }

    return { ...row, needsListScope };
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    enabled: v.boolean(),
    keywords: v.array(v.string()),
    engageListIds: v.optional(v.array(v.string())),
    engageListNames: v.optional(v.array(v.string())),
    watchedHandles: v.optional(v.array(v.string())),
    enabledSources: v.optional(v.array(enabledSourceValidator)),
  },
  handler: async (
    ctx,
    {
      sessionToken,
      enabled,
      keywords,
      engageListIds,
      engageListNames,
      watchedHandles,
      enabledSources,
    }
  ) => {
    const user = await requireUser(ctx, sessionToken);

    if (engageListIds && engageListIds.length > 5) {
      throw new Error("You can engage with at most 5 lists.");
    }
    const normalizedHandles = watchedHandles?.map(normalizeHandle);
    if (normalizedHandles && normalizedHandles.length > 50) {
      throw new Error("You can watch at most 50 accounts.");
    }

    const patch = {
      enabled,
      keywords,
      ...(engageListIds !== undefined ? { engageListIds } : {}),
      ...(engageListNames !== undefined ? { engageListNames } : {}),
      ...(normalizedHandles !== undefined
        ? { watchedHandles: normalizedHandles }
        : {}),
      ...(enabledSources !== undefined ? { enabledSources } : {}),
    };

    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, patch);
    } else {
      await ctx.db.insert("scannerSettings", { userId: user._id, ...patch });
    }

    await ctx.scheduler.runAfter(0, internal.opportunities.reconcileIrrelevant, {
      userId: user._id,
      keywords,
    });
  },
});

/** Replace the user's engage-list selection (from the "import from X" picker). */
export const importEngageLists = mutation({
  args: {
    sessionToken: v.string(),
    lists: v.array(v.object({ id: v.string(), name: v.string() })),
  },
  handler: async (ctx, { sessionToken, lists }) => {
    const user = await requireUser(ctx, sessionToken);
    const capped = lists.slice(0, 5);
    const engageListIds = capped.map((l) => l.id);
    const engageListNames = capped.map((l) => l.name);

    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const enabledSources: EnabledSource[] = row?.enabledSources?.length
      ? row.enabledSources.includes("lists")
        ? row.enabledSources
        : [...row.enabledSources, "lists"]
      : ["following", "lists"];
    if (row) {
      await ctx.db.patch(row._id, {
        engageListIds,
        engageListNames,
        enabledSources,
      });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled: false,
        keywords: [],
        engageListIds,
        engageListNames,
        enabledSources,
      });
    }
  },
});

/** Replace the user's watched-handle list (add/remove @handle chips). */
export const updateWatchedHandles = mutation({
  args: { sessionToken: v.string(), handles: v.array(v.string()) },
  handler: async (ctx, { sessionToken, handles }) => {
    const user = await requireUser(ctx, sessionToken);
    const normalized = handles.map(normalizeHandle).filter((h) => h.length > 0);
    if (normalized.length > 50) {
      throw new Error("You can watch at most 50 accounts.");
    }

    const row = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { watchedHandles: normalized });
    } else {
      await ctx.db.insert("scannerSettings", {
        userId: user._id,
        enabled: false,
        keywords: [],
        watchedHandles: normalized,
      });
    }
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
      engageListIds: settingsRow?.engageListIds ?? [],
      engageListNames: settingsRow?.engageListNames ?? [],
      watchedHandles: settingsRow?.watchedHandles ?? [],
      // Untouched users have no enabledSources row yet — default to
      // ["following"] so today's single-source behavior is unchanged.
      enabledSources: (settingsRow?.enabledSources && settingsRow.enabledSources.length > 0
        ? settingsRow.enabledSources
        : ["following"]) as EnabledSource[],
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
