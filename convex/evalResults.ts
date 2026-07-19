import { v } from "convex/values";
import {
  buildEvalResultsSummary,
  evalDecisionEvidenceHash,
  type EvalResultJudgmentInput,
  type EvalResultOutputInput,
} from "../shared/evalResults";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireEvalOperator } from "./helpers";

const evalDecisionValidator = v.union(
  v.literal("promote_to_shadow"),
  v.literal("promote_to_assisted"),
  v.literal("retest"),
  v.literal("reject")
);

const exportFormatValidator = v.union(v.literal("json"), v.literal("csv"));

export const summary = query({
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

    const run = await latestRun(ctx, experiment._id);
    const outputs = run ? await outputsForRun(ctx, run._id) : [];
    const judgments = run ? await judgmentsForRun(ctx, run._id) : [];
    const decisions = await ctx.db
      .query("evalDecisions")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
      .order("desc")
      .take(50);
    const caseDocs = await caseDocsForOutputs(ctx, outputs);
    const resultInputs = outputs.map((output) =>
      outputInput(output, experiment)
    );
    const judgmentInputs = judgments.map(judgmentInput);
    const resultSummary = buildEvalResultsSummary({
      outputs: resultInputs,
      judgments: judgmentInputs,
    });

    return {
      experiment: publicExperiment(experiment),
      run: run ? publicRun(run) : null,
      summary: resultSummary,
      candidates: experiment.candidateSnapshots.map((candidate) => ({
        catalogId: candidate.catalogId,
        label: candidate.label,
        kind: candidate.kind,
        stages: candidate.stages.map((stage) => ({
          role: stage.role,
          providerId: stage.providerId,
          modelId: stage.modelId,
          reasoningEffort: stage.reasoningEffort,
        })),
      })),
      drilldown: buildDrilldown({
        outputs,
        judgments,
        caseDocs,
        experiment,
      }),
      decisions: decisions.map((decision) => ({
        _id: decision._id,
        runId: decision.runId,
        decision: decision.decision,
        rationale: decision.rationale,
        sampleSize: decision.sampleSize,
        evidenceHash: decision.evidenceHash,
        createdAt: decision.createdAt,
      })),
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
    const run = await latestRun(ctx, experiment._id);
    const outputs = run ? await outputsForRun(ctx, run._id) : [];
    const judgments = run ? await judgmentsForRun(ctx, run._id) : [];
    const caseDocs = await caseDocsForOutputs(ctx, outputs);
    const resultInputs = outputs.map((output) =>
      outputInput(output, experiment)
    );
    const judgmentInputs = judgments.map(judgmentInput);
    const resultSummary = buildEvalResultsSummary({
      outputs: resultInputs,
      judgments: judgmentInputs,
    });
    const drilldown = buildDrilldown({
      outputs,
      judgments,
      caseDocs,
      experiment,
    });
    const exported = {
      exportedAt: Date.now(),
      experiment: publicExperiment(experiment),
      run: run ? publicRun(run) : null,
      summary: resultSummary,
      drilldown,
    };

    if (format === "json") {
      return {
        filename: `${safeFilename(experiment.name)}-redacted-results.json`,
        mimeType: "application/json",
        content: JSON.stringify(exported, null, 2),
      };
    }

    return {
      filename: `${safeFilename(experiment.name)}-redacted-results.csv`,
      mimeType: "text/csv",
      content: csvExport(exported),
    };
  },
});

export const recordDecision = mutation({
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
    const run = args.runId
      ? await ctx.db.get(args.runId)
      : await latestRun(ctx, experiment._id);
    if (run && run.experimentId !== experiment._id) {
      throw new Error("Run does not belong to this experiment");
    }
    const rationale = args.rationale.trim();
    if (rationale.length < 12) {
      throw new Error("Add a decision rationale with evidence.");
    }

    const outputs = run ? await outputsForRun(ctx, run._id) : [];
    const judgments = run ? await judgmentsForRun(ctx, run._id) : [];
    const resultSummary = buildEvalResultsSummary({
      outputs: outputs.map((output) => outputInput(output, experiment)),
      judgments: judgments.map(judgmentInput),
    });
    const sampleSize = Math.max(
      0,
      ...resultSummary.candidates.map((candidate) => candidate.denominator)
    );
    const evidenceHash = evalDecisionEvidenceHash({
      experimentId: experiment._id,
      runId: run?._id ?? null,
      decision: args.decision,
      rationale,
      sampleSize,
      candidateSummaries: resultSummary.candidates,
    });
    const now = Date.now();
    const decisionId = await ctx.db.insert("evalDecisions", {
      userId: experiment.userId,
      experimentId: experiment._id,
      runId: run?._id,
      decision: args.decision,
      rationale,
      sampleSize,
      evidenceHash,
      createdByUserId: operator._id,
      createdAt: now,
    });

    return { decisionId, evidenceHash, sampleSize };
  },
});

type EvalResultsCtx = QueryCtx | MutationCtx;

async function latestRun(
  ctx: EvalResultsCtx,
  experimentId: Id<"evalExperiments">
) {
  const runs = await ctx.db
    .query("evalRuns")
    .withIndex("by_experiment", (q) => q.eq("experimentId", experimentId))
    .order("desc")
    .take(1);
  return runs[0] ?? null;
}

async function outputsForRun(ctx: EvalResultsCtx, runId: Id<"evalRuns">) {
  return await ctx.db
    .query("evalOutputs")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .take(500);
}

async function judgmentsForRun(ctx: EvalResultsCtx, runId: Id<"evalRuns">) {
  return await ctx.db
    .query("evalJudgments")
    .withIndex("by_run", (q) => q.eq("runId", runId))
    .order("desc")
    .take(500);
}

async function caseDocsForOutputs(
  ctx: EvalResultsCtx,
  outputs: readonly Doc<"evalOutputs">[]
) {
  const uniqueCaseIds = Array.from(
    new Set(outputs.map((output) => output.caseId))
  ).slice(0, 250);
  const entries = await Promise.all(
    uniqueCaseIds.map(
      async (caseId) => [caseId, await ctx.db.get(caseId)] as const
    )
  );
  const cases = new Map<Id<"evalCases">, Doc<"evalCases">>();
  for (const [caseId, caseDoc] of entries) {
    if (caseDoc) cases.set(caseId, caseDoc);
  }
  return cases;
}

function outputInput(
  output: Doc<"evalOutputs">,
  experiment: Doc<"evalExperiments">
): EvalResultOutputInput {
  const candidate = experiment.candidateSnapshots.find(
    (snapshot) => snapshot.catalogId === output.candidateCatalogId
  );
  return {
    id: output._id,
    caseId: output.caseId,
    candidateCatalogId: output.candidateCatalogId,
    candidateLabel: candidate?.label ?? output.candidateCatalogId,
    candidateSnapshotJson: output.candidateSnapshotJson,
    blindKey: output.blindKey,
    kind: output.kind,
    status: output.status,
    normalizedOutputJson: output.normalizedOutputJson,
    inputSnapshotJson: output.inputSnapshotJson,
    error: output.error,
    costUsd: output.costUsd,
    latencyMs: output.latencyMs,
    retryCount: output.retryCount,
  };
}

function judgmentInput(
  judgment: Doc<"evalJudgments">
): EvalResultJudgmentInput {
  return {
    id: judgment._id,
    caseId: judgment.caseId,
    reviewerUserId: judgment.reviewerUserId,
    kind: judgment.kind,
    blindOrder: judgment.blindOrder,
    choice: judgment.choice,
    reasonCodes: judgment.reasonCodes,
    labels: judgment.labels,
    revision: judgment.revision,
    submittedAt: judgment.submittedAt,
  };
}

function publicExperiment(experiment: Doc<"evalExperiments">) {
  return {
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
  };
}

function publicRun(run: Doc<"evalRuns">) {
  return {
    _id: run._id,
    attempt: run.attempt,
    status: run.status,
    counts: run.counts,
    spendUsd: run.spendUsd,
    seed: run.seed,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    error: run.error,
  };
}

function buildDrilldown(args: {
  outputs: readonly Doc<"evalOutputs">[];
  judgments: readonly Doc<"evalJudgments">[];
  caseDocs: ReadonlyMap<Id<"evalCases">, Doc<"evalCases">>;
  experiment: Doc<"evalExperiments">;
}) {
  return args.outputs.slice(0, 250).map((output) => {
    const caseDoc = args.caseDocs.get(output.caseId);
    const candidate = args.experiment.candidateSnapshots.find(
      (snapshot) => snapshot.catalogId === output.candidateCatalogId
    );
    const outputJudgments = args.judgments.filter((judgment) =>
      judgment.blindOrder.includes(output.blindKey)
    );
    return {
      outputId: output._id,
      caseId: output.caseId,
      caseOrdinal: caseDoc?.ordinal,
      caseContext: redactCaseSnapshot(
        output.inputSnapshotJson ?? caseDoc?.snapshotJson
      ),
      candidateCatalogId: output.candidateCatalogId,
      candidateLabel: candidate?.label ?? output.candidateCatalogId,
      blindKey: output.blindKey,
      status: output.status,
      retryCount: output.retryCount ?? 0,
      costUsd: output.costUsd ?? 0,
      latencyMs: output.latencyMs,
      error: output.error ? redactText(output.error, 160) : undefined,
      output: redactOutput(output.normalizedOutputJson),
      judgments: outputJudgments.map((judgment) => ({
        judgmentId: judgment._id,
        caseId: judgment.caseId,
        choice: judgment.choice,
        reasonCodes: judgment.reasonCodes,
        labels: judgment.labels,
        blindOrder: judgment.blindOrder,
        revision: judgment.revision,
        submittedAt: judgment.submittedAt,
      })),
    };
  });
}

function redactCaseSnapshot(snapshotJson?: string) {
  const parsed = parseObject(snapshotJson);
  return {
    topic: redactStringField(parsed, "topic", 120),
    query: redactStringField(parsed, "query", 120),
    authorHandle: redactStringField(parsed, "authorHandle", 80),
    sourceTweetId: redactStringField(parsed, "sourceTweetId", 80),
    tweetText: redactStringField(parsed, "tweetText", 280),
  };
}

function redactOutput(normalizedOutputJson?: string): unknown {
  const parsed = parseObject(normalizedOutputJson);
  if (!parsed) return null;
  if (Array.isArray(parsed.options)) {
    return {
      options: parsed.options.slice(0, 3).map((option) => {
        const item = objectOrNull(option);
        return {
          category: redactStringField(item, "category", 40),
          content: redactStringField(item, "content", 280),
          reason: redactStringField(item, "reason", 180),
        };
      }),
    };
  }
  if (Array.isArray(parsed.candidates)) {
    return {
      candidates: parsed.candidates.slice(0, 5).map(redactDiscoveryCandidate),
    };
  }
  const discovery = objectOrNull(parsed.discovery);
  const generation = objectOrNull(parsed.generation);
  return {
    discovery: discovery
      ? redactOutput(JSON.stringify(discovery))
      : undefined,
    generation: generation
      ? redactOutput(JSON.stringify(generation))
      : undefined,
  };
}

function redactDiscoveryCandidate(candidate: unknown) {
  const item = objectOrNull(candidate);
  return {
    postUrl: redactStringField(item, "postUrl", 160),
    tweetId: redactStringField(item, "tweetId", 80),
    authorHandle: redactStringField(item, "authorHandle", 80),
    relevanceReason: redactStringField(item, "relevanceReason", 220),
    missingAngle: redactStringField(item, "missingAngle", 180),
    searchIntent: redactStringField(item, "searchIntent", 160),
  };
}

function parseObject(json?: string): Record<string, unknown> | null {
  if (!json) return null;
  try {
    return objectOrNull(JSON.parse(json));
  } catch {
    return null;
  }
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function redactStringField(
  object: Record<string, unknown> | null,
  key: string,
  maxLength: number
): string | undefined {
  const value = object?.[key];
  return typeof value === "string" ? redactText(value, maxLength) : undefined;
}

function redactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function csvExport(exported: {
  summary: ReturnType<typeof buildEvalResultsSummary>;
  drilldown: ReturnType<typeof buildDrilldown>;
}) {
  const rows = [
    [
      "section",
      "id",
      "candidate",
      "numerator",
      "denominator",
      "rate",
      "failures",
      "exclusions",
      "status",
      "choice",
    ],
    ...exported.summary.candidates.map((candidate) => [
      "candidate",
      candidate.candidateCatalogId,
      candidate.candidateLabel,
      String(candidate.numerator),
      String(candidate.denominator),
      candidate.rate === null ? "" : String(candidate.rate),
      String(candidate.failures),
      String(candidate.exclusions),
      "",
      "",
    ]),
    ...exported.drilldown.flatMap((row) =>
      row.judgments.length === 0
        ? [
            [
              "output",
              row.outputId,
              row.candidateCatalogId,
              "",
              "",
              "",
              "",
              "",
              row.status,
              "",
            ],
          ]
        : row.judgments.map((judgment) => [
            "judgment",
            judgment.judgmentId,
            row.candidateCatalogId,
            "",
            "",
            "",
            "",
            "",
            row.status,
            judgment.choice,
          ])
    ),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function safeFilename(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "eval"
  );
}
