import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Update stored X OAuth tokens after a refresh. Called from publish action only. */
export const updateXTokens = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenRow = await ctx.db
      .query("xTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!tokenRow) return;

    await ctx.db.patch(tokenRow._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? tokenRow.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope || tokenRow.scope,
    });
  },
});
