import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

const MAX_NAME_LENGTH = 80;

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Project name is required");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Project name must be ${MAX_NAME_LENGTH} characters or less`);
  }
  return trimmed;
}

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), name: v.string() },
  handler: async (ctx, { sessionToken, name }) => {
    const user = await requireUser(ctx, sessionToken);
    const now = Date.now();
    return await ctx.db.insert("projects", {
      userId: user._id,
      name: normalizeName(name),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: {
    sessionToken: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, { sessionToken, projectId, name }) => {
    const user = await requireUser(ctx, sessionToken);
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(projectId, {
      name: normalizeName(name),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), projectId: v.id("projects") },
  handler: async (ctx, { sessionToken, projectId }) => {
    const user = await requireUser(ctx, sessionToken);
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== user._id) {
      throw new Error("Project not found");
    }

    const analyses = await ctx.db
      .query("tweetAnalyses")
      .withIndex("by_user_project", (q) =>
        q.eq("userId", user._id).eq("projectId", projectId)
      )
      .collect();

    for (const analysis of analyses) {
      await ctx.db.patch(analysis._id, { projectId: undefined });
    }

    await ctx.db.delete(projectId);
  },
});
