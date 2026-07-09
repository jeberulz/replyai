import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import {
  aggregateVariantComparison,
  demoVariantComparison,
  formatVariantComparisonCopy,
  isVariantLabel,
  nextVariantLabel,
  VARIANT_COMPARE_WINDOW_HOURS,
  type VariantDraftInput,
  type VariantLabel,
  type VariantTrackerInput,
} from "../shared/variantCompare";

const variantLabelValidator = v.union(
  v.literal("A"),
  v.literal("B"),
  v.literal("C")
);

const observedStatsValidator = v.object({
  label: variantLabelValidator,
  draftCount: v.number(),
  publishedCount: v.number(),
  respondedCount: v.number(),
  expiredCount: v.number(),
  noOrMinorEditCount: v.number(),
  editBucketKnownCount: v.number(),
});

const comparisonValidator = v.object({
  groupId: v.id("variantGroups"),
  analysisId: v.optional(v.id("tweetAnalyses")),
  category: v.string(),
  windowHours: v.number(),
  hasPublished: v.boolean(),
  variants: v.array(observedStatsValidator),
  copy: v.string(),
  nextLabel: v.union(variantLabelValidator, v.null()),
  source: v.union(v.literal("observed"), v.literal("demo")),
});

async function resolveCategory(
  ctx: QueryCtx | MutationCtx,
  draft: Doc<"savedDrafts">,
  categoryArg?: string
): Promise<string> {
  if (categoryArg?.trim()) return categoryArg.trim().toLowerCase();
  if (draft.replyId) {
    const reply = await ctx.db.get(draft.replyId);
    if (reply?.category) return reply.category.trim().toLowerCase();
  }
  return "uncategorized";
}

async function findGroup(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  analysisId: Id<"tweetAnalyses"> | undefined,
  category: string
) {
  if (!analysisId) {
    return null;
  }
  return await ctx.db
    .query("variantGroups")
    .withIndex("by_user_analysis_category", (q) =>
      q.eq("userId", userId).eq("analysisId", analysisId).eq("category", category)
    )
    .unique();
}

async function draftsForGroup(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"variantGroups">
) {
  return await ctx.db
    .query("savedDrafts")
    .withIndex("by_variant_group", (q) => q.eq("variantGroupId", groupId))
    .collect();
}

async function trackersForDrafts(
  ctx: QueryCtx | MutationCtx,
  drafts: Doc<"savedDrafts">[]
): Promise<VariantTrackerInput[]> {
  const trackers: VariantTrackerInput[] = [];
  for (const draft of drafts) {
    const rows = await ctx.db
      .query("replyOutcomeTrackers")
      .withIndex("by_draft", (q) => q.eq("draftId", draft._id))
      .collect();
    for (const row of rows) {
      trackers.push({ draftId: draft._id, status: row.status });
    }
  }
  return trackers;
}

function toDraftInputs(drafts: Doc<"savedDrafts">[]): VariantDraftInput[] {
  return drafts
    .filter(
      (d): d is Doc<"savedDrafts"> & { variantLabel: VariantLabel } =>
        Boolean(d.variantLabel && isVariantLabel(d.variantLabel))
    )
    .map((d) => ({
      id: d._id,
      variantLabel: d.variantLabel,
      status: d.status,
      publishedAt: d.publishedAt,
      editBucket: d.editBucket,
    }));
}

async function buildComparison(
  ctx: QueryCtx | MutationCtx,
  group: Doc<"variantGroups">,
  isDemo: boolean
) {
  const drafts = await draftsForGroup(ctx, group._id);
  const trackers = await trackersForDrafts(ctx, drafts);
  const draftInputs = toDraftInputs(drafts);
  const usedLabels = draftInputs.map((d) => d.variantLabel);

  // Demo with no real outcome rows yet: show deterministic fixture counts
  // so the compare UI never breaks without keys / trackers.
  const hasAnyTracker = trackers.length > 0;
  if (isDemo && !hasAnyTracker && draftInputs.some((d) => d.status === "published")) {
    const demo = demoVariantComparison();
    return {
      groupId: group._id,
      analysisId: group.analysisId,
      category: group.category,
      windowHours: group.windowHours,
      hasPublished: demo.hasPublished,
      variants: demo.variants,
      copy: formatVariantComparisonCopy(demo),
      nextLabel: nextVariantLabel(usedLabels),
      source: "demo" as const,
    };
  }

  const comparison = aggregateVariantComparison({
    drafts: draftInputs,
    trackers,
    windowHours: group.windowHours,
  });

  return {
    groupId: group._id,
    analysisId: group.analysisId,
    category: group.category,
    windowHours: comparison.windowHours,
    hasPublished: comparison.hasPublished,
    variants: comparison.variants,
    copy: formatVariantComparisonCopy(comparison),
    nextLabel: nextVariantLabel(usedLabels),
    source: "observed" as const,
  };
}

/**
 * Create or reuse a variant group for (user, analysis, category) and attach
 * this draft as the next free label (A→B→C). Max 3. No auto-publish.
 */
export const trackDraft = mutation({
  args: {
    sessionToken: v.string(),
    draftId: v.id("savedDrafts"),
    category: v.optional(v.string()),
  },
  returns: v.object({
    groupId: v.id("variantGroups"),
    variantLabel: variantLabelValidator,
    created: v.boolean(),
  }),
  handler: async (ctx, { sessionToken, draftId, category }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id) {
      throw new Error("Draft not found");
    }

    if (draft.variantGroupId && draft.variantLabel) {
      return {
        groupId: draft.variantGroupId,
        variantLabel: draft.variantLabel,
        created: false,
      };
    }

    const resolvedCategory = await resolveCategory(ctx, draft, category);
    const analysisId = draft.analysisId;
    if (!analysisId) {
      throw new Error("Variants require a draft linked to an analysis");
    }

    let group = await findGroup(ctx, user._id, analysisId, resolvedCategory);
    let created = false;
    if (!group) {
      const groupId = await ctx.db.insert("variantGroups", {
        userId: user._id,
        analysisId,
        category: resolvedCategory,
        windowHours: VARIANT_COMPARE_WINDOW_HOURS,
        createdAt: Date.now(),
      });
      group = (await ctx.db.get(groupId))!;
      created = true;
    }

    const siblings = await draftsForGroup(ctx, group._id);
    const used = siblings
      .map((d) => d.variantLabel)
      .filter((l): l is VariantLabel => Boolean(l && isVariantLabel(l)));
    const label = nextVariantLabel(used);
    if (!label) {
      throw new Error("This comparison already has variants A, B, and C");
    }

    await ctx.db.patch(draftId, {
      variantGroupId: group._id,
      variantLabel: label,
    });

    return { groupId: group._id, variantLabel: label, created };
  },
});

/** Observed-count comparison for a variant group. Never invents predictions. */
export const getComparison = query({
  args: {
    sessionToken: v.string(),
    groupId: v.id("variantGroups"),
  },
  returns: v.union(comparisonValidator, v.null()),
  handler: async (ctx, { sessionToken, groupId }) => {
    const user = await requireUser(ctx, sessionToken);
    const group = await ctx.db.get(groupId);
    if (!group || group.userId !== user._id) return null;
    return await buildComparison(ctx, group, user.isDemo);
  },
});

export const getComparisonForDraft = query({
  args: {
    sessionToken: v.string(),
    draftId: v.id("savedDrafts"),
  },
  returns: v.union(comparisonValidator, v.null()),
  handler: async (ctx, { sessionToken, draftId }) => {
    const user = await requireUser(ctx, sessionToken);
    const draft = await ctx.db.get(draftId);
    if (!draft || draft.userId !== user._id || !draft.variantGroupId) {
      return null;
    }
    const group = await ctx.db.get(draft.variantGroupId);
    if (!group || group.userId !== user._id) return null;
    return await buildComparison(ctx, group, user.isDemo);
  },
});

/**
 * Soft nudge after publishing variant A on an analysis: suggest tracking /
 * generating B when the group has room. Never blocks publish.
 */
export const suggestFollowUp = query({
  args: {
    sessionToken: v.string(),
    analysisId: v.id("tweetAnalyses"),
    category: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      groupId: v.id("variantGroups"),
      category: v.string(),
      publishedLabel: variantLabelValidator,
      nextLabel: variantLabelValidator,
      copy: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { sessionToken, analysisId, category }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) return null;

    const cat = category?.trim().toLowerCase();
    const groups = await ctx.db
      .query("variantGroups")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const candidates = groups.filter(
      (g) =>
        g.analysisId === analysisId && (!cat || g.category === cat)
    );

    for (const group of candidates) {
      const comparison = await buildComparison(ctx, group, user.isDemo);
      if (!comparison.nextLabel) continue;
      const published = comparison.variants.find((v) => v.publishedCount > 0);
      if (!published) continue;
      return {
        groupId: group._id,
        category: group.category,
        publishedLabel: published.label,
        nextLabel: comparison.nextLabel,
        copy: comparison.copy,
      };
    }
    return null;
  },
});
