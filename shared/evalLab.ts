import { ALL_MODELS, modelInfo, modelPricing } from "./models";
import type { AiProviderId, ReasoningEffort } from "./providers";

export const EVAL_KINDS = ["generation", "discovery", "pipeline"] as const;
export type EvalKind = (typeof EVAL_KINDS)[number];

export const EVAL_DATASET_SOURCE_POLICIES = [
  "synthetic",
  "product_team",
  "consented_user",
] as const;
export type EvalDatasetSourcePolicy =
  (typeof EVAL_DATASET_SOURCE_POLICIES)[number];

export const EVAL_EXPERIMENT_STATUSES = [
  "draft",
  "ready",
  "running",
  "completed",
  "cancelled",
  "failed",
] as const;
export type EvalExperimentStatus = (typeof EVAL_EXPERIMENT_STATUSES)[number];

export const EVAL_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "cancelled",
  "failed",
] as const;
export type EvalRunStatus = (typeof EVAL_RUN_STATUSES)[number];

export const EVAL_DECISIONS = [
  "promote_to_shadow",
  "promote_to_assisted",
  "retest",
  "reject",
] as const;
export type EvalDecision = (typeof EVAL_DECISIONS)[number];

export type EvalCandidateStage = {
  role: "generation" | "discovery";
  providerId: AiProviderId;
  modelId: string;
  reasoningEffort?: ReasoningEffort;
};

export type EvalCandidateCatalogEntry = {
  id: string;
  kind: EvalKind;
  label: string;
  description: string;
  stages: readonly EvalCandidateStage[];
};

const generationModels = ALL_MODELS.filter((model) =>
  model.capabilities.includes("generation")
);

const discoveryModels = ALL_MODELS.filter((model) =>
  model.capabilities.includes("discovery")
);

export const EVAL_CANDIDATE_CATALOG: readonly EvalCandidateCatalogEntry[] = [
  ...generationModels.map((model) => ({
    id: `generation:${model.id}`,
    kind: "generation" as const,
    label: model.label,
    description: `${model.providerId} generation using ${model.id}`,
    stages: [
      {
        role: "generation" as const,
        providerId: model.providerId,
        modelId: model.id,
        reasoningEffort: model.defaultReasoningEffort,
      },
    ],
  })),
  ...discoveryModels.map((model) => ({
    id: `discovery:${model.id}`,
    kind: "discovery" as const,
    label: model.label,
    description: `${model.providerId} discovery using ${model.id}`,
    stages: [
      {
        role: "discovery" as const,
        providerId: model.providerId,
        modelId: model.id,
        reasoningEffort: model.defaultReasoningEffort,
      },
    ],
  })),
  ...discoveryModels.flatMap((discoveryModel) =>
    generationModels.map((generationModel) => ({
      id: `pipeline:${discoveryModel.id}->${generationModel.id}`,
      kind: "pipeline" as const,
      label: `${discoveryModel.label} discovery -> ${generationModel.label} generation`,
      description:
        "Pipeline candidate with discovery and generation snapshots stored separately.",
      stages: [
        {
          role: "discovery" as const,
          providerId: discoveryModel.providerId,
          modelId: discoveryModel.id,
          reasoningEffort: discoveryModel.defaultReasoningEffort,
        },
        {
          role: "generation" as const,
          providerId: generationModel.providerId,
          modelId: generationModel.id,
          reasoningEffort: generationModel.defaultReasoningEffort,
        },
      ],
    }))
  ),
];

export function evalCandidateById(
  candidateCatalogId: string
): EvalCandidateCatalogEntry | undefined {
  return EVAL_CANDIDATE_CATALOG.find((entry) => entry.id === candidateCatalogId);
}

export function evalCandidatesForKind(
  kind: EvalKind
): readonly EvalCandidateCatalogEntry[] {
  return EVAL_CANDIDATE_CATALOG.filter((entry) => entry.kind === kind);
}

export function validateEvalCandidateIds(args: {
  kind: EvalKind;
  candidateCatalogIds: readonly string[];
}): EvalCandidateCatalogEntry[] {
  if (args.candidateCatalogIds.length === 0) {
    throw new Error("Select at least one eval candidate");
  }

  const seen = new Set<string>();
  return args.candidateCatalogIds.map((candidateCatalogId) => {
    if (seen.has(candidateCatalogId)) {
      throw new Error(`Duplicate eval candidate: ${candidateCatalogId}`);
    }
    seen.add(candidateCatalogId);

    const candidate = evalCandidateById(candidateCatalogId);
    if (!candidate || candidate.kind !== args.kind) {
      throw new Error(`Unknown eval candidate: ${candidateCatalogId}`);
    }
    return candidate;
  });
}

export function freezeEvalCandidateSnapshot(
  candidate: EvalCandidateCatalogEntry
) {
  return {
    catalogId: candidate.id,
    kind: candidate.kind,
    label: candidate.label,
    stages: candidate.stages.map((stage) => {
      const model = modelInfo(stage.modelId);
      const pricing = modelPricing(stage.modelId);
      return {
        role: stage.role,
        providerId: stage.providerId,
        modelId: stage.modelId,
        reasoningEffort: stage.reasoningEffort,
        capabilities: model?.capabilities ?? [],
        pricing:
          pricing === undefined
            ? undefined
            : {
                inputPerMTok: pricing.inputPerMTok,
                outputPerMTok: pricing.outputPerMTok,
                cachedInputPerMTok: pricing.cachedInputPerMTok,
              },
      };
    }),
  };
}
