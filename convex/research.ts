import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

const MAX_RUNS_PER_DAY = 3;

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function startOfUtcDay(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

async function runsToday(ctx: QueryCtx, userId: Id<"users">): Promise<number> {
  const since = startOfUtcDay();
  const runs = await ctx.db
    .query("researchRuns")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .collect();
  return runs.filter((r) => r.createdAt >= since).length;
}

export const listProfiles = query({
  args: {
    sessionToken: v.string(),
    runId: v.optional(v.id("researchRuns")),
    status: v.optional(
      v.union(v.literal("suggested"), v.literal("watching"), v.literal("passed"))
    ),
  },
  handler: async (ctx, { sessionToken, runId, status }) => {
    const user = await requireUser(ctx, sessionToken);
    if (runId) {
      const run = await ctx.db.get(runId);
      if (!run || run.userId !== user._id) return [];
      return await ctx.db
        .query("researchProfiles")
        .withIndex("by_run", (q) => q.eq("runId", runId))
        .collect()
        .then((rows) =>
          rows
            .filter((r) => (status ? r.status === status : true))
            .sort((a, b) => b.score - a.score)
        );
    }

    const targetStatus = status ?? "suggested";
    return await ctx.db
      .query("researchProfiles")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", targetStatus)
      )
      .collect()
      .then((rows) => rows.sort((a, b) => b.score - a.score));
  },
});

export const latestRun = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const runs = await ctx.db
      .query("researchRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .collect();
    if (runs.length === 0) return null;
    return runs.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});

export const runStatus = query({
  args: { sessionToken: v.string(), runId: v.id("researchRuns") },
  handler: async (ctx, { sessionToken, runId }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) return null;
    return run;
  },
});

export const remainingRunsToday = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const used = await runsToday(ctx, user._id);
    return Math.max(0, MAX_RUNS_PER_DAY - used);
  },
});

export const startRun = mutation({
  args: {
    sessionToken: v.string(),
    query: v.string(),
    seedHandle: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, query: researchQuery, seedHandle }) => {
    const user = await requireUser(ctx, sessionToken);
    const trimmed = researchQuery.trim();
    if (trimmed.length < 3) {
      throw new Error("Describe who you want to find in at least a few words.");
    }

    const used = await runsToday(ctx, user._id);
    if (used >= MAX_RUNS_PER_DAY) {
      throw new Error("Research limit reached — 3 runs per day. Try again tomorrow.");
    }

    const running = await ctx.db
      .query("researchRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (running.some((r) => r.status === "running")) {
      throw new Error("A research run is already in progress.");
    }

    const seedHandles = seedHandle
      ? [normalizeHandle(seedHandle)]
      : [];

    const runId = await ctx.db.insert("researchRuns", {
      userId: user._id,
      query: trimmed,
      seedHandles,
      resultCount: 0,
      status: "running",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.researchActions.runResearch, {
      userId: user._id,
      runId,
      query: trimmed,
      seedHandle: seedHandles[0],
    });

    return runId;
  },
});

export const watchProfile = mutation({
  args: { sessionToken: v.string(), profileId: v.id("researchProfiles") },
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) {
      throw new Error("Profile not found");
    }

    const handle = normalizeHandle(profile.handle);
    const settings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const watched = settings?.watchedHandles ?? [];
    const nextHandles = watched.some((h) => h.toLowerCase() === handle)
      ? watched
      : [...watched, handle].slice(0, 50);

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

    await ctx.db.patch(profileId, { status: "watching" });
  },
});

export const passProfile = mutation({
  args: { sessionToken: v.string(), profileId: v.id("researchProfiles") },
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) {
      throw new Error("Profile not found");
    }
    await ctx.db.patch(profileId, { status: "passed" });
  },
});

export const saveRunResults = internalMutation({
  args: {
    runId: v.id("researchRuns"),
    userId: v.id("users"),
    profiles: v.array(
      v.object({
        xUserId: v.optional(v.string()),
        handle: v.string(),
        displayName: v.string(),
        bio: v.optional(v.string()),
        followers: v.number(),
        avgLikes: v.number(),
        postFrequency: v.optional(v.string()),
        topicTags: v.array(v.string()),
        score: v.number(),
        reason: v.string(),
        exampleTweets: v.array(
          v.object({
            tweetId: v.string(),
            text: v.string(),
            likes: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { runId, userId, profiles }) => {
    const now = Date.now();
    for (const p of profiles) {
      const handle = normalizeHandle(p.handle);
      const existing = await ctx.db
        .query("researchProfiles")
        .withIndex("by_user_handle", (q) =>
          q.eq("userId", userId).eq("handle", handle)
        )
        .unique();

      if (existing && existing.status === "watching") {
        continue;
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          runId,
          xUserId: p.xUserId,
          displayName: p.displayName,
          bio: p.bio,
          followers: p.followers,
          avgLikes: p.avgLikes,
          postFrequency: p.postFrequency,
          topicTags: p.topicTags,
          score: p.score,
          reason: p.reason,
          exampleTweets: p.exampleTweets,
          status: existing.status === "passed" ? "passed" : "suggested",
          discoveredAt: now,
        });
      } else {
        await ctx.db.insert("researchProfiles", {
          userId,
          runId,
          xUserId: p.xUserId,
          handle,
          displayName: p.displayName,
          bio: p.bio,
          followers: p.followers,
          avgLikes: p.avgLikes,
          postFrequency: p.postFrequency,
          topicTags: p.topicTags,
          score: p.score,
          reason: p.reason,
          exampleTweets: p.exampleTweets,
          status: "suggested",
          discoveredAt: now,
        });
      }
    }

    await ctx.db.patch(runId, {
      status: "complete",
      resultCount: profiles.length,
    });
  },
});

export const markRunFailed = internalMutation({
  args: {
    runId: v.id("researchRuns"),
    error: v.string(),
  },
  handler: async (ctx, { runId, error }) => {
    await ctx.db.patch(runId, { status: "failed", error, resultCount: 0 });
  },
});
