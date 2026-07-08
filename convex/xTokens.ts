import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { encryptedXTokenPatch } from "./tokenSecurity";

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
      ...(await encryptedXTokenPatch({
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        existingRefreshToken: tokenRow.refreshToken,
        existingEncryptedRefreshToken: tokenRow.encryptedRefreshToken,
      })),
      expiresAt: args.expiresAt,
      scope: args.scope || tokenRow.scope,
    });
  },
});
