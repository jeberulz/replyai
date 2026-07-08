import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";
import { measureObservedEdit } from "../shared/editDistance";

export const insertMany = mutation({
  args: {
    sessionToken: v.string(),
    analysisId: v.id("tweetAnalyses"),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    // Which Claude model generated these options.
    model: v.optional(v.string()),
    options: v.array(
      v.object({
        kind: v.union(v.literal("reply"), v.literal("quote")),
        category: v.string(),
        content: v.string(),
        reason: v.string(),
      })
    ),
  },
  handler: async (
    ctx,
    { sessionToken, analysisId, voiceProfileId, model, options }
  ) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) throw new Error("Not found");
    const now = Date.now();
    const ids = [];
    for (const option of options) {
      ids.push(
        await ctx.db.insert("generatedReplies", {
          analysisId,
          userId: user._id,
          voiceProfileId,
          model,
          ...option,
          baselineContent: option.content,
          editDistanceNormalized: 0,
          editBucket: "no_edit",
          createdAt: now,
        })
      );
    }
    return ids;
  },
});

export const listByAnalysis = query({
  args: { sessionToken: v.string(), analysisId: v.id("tweetAnalyses") },
  handler: async (ctx, { sessionToken, analysisId }) => {
    const user = await requireUser(ctx, sessionToken);
    const analysis = await ctx.db.get(analysisId);
    if (!analysis || analysis.userId !== user._id) return [];
    return await ctx.db
      .query("generatedReplies")
      .withIndex("by_analysis", (q) => q.eq("analysisId", analysisId))
      .collect();
  },
});

export const updateContent = mutation({
  args: {
    sessionToken: v.string(),
    replyId: v.id("generatedReplies"),
    content: v.string(),
    // AI rewrites keep editedBeforeSend false — only manual edits count
    // against the "used with no edits" north-star metric.
    markEdited: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionToken, replyId, content, markEdited }) => {
    const user = await requireUser(ctx, sessionToken);
    const reply = await ctx.db.get(replyId);
    if (!reply || reply.userId !== user._id) throw new Error("Not found");
    if (markEdited === false) {
      await ctx.db.patch(replyId, {
        content,
        baselineContent: content,
        editedBeforeSend: false,
        editDistanceNormalized: 0,
        editBucket: "no_edit",
      });
      return;
    }

    const baseline = reply.baselineContent ?? reply.content;
    const observedEdit = measureObservedEdit(baseline, content);
    await ctx.db.patch(replyId, {
      content,
      editedBeforeSend: (markEdited ?? true) ? true : reply.editedBeforeSend,
      editDistanceNormalized: observedEdit.normalizedEditDistance,
      editBucket: observedEdit.bucket,
    });
  },
});
