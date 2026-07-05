import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./helpers";
import { voiceStyle } from "./schema";
import {
  buildVoiceStyleFromTweets,
  mergeVoiceExamples,
} from "../shared/voice";

/**
 * The learning loop: every published reply/quote is text the user approved
 * as their own voice, so fold it into the default profile's examples
 * (newest-first, deduped, capped) — these feed every generation prompt.
 * Trained profiles also get their measured style refreshed from the updated
 * example set; manually-authored styles are left untouched.
 * Called from drafts.markResult at the single point where drafts become
 * "published" (immediate, scheduled, and demo publishes all funnel there).
 */
export async function learnFromSentText(
  ctx: MutationCtx,
  userId: Id<"users">,
  sentText: string
): Promise<void> {
  if (sentText.trim().length === 0) return;
  const profiles = await ctx.db
    .query("voiceProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const profile = profiles.find((p) => p.isDefault) ?? profiles[0];
  if (!profile) return;

  const examples = mergeVoiceExamples(profile.examples, sentText);
  await ctx.db.patch(profile._id, {
    examples,
    ...(profile.source === "trained"
      ? { style: buildVoiceStyleFromTweets(examples) }
      : {}),
  });
}

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
