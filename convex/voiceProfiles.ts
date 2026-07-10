import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./helpers";
import { voiceStyle } from "./schema";
import {
  buildVoiceNegativeConstraints,
  buildVoiceStyleFromTweets,
  mergeVoiceExamples,
  normalizeNegativeConstraints,
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
  const style =
    profile.source === "trained" ? buildVoiceStyleFromTweets(examples) : profile.style;
  const existingConstraints = normalizeNegativeConstraints({
    bannedPhrases: profile.bannedPhrases,
    antiPatterns: profile.antiPatterns,
  });
  await ctx.db.patch(profile._id, {
    examples,
    ...(profile.source === "trained" ? { style } : {}),
    ...(existingConstraints.bannedPhrases.length === 0 &&
    existingConstraints.antiPatterns.length === 0
      ? buildVoiceNegativeConstraints(examples, style)
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
    bannedPhrases: v.optional(v.array(v.string())),
    antiPatterns: v.optional(v.array(v.string())),
    source: v.union(v.literal("manual"), v.literal("trained")),
    purpose: v.optional(
      v.union(
        v.literal("starter"),
        v.literal("onboarding"),
        v.literal("manual")
      )
    ),
    sourceFingerprint: v.optional(v.string()),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    const existing = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let constraints = normalizeNegativeConstraints({
      bannedPhrases: args.bannedPhrases,
      antiPatterns: args.antiPatterns,
    });
    if (
      constraints.bannedPhrases.length === 0 &&
      constraints.antiPatterns.length === 0
    ) {
      constraints = buildVoiceNegativeConstraints(args.examples, args.style);
    }
    return await ctx.db.insert("voiceProfiles", {
      userId: user._id,
      ...args,
      ...constraints,
      isDefault: existing.length === 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const upsertOnboardingProfile = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    style: voiceStyle,
    examples: v.array(v.string()),
    bannedPhrases: v.optional(v.array(v.string())),
    antiPatterns: v.optional(v.array(v.string())),
    sourceFingerprint: v.string(),
  },
  handler: async (ctx, { sessionToken, ...args }) => {
    const user = await requireUser(ctx, sessionToken);
    const now = Date.now();
    const all = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const target =
      all.find((profile) => profile.purpose === "onboarding") ??
      all.find((profile) => profile.isDefault && profile.source === "trained") ??
      all.find((profile) => profile.source === "trained");

    let constraints = normalizeNegativeConstraints({
      bannedPhrases: args.bannedPhrases,
      antiPatterns: args.antiPatterns,
    });
    if (
      constraints.bannedPhrases.length === 0 &&
      constraints.antiPatterns.length === 0
    ) {
      constraints = buildVoiceNegativeConstraints(args.examples, args.style);
    }

    if (target) {
      await ctx.db.patch(target._id, {
        name: args.name,
        style: args.style,
        examples: args.examples,
        ...constraints,
        source: "trained",
        purpose: "onboarding",
        sourceFingerprint: args.sourceFingerprint,
        isDefault: true,
        updatedAt: now,
      });
      for (const profile of all) {
        if (profile._id !== target._id && profile.isDefault) {
          await ctx.db.patch(profile._id, { isDefault: false, updatedAt: now });
        }
      }
      return target._id;
    }

    const profileId = await ctx.db.insert("voiceProfiles", {
      userId: user._id,
      name: args.name,
      style: args.style,
      examples: args.examples,
      ...constraints,
      source: "trained",
      purpose: "onboarding",
      sourceFingerprint: args.sourceFingerprint,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
    for (const profile of all) {
      if (profile.isDefault) {
        await ctx.db.patch(profile._id, { isDefault: false, updatedAt: now });
      }
    }
    return profileId;
  },
});

export const update = mutation({
  args: {
    sessionToken: v.string(),
    profileId: v.id("voiceProfiles"),
    name: v.optional(v.string()),
    style: v.optional(voiceStyle),
    examples: v.optional(v.array(v.string())),
    bannedPhrases: v.optional(v.array(v.string())),
    antiPatterns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { sessionToken, profileId, ...patch }) => {
    const user = await requireUser(ctx, sessionToken);
    const profile = await ctx.db.get(profileId);
    if (!profile || profile.userId !== user._id) throw new Error("Not found");
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.style !== undefined) updates.style = patch.style;
    if (patch.examples !== undefined) updates.examples = patch.examples;
    if (patch.bannedPhrases !== undefined) {
      updates.bannedPhrases = normalizeNegativeConstraints({
        bannedPhrases: patch.bannedPhrases,
      }).bannedPhrases;
    }
    if (patch.antiPatterns !== undefined) {
      updates.antiPatterns = normalizeNegativeConstraints({
        antiPatterns: patch.antiPatterns,
      }).antiPatterns;
    }
    updates.updatedAt = Date.now();
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
        await ctx.db.patch(p._id, {
          isDefault: p._id === profileId,
          updatedAt: Date.now(),
        });
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
