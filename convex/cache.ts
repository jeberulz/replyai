import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Small JSON cache for expensive external calls (tweet fetches, AI analyses).
 * Keys are content hashes computed by the caller.
 */

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query("cachedResponses")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row || row.expiresAt < Date.now()) return null;
    return row.value;
  },
});

export const put = mutation({
  args: { key: v.string(), value: v.string(), ttlMs: v.number() },
  handler: async (ctx, { key, value, ttlMs }) => {
    const row = await ctx.db
      .query("cachedResponses")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const expiresAt = Date.now() + ttlMs;
    if (row) {
      await ctx.db.patch(row._id, { value, expiresAt });
    } else {
      await ctx.db.insert("cachedResponses", { key, value, expiresAt });
    }
  },
});

export const prune = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("cachedResponses").collect();
    for (const row of rows) {
      if (row.expiresAt < now) await ctx.db.delete(row._id);
    }
  },
});
