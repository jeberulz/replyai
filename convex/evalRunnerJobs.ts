import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireEvalOperator } from "./helpers";
import {
  blindKeyForEvalOutput,
  deterministicEvalRunnerOutput,
  EVAL_RUNNER_LIMITS,
  EVAL_RUNNER_VERSION,
  reconcileEvalRunnerCounts,
  validateEvalRunnerCaps,
  type FrozenEvalCandidateSnapshot,
} from "../shared/evalRunner";

const modeValidator = v.union(v.literal("start"), v.literal("resume"));

export const startOrResume = internalMutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    mode: modeValidator,
    maxRetries: v.optional(v.number()),
    maxToolCalls: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const operator = await requireEvalOperator(ctx, args.sessionToken);
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }
    if (experiment.status === "cancelled") {
      throw new Error("Cannot resume a cancelled experiment");
    }

    const caps = {
      budgetUsd: experiment.budgetUsd,
      concurrency: experiment.concurrency,
      caseLimit: experiment.caseLimit,
      maxRetries: args.maxRetries ?? 2,
      maxToolCalls: args.maxToolCalls ?? EVAL_RUNNER_LIMITS.maxToolCalls,
    };
    const capErrors = validateEvalRunnerCaps(caps);
    if (capErrors.length > 0) {
      throw new Error(`Invalid eval runner caps: ${capErrors.join(", ")}`);
    }

    const existingRuns = await ctx.db
      .query("evalRuns")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
      .order("desc")
      .take(1);
    const existingRun = existingRuns[0] ?? null;
    if (existingRun) {
      if (
        existingRun.status === "queued" ||
        existingRun.status === "running" ||
        existingRun.status === "failed"
      ) {
        await ctx.db.patch(existingRun._id, {
          status: "running",
          updatedAt: Date.now(),
        });
        await ctx.scheduler.runAfter(0, internal.evalRunnerJobs.pump, {
          runId: existingRun._id,
        });
      }
      return await summarizeRun(ctx, existingRun._id);
    }

    const cases = await ctx.db
      .query("evalCases")
      .withIndex("by_dataset_and_ordinal", (q) =>
        q.eq("datasetId", experiment.datasetId)
      )
      .take(caps.caseLimit);
    if (cases.length === 0) throw new Error("Experiment dataset has no cases");

    const now = Date.now();
    const total = cases.length * experiment.candidateSnapshots.length;
    const runId = await ctx.db.insert("evalRuns", {
      userId: operator._id,
      experimentId: experiment._id,
      attempt: 1,
      status: "running",
      counts: {
        total,
        queued: total,
        running: 0,
        completed: 0,
        failed: 0,
        excluded: 0,
      },
      spendUsd: 0,
      runnerVersion: EVAL_RUNNER_VERSION,
      seed: experiment.seed,
      promptVersion: experiment.promptVersion,
      schemaVersion: experiment.schemaVersion,
      budgetUsdCap: caps.budgetUsd,
      concurrency: caps.concurrency,
      caseLimit: cases.length,
      maxRetries: caps.maxRetries,
      maxToolCalls: caps.maxToolCalls,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    for (const evalCase of cases) {
      for (const candidateSnapshot of experiment.candidateSnapshots) {
        const candidate = candidateSnapshot as FrozenEvalCandidateSnapshot;
        await ctx.db.insert("evalOutputs", {
          userId: operator._id,
          experimentId: experiment._id,
          runId,
          caseId: evalCase._id,
          candidateCatalogId: candidate.catalogId,
          blindKey: blindKeyForEvalOutput({
            seed: experiment.seed,
            caseId: evalCase._id,
            candidateCatalogId: candidate.catalogId,
          }),
          kind: experiment.kind,
          status: "queued",
          attempt: 1,
          retryCount: 0,
          seed: experiment.seed,
          inputSnapshotJson: evalCase.snapshotJson,
          candidateSnapshotJson: JSON.stringify(candidate),
          stageSnapshotsJson: JSON.stringify(candidate.stages),
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(experiment._id, {
      status: "running",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.evalRunnerJobs.pump, { runId });
    return await summarizeRun(ctx, runId);
  },
});

export const pump = internalMutation({
  args: { runId: v.id("evalRuns") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error("Run not found");
    if (run.status === "cancelled" || run.status === "completed") {
      return await summarizeRun(ctx, runId);
    }

    const experiment = await ctx.db.get(run.experimentId);
    if (!experiment) throw new Error("Experiment not found");

    const allOutputs = await ctx.db
      .query("evalOutputs")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .take(500);
    const queuedOrRunning = allOutputs.filter(
      (output) => output.status === "queued" || output.status === "running"
    );
    if (queuedOrRunning.length === 0) {
      return await finalizeRun(ctx, runId, experiment._id, allOutputs);
    }

    const now = Date.now();
    let spendUsd = run.spendUsd;
    const concurrency = run.concurrency ?? experiment.concurrency;
    const maxRetries = run.maxRetries ?? 2;
    const maxToolCalls =
      run.maxToolCalls ?? EVAL_RUNNER_LIMITS.maxToolCalls;
    const budgetUsdCap = run.budgetUsdCap ?? experiment.budgetUsd;
    const work = queuedOrRunning.slice(0, concurrency);

    for (const output of work) {
      if (output.status === "queued") {
        await ctx.db.patch(output._id, { status: "running" });
      }
      const inputSnapshotJson = output.inputSnapshotJson;
      const candidateSnapshotJson = output.candidateSnapshotJson;
      if (!inputSnapshotJson || !candidateSnapshotJson) {
        await ctx.db.patch(output._id, {
          status: "failed",
          error: "missing_frozen_runner_snapshot",
          retryCount: maxRetries,
        });
        continue;
      }

      const candidateSnapshot = JSON.parse(
        candidateSnapshotJson
      ) as FrozenEvalCandidateSnapshot;
      const result = deterministicEvalRunnerOutput({
        kind: experiment.kind,
        seed: output.seed ?? experiment.seed,
        inputSnapshotJson,
        candidateSnapshot,
        maxRetries,
        maxToolCalls,
      });
      const projectedSpend = spendUsd + (result.costUsd ?? 0);
      if (result.status === "completed" && projectedSpend > budgetUsdCap) {
        await ctx.db.patch(output._id, {
          status: "excluded",
          error: "budget_cap_exceeded",
          retryCount: result.retryCount,
          costUsd: 0,
        });
        continue;
      }

      spendUsd = projectedSpend;
      const outputPatch: {
        status: "completed" | "failed" | "excluded";
        retryCount: number;
        normalizedOutputJson?: string;
        guardrailJson?: string;
        citationsJson?: string;
        hydrationJson?: string;
        usage?: {
          inputTokens?: number;
          outputTokens?: number;
          reasoningTokens?: number;
          cachedInputTokens?: number;
          toolCallCount?: number;
          successfulToolCallCount?: number;
        };
        latencyMs?: number;
        costUsd?: number;
        error?: string;
      } = {
        status: result.status,
        retryCount: result.retryCount,
      };
      if (result.normalizedOutputJson !== undefined) {
        outputPatch.normalizedOutputJson = result.normalizedOutputJson;
      }
      if (result.guardrailJson !== undefined) {
        outputPatch.guardrailJson = result.guardrailJson;
      }
      if (result.citationsJson !== undefined) {
        outputPatch.citationsJson = result.citationsJson;
      }
      if (result.hydrationJson !== undefined) {
        outputPatch.hydrationJson = result.hydrationJson;
      }
      if (result.usage !== undefined) outputPatch.usage = result.usage;
      if (result.latencyMs !== undefined) outputPatch.latencyMs = result.latencyMs;
      if (result.costUsd !== undefined) outputPatch.costUsd = result.costUsd;
      if (result.error !== undefined) outputPatch.error = result.error;
      await ctx.db.patch(output._id, outputPatch);
    }

    const refreshedOutputs = await ctx.db
      .query("evalOutputs")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .take(500);
    const counts = reconcileEvalRunnerCounts(
      refreshedOutputs.map((output) => output.status)
    );
    const stillOpen = counts.queued + counts.running;
    const runPatch: {
      counts: typeof counts;
      spendUsd: number;
      status: "running" | "completed";
      completedAt?: number;
      updatedAt: number;
    } = {
      counts,
      spendUsd,
      status: stillOpen > 0 ? "running" : "completed",
      updatedAt: now,
    };
    if (stillOpen === 0) runPatch.completedAt = now;
    await ctx.db.patch(runId, runPatch);
    if (stillOpen > 0) {
      await ctx.scheduler.runAfter(0, internal.evalRunnerJobs.pump, { runId });
    } else {
      await ctx.db.patch(experiment._id, {
        status: "completed",
        updatedAt: now,
      });
    }
    return await summarizeRun(ctx, runId);
  },
});

async function finalizeRun(
  ctx: MutationCtx,
  runId: Id<"evalRuns">,
  experimentId: Id<"evalExperiments">,
  outputs: Array<{ status: "queued" | "running" | "completed" | "failed" | "excluded" }>
) {
  const counts = reconcileEvalRunnerCounts(outputs.map((output) => output.status));
  const now = Date.now();
  await ctx.db.patch(runId, {
    counts,
    status: "completed",
    completedAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(experimentId, {
    status: "completed",
    updatedAt: now,
  });
  return await summarizeRun(ctx, runId);
}

async function summarizeRun(ctx: MutationCtx, runId: Id<"evalRuns">) {
  const run = await ctx.db.get(runId);
  if (!run) throw new Error("Run not found");
  return {
    runId,
    status: run.status,
    counts: run.counts,
    spendUsd: run.spendUsd,
  };
}
