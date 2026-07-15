import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireEvalOperator } from "./helpers";
import {
  buildEvalResultsSummary,
  buildRedactedEvalExport,
  type EvalResultsCaseInput,
  type EvalResultsDecisionInput,
  type EvalResultsJudgmentInput,
  type EvalResultsOutputInput,
} from "../shared/evalResults";

const evalDecisionValidator = v.union(
  v.literal("promote_to_shadow"),
  v.literal("promote_to_assisted"),
  v.literal("retest"),
  v.literal("reject")
);

const exportFormatValidator = v.union(v.literal("json"), v.literal("csv"));

export const get = query({
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
    const { run, cases, outputs, judgments, decisions } =
      await loadResultsEvidence(ctx, experiment);
    return {
      experiment: {
        _id: experiment._id,
        name: experiment.name,
        kind: experiment.kind,
        status: experiment.status,
        datasetId: experiment.datasetId,
        candidateCatalogIds: experiment.candidateCatalogIds,
        promptVersion: experiment.promptVersion,
        schemaVersion: experiment.schemaVersion,
        seed: experiment.seed,
        caseLimit: experiment.caseLimit,
        createdAt: experiment.createdAt,
        updatedAt: experiment.updatedAt,
      },
      run: run
        ? {
            _id: run._id,
            status: run.status,
            counts: run.counts,
            spendUsd: run.spendUsd,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            error: run.error,
          }
        : null,
      summary: buildEvalResultsSummary({
        kind: experiment.kind,
        runId: run?._id ?? null,
        cases,
        outputs,
        judgments,
        decisions,
      }),
    };
  },
});

export const exportRedacted = query({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    format: exportFormatValidator,
  },
  handler: async (ctx, { sessionToken, experimentId, format }) => {
    const operator = await requireEvalOperator(ctx, sessionToken);
    const experiment = await ctx.db.get(experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }
    const { run, cases, outputs, judgments, decisions } =
      await loadResultsEvidence(ctx, experiment);
    const summary = buildEvalResultsSummary({
      kind: experiment.kind,
      runId: run?._id ?? null,
      cases,
      outputs,
      judgments,
      decisions,
    });
    const extension = format === "json" ? "json" : "csv";
    return {
      fileName: `replypilot-eval-${experiment._id}-redacted.${extension}`,
      contentType: format === "json" ? "application/json" : "text/csv",
      body: buildRedactedEvalExport(summary, format),
    };
  },
});

export const decide = mutation({
  args: {
    sessionToken: v.string(),
    experimentId: v.id("evalExperiments"),
    runId: v.optional(v.id("evalRuns")),
    decision: evalDecisionValidator,
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const operator = await requireEvalOperator(ctx, args.sessionToken);
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment || experiment.userId !== operator._id) {
      throw new Error("Not found");
    }
    const rationale = args.rationale.trim();
    if (rationale.length < 8) {
      throw new Error("Decision rationale must explain the evidence.");
    }
    const { run, cases, outputs, judgments, decisions } =
      await loadResultsEvidence(ctx, experiment);
    if (args.runId && (!run || run._id !== args.runId)) {
      throw new Error("Decision run does not match latest experiment run.");
    }
    const summary = buildEvalResultsSummary({
      kind: experiment.kind,
      runId: run?._id ?? null,
      cases,
      outputs,
      judgments,
      decisions,
    });
    const now = Date.now();
    const decisionId = await ctx.db.insert("evalDecisions", {
      userId: operator._id,
      experimentId: experiment._id,
      runId: run?._id,
      decision: args.decision,
      rationale,
      sampleSize: summary.sampleSize,
      evidenceHash: summary.evidenceHash,
      createdByUserId: operator._id,
      createdAt: now,
    });
    return {
      decisionId,
      sampleSize: summary.sampleSize,
      evidenceHash: summary.evidenceHash,
    };
  },
});

async function loadResultsEvidence(
  ctx: QueryCtx | MutationCtx,
  experiment: Doc<"evalExperiments">
) {
  const runs = await ctx.db
    .query("evalRuns")
    .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
    .order("desc")
    .take(1);
  const run = runs[0] ?? null;
  const [cases, outputs, judgments, decisions] = await Promise.all([
    ctx.db
      .query("evalCases")
      .withIndex("by_dataset_and_ordinal", (q) =>
        q.eq("datasetId", experiment.datasetId)
      )
      .take(experiment.caseLimit),
    run
      ? ctx.db
          .query("evalOutputs")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .take(500)
      : Promise.resolve([]),
    run
      ? ctx.db
          .query("evalJudgments")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .take(500)
      : Promise.resolve([]),
    ctx.db
      .query("evalDecisions")
      .withIndex("by_experiment", (q) =>
        q.eq("experimentId", experiment._id)
      )
      .order("desc")
      .take(50),
  ]);
  return {
    run,
    cases: cases.map(toResultsCase),
    outputs: outputs.map(toResultsOutput),
    judgments: judgments.map(toResultsJudgment),
    decisions: decisions.map(toResultsDecision),
  };
}

function toResultsCase(evalCase: Doc<"evalCases">): EvalResultsCaseInput {
  return {
    id: evalCase._id,
    ordinal: evalCase.ordinal,
    caseHash: evalCase.caseHash,
    strataLabels: evalCase.strataLabels,
  };
}

function toResultsOutput(output: Doc<"evalOutputs">): EvalResultsOutputInput {
  return {
    id: output._id,
    caseId: output.caseId,
    candidateCatalogId: output.candidateCatalogId,
    blindKey: output.blindKey,
    kind: output.kind,
    status: output.status,
    candidateSnapshotJson: output.candidateSnapshotJson,
    normalizedOutputJson: output.normalizedOutputJson,
    error: output.error,
    costUsd: output.costUsd,
    latencyMs: output.latencyMs,
    usage: output.usage,
  };
}

function toResultsJudgment(
  judgment: Doc<"evalJudgments">
): EvalResultsJudgmentInput {
  return {
    id: judgment._id,
    caseId: judgment.caseId,
    reviewerUserId: judgment.reviewerUserId,
    blindOrder: judgment.blindOrder,
    choice: judgment.choice,
    reasonCodes: judgment.reasonCodes,
    labels: judgment.labels,
    revision: judgment.revision,
    submittedAt: judgment.submittedAt,
  };
}

function toResultsDecision(
  decision: Doc<"evalDecisions">
): EvalResultsDecisionInput {
  return {
    id: decision._id,
    decision: decision.decision,
    rationale: decision.rationale,
    sampleSize: decision.sampleSize,
    evidenceHash: decision.evidenceHash,
    createdAt: decision.createdAt,
  };
}
