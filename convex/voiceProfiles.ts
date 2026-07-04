import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { voiceStyle } from "./schema";

export const list = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    return await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    style: voiceStyle,
    examples: v.array(v.string()),
    source: v.union(v.literal("manual"), v.literal("trained")),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    const existing = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return await ctx.db.insert("voiceProfiles", {
      userId: user._id,
      ...args,
      isDefault: existing.length === 0,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    profileId: v.id("voiceProfiles"),
    name: v.optional(v.string()),
    style: v.optional(voiceStyle),
    examples: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { sessionToken, profileId, ...patch }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) throw new Error("Not found");
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.style !== undefined) updates.style = patch.style;
    if (patch.examples !== undefined) updates.examples = patch.examples;
    await ctx.db.patch(profileId, updates);
  },
});

export const setDefault = mutation({
  args: { sessionToken: v.string(), profileId: v.id("voiceProfiles") },
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) throw new Error("Not found");
    const all = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of all) {
      if (p.isDefault !== (p._id === profileId)) {
        await ctx.db.patch(p._id, { isDefault: p._id === profileId });
      }
    }
  },
});

export const remove = mutation({
  args: { sessionToken: v.string(), profileId: v.id("voiceProfiles") },
  handler: async (ctx, { sessionToken, profileId }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(profileId);
    if (profile.isDefault) {
      const rest = await ctx.db
        .query("voiceProfiles")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (rest) await ctx.db.patch(rest._id, { isDefault: true });
    }
  },
});
