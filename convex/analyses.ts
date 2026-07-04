import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { tweetSnapshot } from "./schema";

async function requireOwnedProject(
  ctx: MutationCtx,
  userId: Id<"users">,
  projectId: Id<"projects">
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.userId !== userId) {
    throw new Error("Project not found");
  }
  return project;
}

export const create = mutation({
  args: {
    sessionToken: v.string(),
    projectId: v.optional(v.id("projects")),
    tweetUrl: v.string(),
    tweetId: v.string(),
    tweet: tweetSnapshot,
    topReplies: v.array(
      v.object({
        authorHandle: v.string(),
        text: v.string(),
        likes: v.number(),
      })
    ),
    summary: v.string(),
    topic: v.string(),
    stance: v.string(),
    existingOpinions: v.array(v.string()),
    missingAngles: v.array(v.string()),
    score: v.object({
      value: v.number(),
      reason: v.string(),
      factors: v.object({
        audienceSize: v.number(),
        topicRelevance: v.number(),
        replyTiming: v.number(),
        growthVelocity: v.number(),
      }),
    }),
    replySettings: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, projectId, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    if (projectId) {
      await requireOwnedProject(ctx, user._id, projectId);
    }
    const opp = await ctx.db
      .query("opportunities")
      .withIndex("by_user_tweet", (q) =>
        q.eq("userId", user._id).eq("tweetId", args.tweetId)
      )
      .unique();
    if (opp && opp.status === "new") {
      await ctx.db.patch(opp._id, { status: "analyzed" });
    }
    const analysisId = await ctx.db.insert("tweetAnalyses", {
      userId: user._id,
      projectId,
      ...args,
      createdAt: Date.now(),
    });
    if (projectId) {
      await ctx.db.patch(projectId, { updatedAt: Date.now() });
    }
    return analysisId;
  },
});

export const get = query({
  args: { sessionToken: v.string(), analysisId: v.id("tweetAnalyses") },
  handler: async (ctx, { sessionToken, analysisId }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) return null;
    return analysis;
  },
});

export const listRecent = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    projectId: v.optional(v.id("projects")),
    since: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, limit, projectId, since }) => {
    const user = await requireUser(ctx, sessionToken);
    const takeCount = limit ?? 30;

    let rows;
    if (projectId) {
      rows = await ctx.db
        .query("tweetAnalyses")
        .withIndex("by_user_project", (q) =>
          q.eq("userId", user._id).eq("projectId", projectId)
        )
        .order("desc")
        .take(takeCount * 2);
    } else {
      rows = await ctx.db
        .query("tweetAnalyses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(takeCount * 2);
    }

    const filtered = since
      ? rows.filter((row) => row.createdAt >= since)
      : rows;

    return filtered.slice(0, takeCount);
  },
});

export const search = query({
  args: {
    sessionToken: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, query: searchQuery, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const rows = await ctx.db
      .query("tweetAnalyses")
      .withIndex("by_user", (qIndex) => qIndex.eq("userId", user._id))
      .order("desc")
      .take(100);

    const matches = rows.filter((row) => {
      const haystack = [
        row.tweet.text,
        row.tweet.authorHandle,
        row.topic,
        row.summary,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return matches.slice(0, limit ?? 8);
  },
});

export const setProject = mutation({
  args: {
    sessionToken: v.string(),
    analysisId: v.id("tweetAnalyses"),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, { sessionToken, analysisId, projectId }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) {
      throw new Error("Analysis not found");
    }
    if (projectId) {
      await requireOwnedProject(ctx, user._id, projectId);
      await ctx.db.patch(projectId, { updatedAt: Date.now() });
    }
    await ctx.db.patch(analysisId, { projectId });
  },
});
