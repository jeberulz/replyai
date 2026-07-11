import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireEvalOperator } from "./helpers";

export const start = mutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    maxRetries: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    await requireEvalOperator(ctx, args.sessionToken);
    return await ctx.runMutation(internal.evalRunnerJobs.startOrResume, {
      ...args,
      mode: "start",
    });
  },
});

export const resume = mutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    maxRetries: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    await requireEvalOperator(ctx, args.sessionToken);
    return await ctx.runMutation(internal.evalRunnerJobs.startOrResume, {
      ...args,
      mode: "resume",
    });
  },
});

export const status = query({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
  },
  handler: async (ctx, { sessionToken, experimentId }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const experiment = await ctx.db.get(experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }
    const runs = await ctx.db
      .query("evalRuns")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experimentId))
      .order("desc")
      .take(1);
    const run = runs[0] ?? null;
    const outputs = run
      ? await ctx.db
          .query("evalOutputs")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .take(500)
      : [];
    return {
      experiment,
      run,
      outputCount: outputs.length,
      outputs: outputs.map((output) => ({
        id: output._id,
        caseId: output.caseId,
        candidateCatalogId: output.candidateCatalogId,
        status: output.status,
        retryCount: output.retryCount ?? 0,
        costUsd: output.costUsd ?? 0,
        error: output.error,
        blindKey: output.blindKey,
      })),
    };
  },
});

export const cancel = mutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
  },
  handler: async (ctx, { sessionToken, experimentId }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const experiment = await ctx.db.get(experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }

    const runs = await ctx.db
      .query("evalRuns")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experimentId))
      .order("desc")
      .take(1);
    const run = runs[0] ?? null;
    if (!run) return { cancelled: false, reason: "no_run" };
    if (run.status === "completed" || run.status === "cancelled") {
      return { cancelled: false, reason: run.status };
    }

    const now = Date.now();
    const outputs = await ctx.db
      .query("evalOutputs")
      .withIndex("by_run", (q) => q.eq("runId", run._id))
      .take(500);
    for (const output of outputs) {
      if (output.status === "queued" || output.status === "running") {
        await ctx.db.patch(output._id, {
          status: "excluded",
          error: "run_cancelled",
        });
      }
    }
    const counts = reconcileOutputDocs(outputs.map((output) => output.status));
    counts.queued = 0;
    counts.running = 0;
    counts.excluded = outputs.filter(
      (output) =>
        output.status === "queued" ||
        output.status === "running" ||
        output.status === "excluded"
    ).length;

    await ctx.db.patch(run._id, {
      status: "cancelled",
      counts,
      cancelledAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(experiment._id, { status: "cancelled", updatedAt: now });
    return { cancelled: true, runId: run._id };
  },
});

function reconcileOutputDocs(
  statuses: ReadonlyArray<
    "queued" | "running" | "completed" | "failed" | "excluded"
  >
) {
  const counts = {
    total: statuses.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    excluded: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}
