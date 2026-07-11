import type { EvalDecision, EvalKind } from "./evalLab";
import { stableEvalHash } from "./evalRunner";

export const EVAL_RESULTS_MIN_SAMPLE_SIZE = 10;

export type EvalResultOutputStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "excluded";

export type EvalResultOutputInput = {
  id: string;
  caseId: string;
  candidateCatalogId: string;
  candidateLabel: string;
  candidateSnapshotJson?: string;
  blindKey: string;
  kind: EvalKind;
  status: EvalResultOutputStatus;
  normalizedOutputJson?: string;
  inputSnapshotJson?: string;
  error?: string;
  costUsd?: number;
  latencyMs?: number;
  retryCount?: number;
};

export type EvalResultJudgmentInput = {
  id: string;
  caseId: string;
  reviewerUserId: string;
  kind: EvalKind;
  blindOrder: string[];
  choice:
    | "a"
    | "b"
    | "tie"
    | "neither"
    | "relevant"
    | "not_relevant";
  labels?: Partial<
    Record<"actionable" | "novel" | "unsafe" | "stale" | "duplicate", boolean>
  >;
  reasonCodes: string[];
  revision: number;
  submittedAt: number;
};

export type EvalConfidenceInterval = {
  method: "wilson" | "simple";
  level: 0.95;
  lower: number;
  upper: number;
};

export type EvalCandidateResultSummary = {
  candidateCatalogId: string;
  candidateLabel: string;
  kind: EvalKind;
  outputCount: number;
  completed: number;
  failures: number;
  exclusions: number;
  denominator: number;
  numerator: number;
  rate: number | null;
  warning: "min_sample" | null;
  confidence: {
    wilson: EvalConfidenceInterval | null;
    simple: EvalConfidenceInterval | null;
  };
};

export type EvalCaseResultSummary = {
  caseId: string;
  completed: number;
  failures: number;
  exclusions: number;
  judgments: number;
  candidates: Array<{
    candidateCatalogId: string;
    blindKey: string;
    status: EvalResultOutputStatus;
  }>;
};

export type EvalResultsSummary = {
  minSampleSize: number;
  totals: {
    outputs: number;
    completed: number;
    failures: number;
    exclusions: number;
    judgments: number;
    scoredJudgments: number;
  };
  candidates: EvalCandidateResultSummary[];
  cases: EvalCaseResultSummary[];
};

type MutableCandidate = EvalCandidateResultSummary & {
  blindKeys: Set<string>;
};

export function buildEvalResultsSummary(args: {
  outputs: readonly EvalResultOutputInput[];
  judgments: readonly EvalResultJudgmentInput[];
  minSampleSize?: number;
}): EvalResultsSummary {
  const minSampleSize =
    args.minSampleSize ?? EVAL_RESULTS_MIN_SAMPLE_SIZE;
  const candidates = new Map<string, MutableCandidate>();
  const outputByBlindKey = new Map<string, EvalResultOutputInput>();
  const cases = new Map<string, EvalCaseResultSummary>();

  for (const output of args.outputs) {
    outputByBlindKey.set(output.blindKey, output);
    const candidate = ensureCandidate(candidates, output);
    candidate.outputCount += 1;
    candidate.blindKeys.add(output.blindKey);
    if (output.status === "completed") candidate.completed += 1;
    if (output.status === "failed") candidate.failures += 1;
    if (output.status === "excluded") candidate.exclusions += 1;

    const caseSummary = ensureCase(cases, output.caseId);
    if (output.status === "completed") caseSummary.completed += 1;
    if (output.status === "failed") caseSummary.failures += 1;
    if (output.status === "excluded") caseSummary.exclusions += 1;
    caseSummary.candidates.push({
      candidateCatalogId: output.candidateCatalogId,
      blindKey: output.blindKey,
      status: output.status,
    });
  }

  const latestJudgments = latestJudgmentRevisions(args.judgments);
  let scoredJudgments = 0;
  for (const judgment of latestJudgments) {
    const caseSummary = cases.get(judgment.caseId);
    if (caseSummary) caseSummary.judgments += 1;

    if (judgment.kind === "generation") {
      const score = scoreGenerationJudgment(judgment, outputByBlindKey);
      if (!score) continue;
      scoredJudgments += 1;
      for (const item of score.denominators) {
        const candidate = candidates.get(item.candidateCatalogId);
        if (candidate) candidate.denominator += 1;
      }
      for (const item of score.numerators) {
        const candidate = candidates.get(item.candidateCatalogId);
        if (candidate) candidate.numerator += item.value;
      }
      continue;
    }

    if (judgment.kind === "discovery") {
      const score = scoreDiscoveryJudgment(judgment, outputByBlindKey);
      if (!score) continue;
      scoredJudgments += 1;
      const candidate = candidates.get(score.candidateCatalogId);
      if (!candidate) continue;
      candidate.denominator += 1;
      if (score.relevant) candidate.numerator += 1;
    }
  }

  const finalizedCandidates = Array.from(candidates.values())
    .map((candidate) => finalizeCandidate(candidate, minSampleSize))
    .sort(
      (left, right) =>
        (right.rate ?? -1) - (left.rate ?? -1) ||
        right.denominator - left.denominator ||
        left.candidateLabel.localeCompare(right.candidateLabel)
    );

  const finalizedCases = Array.from(cases.values()).sort((left, right) =>
    left.caseId.localeCompare(right.caseId)
  );

  return {
    minSampleSize,
    totals: {
      outputs: args.outputs.length,
      completed: args.outputs.filter((output) => output.status === "completed")
        .length,
      failures: args.outputs.filter((output) => output.status === "failed")
        .length,
      exclusions: args.outputs.filter((output) => output.status === "excluded")
        .length,
      judgments: latestJudgments.length,
      scoredJudgments,
    },
    candidates: finalizedCandidates,
    cases: finalizedCases,
  };
}

export function latestJudgmentRevisions(
  judgments: readonly EvalResultJudgmentInput[]
): EvalResultJudgmentInput[] {
  const byReviewerAssignment = new Map<string, EvalResultJudgmentInput>();
  for (const judgment of judgments) {
    const key = [
      judgment.reviewerUserId,
      judgment.caseId,
      judgment.blindOrder.join("|"),
    ].join(":");
    const current = byReviewerAssignment.get(key);
    if (
      !current ||
      judgment.revision > current.revision ||
      (judgment.revision === current.revision &&
        judgment.submittedAt > current.submittedAt)
    ) {
      byReviewerAssignment.set(key, judgment);
    }
  }
  return Array.from(byReviewerAssignment.values());
}

export function confidenceIntervals(args: {
  numerator: number;
  denominator: number;
}): { wilson: EvalConfidenceInterval | null; simple: EvalConfidenceInterval | null } {
  if (!validRateInputs(args)) return { wilson: null, simple: null };
  return {
    wilson: wilsonInterval(args.numerator, args.denominator),
    simple: simpleInterval(args.numerator, args.denominator),
  };
}

export function evalDecisionEvidenceHash(args: {
  experimentId: string;
  runId?: string | null;
  decision: EvalDecision;
  rationale: string;
  sampleSize: number;
  candidateSummaries: readonly Pick<
    EvalCandidateResultSummary,
    "candidateCatalogId" | "numerator" | "denominator" | "failures" | "exclusions"
  >[];
}): string {
  const payload = JSON.stringify({
    experimentId: args.experimentId,
    runId: args.runId ?? null,
    decision: args.decision,
    rationale: args.rationale.trim(),
    sampleSize: args.sampleSize,
    candidateSummaries: args.candidateSummaries.map((candidate) => ({
      candidateCatalogId: candidate.candidateCatalogId,
      numerator: roundRate(candidate.numerator),
      denominator: candidate.denominator,
      failures: candidate.failures,
      exclusions: candidate.exclusions,
    })),
  });
  return `wp48_${stableEvalHash(payload)}`;
}

function ensureCandidate(
  candidates: Map<string, MutableCandidate>,
  output: EvalResultOutputInput
): MutableCandidate {
  const existing = candidates.get(output.candidateCatalogId);
  if (existing) return existing;
  const candidate: MutableCandidate = {
    candidateCatalogId: output.candidateCatalogId,
    candidateLabel: output.candidateLabel,
    kind: output.kind,
    outputCount: 0,
    completed: 0,
    failures: 0,
    exclusions: 0,
    denominator: 0,
    numerator: 0,
    rate: null,
    warning: null,
    confidence: { wilson: null, simple: null },
    blindKeys: new Set(),
  };
  candidates.set(output.candidateCatalogId, candidate);
  return candidate;
}

function ensureCase(
  cases: Map<string, EvalCaseResultSummary>,
  caseId: string
): EvalCaseResultSummary {
  const existing = cases.get(caseId);
  if (existing) return existing;
  const summary: EvalCaseResultSummary = {
    caseId,
    completed: 0,
    failures: 0,
    exclusions: 0,
    judgments: 0,
    candidates: [],
  };
  cases.set(caseId, summary);
  return summary;
}

function scoreGenerationJudgment(
  judgment: EvalResultJudgmentInput,
  outputByBlindKey: ReadonlyMap<string, EvalResultOutputInput>
):
  | {
      denominators: Array<{ candidateCatalogId: string }>;
      numerators: Array<{ candidateCatalogId: string; value: number }>;
    }
  | null {
  if (judgment.blindOrder.length < 2) return null;
  const outputs = judgment.blindOrder
    .slice(0, 2)
    .map((blindKey) => outputByBlindKey.get(blindKey));
  if (
    outputs.some(
      (output) => !output || output.status !== "completed" || output.kind !== "generation"
    )
  ) {
    return null;
  }
  const [left, right] = outputs as [EvalResultOutputInput, EvalResultOutputInput];
  const denominators = [
    { candidateCatalogId: left.candidateCatalogId },
    { candidateCatalogId: right.candidateCatalogId },
  ];
  if (judgment.choice === "a") {
    return {
      denominators,
      numerators: [{ candidateCatalogId: left.candidateCatalogId, value: 1 }],
    };
  }
  if (judgment.choice === "b") {
    return {
      denominators,
      numerators: [{ candidateCatalogId: right.candidateCatalogId, value: 1 }],
    };
  }
  if (judgment.choice === "tie") {
    return {
      denominators,
      numerators: [
        { candidateCatalogId: left.candidateCatalogId, value: 0.5 },
        { candidateCatalogId: right.candidateCatalogId, value: 0.5 },
      ],
    };
  }
  if (judgment.choice === "neither") return { denominators, numerators: [] };
  return null;
}

function scoreDiscoveryJudgment(
  judgment: EvalResultJudgmentInput,
  outputByBlindKey: ReadonlyMap<string, EvalResultOutputInput>
): { candidateCatalogId: string; relevant: boolean } | null {
  if (judgment.blindOrder.length !== 1) return null;
  const output = outputByBlindKey.get(judgment.blindOrder[0]);
  if (!output || output.status !== "completed" || output.kind !== "discovery") {
    return null;
  }
  if (judgment.choice !== "relevant" && judgment.choice !== "not_relevant") {
    return null;
  }
  return {
    candidateCatalogId: output.candidateCatalogId,
    relevant: judgment.choice === "relevant",
  };
}

function finalizeCandidate(
  candidate: MutableCandidate,
  minSampleSize: number
): EvalCandidateResultSummary {
  const summary: EvalCandidateResultSummary = {
    candidateCatalogId: candidate.candidateCatalogId,
    candidateLabel: candidate.candidateLabel,
    kind: candidate.kind,
    outputCount: candidate.outputCount,
    completed: candidate.completed,
    failures: candidate.failures,
    exclusions: candidate.exclusions,
    denominator: candidate.denominator,
    numerator: candidate.numerator,
    rate: candidate.rate,
    warning: candidate.warning,
    confidence: candidate.confidence,
  };
  if (summary.denominator > 0) {
    summary.rate = roundRate(summary.numerator / summary.denominator);
    summary.confidence = confidenceIntervals({
      numerator: summary.numerator,
      denominator: summary.denominator,
    });
  }
  summary.warning =
    summary.denominator > 0 && summary.denominator < minSampleSize
      ? "min_sample"
      : null;
  return summary;
}

function validRateInputs(args: { numerator: number; denominator: number }) {
  return (
    Number.isFinite(args.numerator) &&
    Number.isInteger(args.denominator) &&
    args.denominator > 0 &&
    args.numerator >= 0 &&
    args.numerator <= args.denominator
  );
}

function wilsonInterval(
  numerator: number,
  denominator: number
): EvalConfidenceInterval {
  const z = 1.959963984540054;
  const p = numerator / denominator;
  const denominatorTerm = 1 + (z * z) / denominator;
  const center = p + (z * z) / (2 * denominator);
  const spread =
    z *
    Math.sqrt((p * (1 - p) + (z * z) / (4 * denominator)) / denominator);
  return {
    method: "wilson",
    level: 0.95,
    lower: roundRate(Math.max(0, (center - spread) / denominatorTerm)),
    upper: roundRate(Math.min(1, (center + spread) / denominatorTerm)),
  };
}

function simpleInterval(
  numerator: number,
  denominator: number
): EvalConfidenceInterval {
  const z = 1.959963984540054;
  const p = numerator / denominator;
  const spread = z * Math.sqrt((p * (1 - p)) / denominator);
  return {
    method: "simple",
    level: 0.95,
    lower: roundRate(Math.max(0, p - spread)),
    upper: roundRate(Math.min(1, p + spread)),
  };
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
