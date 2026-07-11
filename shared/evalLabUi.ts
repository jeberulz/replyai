import {
  EVAL_EXPERIMENT_STATUSES,
  EVAL_KINDS,
  type EvalCandidateCatalogEntry,
  type EvalCandidateStage,
  type EvalExperimentStatus,
  type EvalKind,
} from "./evalLab";
import { EVAL_RUNNER_LIMITS } from "./evalRunner";

export type EvalDatasetOption = {
  id: string;
  name: string;
  kind: EvalKind;
  version: string;
  sourcePolicy: "synthetic" | "product_team" | "consented_user";
  caseCount: number;
  datasetHash: string;
  description?: string;
};

export type EvalExperimentSetupInput = {
  name: string;
  kind: EvalKind;
  datasetId: string;
  candidateCatalogIds: string[];
  promptVersion: string;
  schemaVersion: string;
  seed: string;
  budgetUsd: number;
  concurrency: number;
  caseLimit: number;
  startNow: boolean;
};

export type EvalSetupValidationResult =
  | { ok: true; value: EvalExperimentSetupInput }
  | { ok: false; errors: string[] };

export type EvalRunSummary = {
  counts?: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    excluded: number;
  };
  spendUsd?: number;
  status?: string;
  error?: string;
};

export type EvalExperimentListItem = {
  id: string;
  name: string;
  kind: EvalKind;
  status: EvalExperimentStatus;
  datasetId: string;
  datasetName: string;
  datasetVersion: string;
  datasetCaseCount: number;
  candidateLabels: string[];
  candidateCatalogIds: string[];
  budgetUsd: number;
  concurrency: number;
  caseLimit: number;
  createdAt: number;
  updatedAt: number;
  run?: EvalRunSummary;
};

export type EvalExperimentFilters = {
  query?: string;
  kind?: "all" | EvalKind;
  status?: "all" | EvalExperimentStatus;
};

export function parseEvalKind(value: unknown): EvalKind | null {
  return typeof value === "string" && EVAL_KINDS.includes(value as EvalKind)
    ? (value as EvalKind)
    : null;
}

export function parseEvalStatus(value: unknown): EvalExperimentStatus | null {
  return typeof value === "string" &&
    EVAL_EXPERIMENT_STATUSES.includes(value as EvalExperimentStatus)
    ? (value as EvalExperimentStatus)
    : null;
}

export function validateEvalSetupInput(args: {
  raw: {
    name?: unknown;
    kind?: unknown;
    datasetId?: unknown;
    candidateCatalogIds?: unknown;
    promptVersion?: unknown;
    schemaVersion?: unknown;
    seed?: unknown;
    budgetUsd?: unknown;
    concurrency?: unknown;
    caseLimit?: unknown;
    startNow?: unknown;
  };
  datasets: readonly EvalDatasetOption[];
  catalog: readonly EvalCandidateCatalogEntry[];
}): EvalSetupValidationResult {
  const errors: string[] = [];
  const kind = parseEvalKind(args.raw.kind);
  const name = cleanText(args.raw.name);
  const datasetId = cleanText(args.raw.datasetId);
  const promptVersion = cleanText(args.raw.promptVersion) || "prompt:v1";
  const schemaVersion = cleanText(args.raw.schemaVersion) || "schema:v1";
  const seed = cleanText(args.raw.seed) || `wp46-${Date.now()}`;
  const budgetUsd = Number(args.raw.budgetUsd);
  const concurrency = Number(args.raw.concurrency);
  const caseLimit = Number(args.raw.caseLimit);
  const candidateCatalogIds = Array.isArray(args.raw.candidateCatalogIds)
    ? args.raw.candidateCatalogIds.map(cleanText).filter(Boolean)
    : [];

  if (!name) errors.push("Name the experiment.");
  if (!kind) errors.push("Choose an experiment kind.");

  const dataset = args.datasets.find((item) => item.id === datasetId);
  if (!dataset) {
    errors.push("Choose a versioned dataset.");
  } else if (kind && dataset.kind !== kind) {
    errors.push("Dataset kind must match the experiment kind.");
  }

  if (candidateCatalogIds.length < 1) {
    errors.push("Select at least one candidate.");
  }
  const seen = new Set<string>();
  for (const candidateId of candidateCatalogIds) {
    const candidate = args.catalog.find((entry) => entry.id === candidateId);
    if (seen.has(candidateId)) {
      errors.push(`Duplicate candidate: ${candidateId}`);
    } else if (!candidate || (kind && candidate.kind !== kind)) {
      errors.push(`Unknown candidate for this kind: ${candidateId}`);
    }
    seen.add(candidateId);
  }

  if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) {
    errors.push("Budget must be greater than $0.");
  } else if (budgetUsd > EVAL_RUNNER_LIMITS.maxBudgetUsd) {
    errors.push(`Budget cannot exceed $${EVAL_RUNNER_LIMITS.maxBudgetUsd}.`);
  }
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > EVAL_RUNNER_LIMITS.maxConcurrency
  ) {
    errors.push(
      `Concurrency must be between 1 and ${EVAL_RUNNER_LIMITS.maxConcurrency}.`
    );
  }
  const maxCases = Math.min(
    dataset?.caseCount ?? EVAL_RUNNER_LIMITS.maxCaseLimit,
    EVAL_RUNNER_LIMITS.maxCaseLimit
  );
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || caseLimit > maxCases) {
    errors.push(`Case count must be between 1 and ${maxCases}.`);
  }

  if (errors.length > 0 || !kind) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      kind,
      datasetId,
      candidateCatalogIds,
      promptVersion,
      schemaVersion,
      seed,
      budgetUsd,
      concurrency,
      caseLimit,
      startNow: args.raw.startNow === true || args.raw.startNow === "on",
    },
  };
}

export function estimateEvalSetupCostUsd(args: {
  catalog: readonly EvalCandidateCatalogEntry[];
  candidateCatalogIds: readonly string[];
  caseLimit: number;
  budgetUsd: number;
}): number {
  const perCase = args.candidateCatalogIds.reduce((total, candidateId) => {
    const candidate = args.catalog.find(
      (entry) => entry.id === candidateId
    );
    if (!candidate) return total;
    return (
      total +
      candidate.stages.reduce((stageTotal, stage) => {
        const pricing = stagePricing(stage);
        if (!pricing) return stageTotal + 0.002;
        const inputTokens = stage.role === "discovery" ? 1200 : 1600;
        const outputTokens = stage.role === "discovery" ? 350 : 450;
        return (
          stageTotal +
          (inputTokens / 1_000_000) * pricing.inputPerMTok +
          (outputTokens / 1_000_000) * pricing.outputPerMTok
        );
      }, 0)
    );
  }, 0);
  return roundUsd(Math.min(args.budgetUsd, perCase * args.caseLimit));
}

export function evalProgressPercent(run?: EvalRunSummary): number {
  const total = run?.counts?.total ?? 0;
  if (total <= 0) return 0;
  const done =
    (run?.counts?.completed ?? 0) +
    (run?.counts?.failed ?? 0) +
    (run?.counts?.excluded ?? 0);
  return Math.min(100, Math.round((done / total) * 100));
}

export function filterEvalExperiments(
  experiments: readonly EvalExperimentListItem[],
  filters: EvalExperimentFilters
): EvalExperimentListItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return experiments.filter((experiment) => {
    if (filters.kind && filters.kind !== "all" && experiment.kind !== filters.kind) {
      return false;
    }
    if (
      filters.status &&
      filters.status !== "all" &&
      experiment.status !== filters.status
    ) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      experiment.name,
      experiment.kind,
      experiment.status,
      experiment.datasetName,
      experiment.datasetVersion,
      ...experiment.candidateLabels,
      ...experiment.candidateCatalogIds,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function evalStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundUsd(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function stagePricing(stage: EvalCandidateStage):
  | {
      inputPerMTok: number;
      outputPerMTok: number;
      cachedInputPerMTok?: number;
    }
  | undefined {
  return (
    stage as EvalCandidateStage & {
      pricing?: {
        inputPerMTok: number;
        outputPerMTok: number;
        cachedInputPerMTok?: number;
      };
    }
  ).pricing;
}
