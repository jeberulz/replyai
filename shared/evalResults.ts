import type { EvalDecision, EvalKind } from "./evalLab";
import { stableEvalHash } from "./evalRunner";

export const EVAL_RESULTS_MIN_SAMPLE = 10;
export const EVAL_RESULTS_CONFIDENCE_LEVEL = 0.95;

export type EvalOutputStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "excluded";

export type EvalResultsStageIdentity = {
  role: "generation" | "discovery";
  providerId: string;
  modelId: string;
  reasoningEffort?: string;
};

export type EvalResultsCandidateIdentity = {
  catalogId: string;
  label: string;
  stages: EvalResultsStageIdentity[];
};

export type EvalResultsCaseInput = {
  id: string;
  ordinal: number;
  caseHash: string;
  strataLabels: string[];
};

export type EvalResultsOutputInput = {
  id: string;
  caseId: string;
  candidateCatalogId: string;
  blindKey: string;
  kind: EvalKind;
  status: EvalOutputStatus;
  candidateSnapshotJson?: string;
  normalizedOutputJson?: string;
  error?: string;
  costUsd?: number;
  latencyMs?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
    toolCallCount?: number;
    successfulToolCallCount?: number;
  };
};

export type EvalResultsJudgmentInput = {
  id?: string;
  caseId: string;
  reviewerUserId: string;
  blindOrder: string[];
  choice:
    | "a"
    | "b"
    | "tie"
    | "neither"
    | "relevant"
    | "not_relevant";
  reasonCodes: string[];
  labels?: {
    actionable?: boolean;
    novel?: boolean;
    unsafe?: boolean;
    stale?: boolean;
    duplicate?: boolean;
  };
  revision: number;
  submittedAt: number;
};

export type EvalResultsDecisionInput = {
  id: string;
  decision: EvalDecision;
  rationale: string;
  sampleSize: number;
  evidenceHash: string;
  createdAt: number;
};

export type EvalConfidenceInterval = {
  method: "wilson";
  level: typeof EVAL_RESULTS_CONFIDENCE_LEVEL;
  lower: number;
  upper: number;
};

export type EvalCandidateAggregate = {
  candidateCatalogId: string;
  identity: EvalResultsCandidateIdentity;
  metricLabel: string;
  numerator: number;
  denominator: number;
  rate: number | null;
  confidenceInterval: EvalConfidenceInterval | null;
  warnings: string[];
  outputCounts: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    excluded: number;
  };
  failures: number;
  exclusions: number;
  judgmentCount: number;
  judgmentExclusions: number;
  reviewedCaseCount: number;
  costUsd: number;
  latencyMs: number | null;
  labelCounts: {
    actionable: number;
    novel: number;
    unsafe: number;
    stale: number;
    duplicate: number;
  };
};

export type EvalResultsCaseDrilldown = {
  caseId: string;
  ordinal: number | null;
  caseHash: string | null;
  strataLabels: string[];
  outputs: Array<{
    outputId: string;
    candidateCatalogId: string;
    blindKey: string;
    status: EvalOutputStatus;
    error?: string;
    summary: string;
    costUsd: number;
  }>;
  judgments: Array<{
    choice: EvalResultsJudgmentInput["choice"];
    blindOrder: string[];
    revision: number;
    submittedAt: number;
  }>;
};

export type EvalResultsSummary = {
  kind: EvalKind;
  runId: string | null;
  sampleSize: number;
  evidenceHash: string;
  totals: {
    cases: number;
    outputs: number;
    judgments: number;
    latestJudgments: number;
    completedOutputs: number;
    failedOutputs: number;
    excludedOutputs: number;
  };
  candidates: EvalCandidateAggregate[];
  cases: EvalResultsCaseDrilldown[];
  decisions: EvalResultsDecisionInput[];
};

type MutableAggregate = EvalCandidateAggregate & {
  reviewedCaseIds: Set<string>;
};

export function buildEvalResultsSummary(args: {
  kind: EvalKind;
  runId: string | null;
  cases: readonly EvalResultsCaseInput[];
  outputs: readonly EvalResultsOutputInput[];
  judgments: readonly EvalResultsJudgmentInput[];
  decisions?: readonly EvalResultsDecisionInput[];
}): EvalResultsSummary {
  const outputsByBlindKey = new Map(
    args.outputs.map((output) => [output.blindKey, output])
  );
  const aggregates = new Map<string, MutableAggregate>();
  for (const output of args.outputs) {
    const aggregate = ensureAggregate(aggregates, output);
    aggregate.outputCounts.total += 1;
    aggregate.outputCounts[output.status] += 1;
    aggregate.failures = aggregate.outputCounts.failed;
    aggregate.exclusions = aggregate.outputCounts.excluded;
    aggregate.costUsd += output.costUsd ?? 0;
    if (output.latencyMs !== undefined) {
      aggregate.latencyMs = (aggregate.latencyMs ?? 0) + output.latencyMs;
    }
  }

  const latestJudgments = latestEvalJudgments(args.judgments);
  for (const judgment of latestJudgments) {
    if (args.kind === "generation") {
      applyGenerationJudgment(aggregates, outputsByBlindKey, judgment);
    } else if (args.kind === "discovery") {
      applyDiscoveryJudgment(aggregates, outputsByBlindKey, judgment);
    }
  }

  const candidates = [...aggregates.values()]
    .map(finalizeAggregate)
    .sort((left, right) =>
      right.denominator === left.denominator
        ? (right.rate ?? -1) - (left.rate ?? -1)
        : right.denominator - left.denominator
    );
  const cases = buildCaseDrilldowns({
    cases: args.cases,
    outputs: args.outputs,
    judgments: latestJudgments,
  });
  const summaryWithoutHash = {
    kind: args.kind,
    runId: args.runId,
    sampleSize: candidates.reduce(
      (total, candidate) => total + candidate.denominator,
      0
    ),
    totals: {
      cases: args.cases.length,
      outputs: args.outputs.length,
      judgments: args.judgments.length,
      latestJudgments: latestJudgments.length,
      completedOutputs: args.outputs.filter((output) => output.status === "completed")
        .length,
      failedOutputs: args.outputs.filter((output) => output.status === "failed")
        .length,
      excludedOutputs: args.outputs.filter((output) => output.status === "excluded")
        .length,
    },
    candidates: candidates.map((candidate) => ({
      candidateCatalogId: candidate.candidateCatalogId,
      numerator: candidate.numerator,
      denominator: candidate.denominator,
      failures: candidate.failures,
      exclusions: candidate.exclusions,
      judgmentExclusions: candidate.judgmentExclusions,
      outputCounts: candidate.outputCounts,
    })),
  };

  return {
    ...summaryWithoutHash,
    evidenceHash: stableEvalHash(canonicalize(summaryWithoutHash)),
    candidates,
    cases,
    decisions: [...(args.decisions ?? [])].sort(
      (left, right) => right.createdAt - left.createdAt
    ),
  };
}

export function latestEvalJudgments(
  judgments: readonly EvalResultsJudgmentInput[]
): EvalResultsJudgmentInput[] {
  const byKey = new Map<string, EvalResultsJudgmentInput>();
  for (const judgment of judgments) {
    const key = [
      judgment.reviewerUserId,
      judgment.caseId,
      judgment.blindOrder.join("|"),
    ].join(":");
    const current = byKey.get(key);
    if (
      !current ||
      judgment.revision > current.revision ||
      (judgment.revision === current.revision &&
        judgment.submittedAt > current.submittedAt)
    ) {
      byKey.set(key, judgment);
    }
  }
  return [...byKey.values()];
}

export function wilsonConfidenceInterval(
  numerator: number,
  denominator: number
): EvalConfidenceInterval | null {
  if (
    denominator <= 0 ||
    numerator < 0 ||
    numerator > denominator ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator)
  ) {
    return null;
  }
  const z = 1.96;
  const phat = numerator / denominator;
  const z2 = z * z;
  const denominatorTerm = 1 + z2 / denominator;
  const center = (phat + z2 / (2 * denominator)) / denominatorTerm;
  const margin =
    (z *
      Math.sqrt(
        (phat * (1 - phat) + z2 / (4 * denominator)) / denominator
      )) /
    denominatorTerm;
  return {
    method: "wilson",
    level: EVAL_RESULTS_CONFIDENCE_LEVEL,
    lower: roundRate(Math.max(0, center - margin)),
    upper: roundRate(Math.min(1, center + margin)),
  };
}

export function buildRedactedEvalExport(
  summary: EvalResultsSummary,
  format: "json" | "csv"
): string {
  const payload = {
    kind: summary.kind,
    runId: summary.runId,
    evidenceHash: summary.evidenceHash,
    totals: summary.totals,
    candidates: summary.candidates.map((candidate) => ({
      candidateCatalogId: candidate.candidateCatalogId,
      label: candidate.identity.label,
      stages: candidate.identity.stages,
      metricLabel: candidate.metricLabel,
      numerator: candidate.numerator,
      denominator: candidate.denominator,
      rate: candidate.rate,
      confidenceInterval: candidate.confidenceInterval,
      warnings: candidate.warnings,
      failures: candidate.failures,
      exclusions: candidate.exclusions,
      judgmentExclusions: candidate.judgmentExclusions,
      outputCounts: candidate.outputCounts,
      labelCounts: candidate.labelCounts,
    })),
    cases: summary.cases.map((item) => ({
      caseId: item.caseId,
      ordinal: item.ordinal,
      caseHash: item.caseHash,
      strataLabels: item.strataLabels,
      outputs: item.outputs.map((output) => ({
        outputId: output.outputId,
        candidateCatalogId: output.candidateCatalogId,
        blindKey: output.blindKey,
        status: output.status,
        error: output.error,
        costUsd: output.costUsd,
      })),
      judgments: item.judgments,
    })),
    decisions: summary.decisions,
  };
  if (format === "json") return JSON.stringify(payload, null, 2);
  return toCsv(payload.candidates);
}

function ensureAggregate(
  aggregates: Map<string, MutableAggregate>,
  output: EvalResultsOutputInput
): MutableAggregate {
  const existing = aggregates.get(output.candidateCatalogId);
  if (existing) return existing;
  const aggregate: MutableAggregate = {
    candidateCatalogId: output.candidateCatalogId,
    identity: parseCandidateIdentity(
      output.candidateCatalogId,
      output.candidateSnapshotJson
    ),
    metricLabel:
      output.kind === "discovery"
        ? "Relevant judgments"
        : output.kind === "generation"
          ? "A/B wins"
          : "Reviewed wins",
    numerator: 0,
    denominator: 0,
    rate: null,
    confidenceInterval: null,
    warnings: [],
    outputCounts: {
      total: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      excluded: 0,
    },
    failures: 0,
    exclusions: 0,
    judgmentCount: 0,
    judgmentExclusions: 0,
    reviewedCaseCount: 0,
    costUsd: 0,
    latencyMs: null,
    labelCounts: {
      actionable: 0,
      novel: 0,
      unsafe: 0,
      stale: 0,
      duplicate: 0,
    },
    reviewedCaseIds: new Set<string>(),
  };
  aggregates.set(output.candidateCatalogId, aggregate);
  return aggregate;
}

function applyGenerationJudgment(
  aggregates: Map<string, MutableAggregate>,
  outputsByBlindKey: Map<string, EvalResultsOutputInput>,
  judgment: EvalResultsJudgmentInput
) {
  if (!["a", "b", "tie", "neither"].includes(judgment.choice)) return;
  const peers = judgment.blindOrder
    .map((blindKey) => outputsByBlindKey.get(blindKey))
    .filter((output): output is EvalResultsOutputInput => Boolean(output));
  for (const output of peers) {
    const aggregate = aggregates.get(output.candidateCatalogId);
    if (!aggregate) continue;
    aggregate.judgmentCount += 1;
    aggregate.reviewedCaseIds.add(judgment.caseId);
    if (judgment.choice === "a" || judgment.choice === "b") {
      aggregate.denominator += 1;
    } else {
      aggregate.judgmentExclusions += 1;
    }
  }
  const selectedIndex = judgment.choice === "a" ? 0 : judgment.choice === "b" ? 1 : -1;
  const selected = selectedIndex >= 0 ? peers[selectedIndex] : null;
  if (selected) {
    const aggregate = aggregates.get(selected.candidateCatalogId);
    if (aggregate) aggregate.numerator += 1;
  }
}

function applyDiscoveryJudgment(
  aggregates: Map<string, MutableAggregate>,
  outputsByBlindKey: Map<string, EvalResultsOutputInput>,
  judgment: EvalResultsJudgmentInput
) {
  if (judgment.choice !== "relevant" && judgment.choice !== "not_relevant") return;
  const output = outputsByBlindKey.get(judgment.blindOrder[0] ?? "");
  if (!output) return;
  const aggregate = aggregates.get(output.candidateCatalogId);
  if (!aggregate) return;
  aggregate.judgmentCount += 1;
  aggregate.denominator += 1;
  aggregate.reviewedCaseIds.add(judgment.caseId);
  if (judgment.choice === "relevant") aggregate.numerator += 1;
  for (const label of Object.keys(aggregate.labelCounts) as Array<
    keyof EvalCandidateAggregate["labelCounts"]
  >) {
    if (judgment.labels?.[label]) aggregate.labelCounts[label] += 1;
  }
}

function finalizeAggregate(aggregate: MutableAggregate): EvalCandidateAggregate {
  const { reviewedCaseIds: _reviewedCaseIds, ...publicAggregate } = aggregate;
  const denominator = aggregate.denominator;
  const rate = denominator > 0 ? roundRate(aggregate.numerator / denominator) : null;
  const warnings = [...aggregate.warnings];
  if (denominator < EVAL_RESULTS_MIN_SAMPLE) {
    warnings.push(
      `Minimum sample warning: ${denominator}/${EVAL_RESULTS_MIN_SAMPLE} reviewed denominator.`
    );
  }
  if (aggregate.outputCounts.failed > 0) {
    warnings.push(`${aggregate.outputCounts.failed} output failure(s) included.`);
  }
  if (aggregate.outputCounts.excluded > 0) {
    warnings.push(`${aggregate.outputCounts.excluded} output exclusion(s) included.`);
  }
  return {
    ...publicAggregate,
    rate,
    confidenceInterval: wilsonConfidenceInterval(aggregate.numerator, denominator),
    warnings,
    reviewedCaseCount: aggregate.reviewedCaseIds.size,
    costUsd: roundMoney(aggregate.costUsd),
    latencyMs: aggregate.latencyMs === null ? null : Math.round(aggregate.latencyMs),
  };
}

function buildCaseDrilldowns(args: {
  cases: readonly EvalResultsCaseInput[];
  outputs: readonly EvalResultsOutputInput[];
  judgments: readonly EvalResultsJudgmentInput[];
}): EvalResultsCaseDrilldown[] {
  const casesById = new Map(args.cases.map((item) => [item.id, item]));
  const outputCaseIds = new Set(args.outputs.map((output) => output.caseId));
  const caseIds = new Set([...casesById.keys(), ...outputCaseIds]);
  return [...caseIds]
    .map((caseId) => {
      const evalCase = casesById.get(caseId);
      const outputs = args.outputs
        .filter((output) => output.caseId === caseId)
        .map((output) => ({
          outputId: output.id,
          candidateCatalogId: output.candidateCatalogId,
          blindKey: output.blindKey,
          status: output.status,
          error: output.error,
          summary: summarizeOutput(output.normalizedOutputJson),
          costUsd: roundMoney(output.costUsd ?? 0),
        }));
      return {
        caseId,
        ordinal: evalCase?.ordinal ?? null,
        caseHash: evalCase?.caseHash ?? null,
        strataLabels: evalCase?.strataLabels ?? [],
        outputs,
        judgments: args.judgments
          .filter((judgment) => judgment.caseId === caseId)
          .map((judgment) => ({
            choice: judgment.choice,
            blindOrder: judgment.blindOrder,
            revision: judgment.revision,
            submittedAt: judgment.submittedAt,
          })),
      };
    })
    .sort((left, right) => (left.ordinal ?? 999_999) - (right.ordinal ?? 999_999));
}

function parseCandidateIdentity(
  candidateCatalogId: string,
  candidateSnapshotJson?: string
): EvalResultsCandidateIdentity {
  const parsed = parseJsonObject(candidateSnapshotJson);
  const stages = Array.isArray(parsed?.stages)
    ? parsed.stages.map((stage) => ({
        role:
          stringField(stage, "role") === "discovery" ? "discovery" : "generation",
        providerId: stringField(stage, "providerId") ?? "unknown",
        modelId: stringField(stage, "modelId") ?? "unknown",
        reasoningEffort: stringField(stage, "reasoningEffort"),
      }))
    : [];
  return {
    catalogId: stringField(parsed, "catalogId") ?? candidateCatalogId,
    label: stringField(parsed, "label") ?? candidateCatalogId,
    stages,
  };
}

function summarizeOutput(normalizedOutputJson?: string): string {
  const parsed = parseJsonObject(normalizedOutputJson);
  if (!parsed) return "No normalized output.";
  if (Array.isArray(parsed.options)) {
    return `${parsed.options.length} generated option(s)`;
  }
  if (Array.isArray(parsed.candidates)) {
    return `${parsed.candidates.length} discovered candidate(s)`;
  }
  if (
    parsed.discovery &&
    typeof parsed.discovery === "object" &&
    !Array.isArray(parsed.discovery) &&
    parsed.generation &&
    typeof parsed.generation === "object" &&
    !Array.isArray(parsed.generation)
  ) {
    const discovery = parsed.discovery as Record<string, unknown>;
    const generation = parsed.generation as Record<string, unknown>;
    const discoveries = Array.isArray(discovery.candidates)
      ? discovery.candidates.length
      : 0;
    const options = Array.isArray(generation.options)
      ? generation.options.length
      : 0;
    return `${discoveries} discovered candidate(s), ${options} generated option(s)`;
  }
  return "Normalized output present.";
}

function parseJsonObject(value?: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  const headers = [
    "candidateCatalogId",
    "label",
    "stages",
    "metricLabel",
    "numerator",
    "denominator",
    "rate",
    "ciLower",
    "ciUpper",
    "failures",
    "exclusions",
    "judgmentExclusions",
    "warnings",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value =
            header === "ciLower"
              ? (row.confidenceInterval as EvalConfidenceInterval | null)?.lower
              : header === "ciUpper"
                ? (row.confidenceInterval as EvalConfidenceInterval | null)?.upper
                : row[header];
          return csvEscape(
            Array.isArray(value) || (value && typeof value === "object")
              ? JSON.stringify(value)
              : value
          );
        })
        .join(",")
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function roundMoney(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
