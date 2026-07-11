import type {
  AiCapability,
  AiProviderId,
  ProviderPricing,
  ReasoningEffort,
} from "./providers";

export type ModelInfo = {
  id: string;
  providerId: AiProviderId;
  label: string;
  tier: string;
  description: string;
  capabilities: readonly AiCapability[];
  defaultReasoningEffort?: ReasoningEffort;
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
};

/**
 * Claude generation catalog, shared by the Next.js app and Convex functions.
 *
 * Pricing is USD per million tokens (June 2026). Used for the estimated-cost
 * display in the current model eval — estimates, not billing-grade numbers.
 */
export const GENERATION_MODELS: ModelInfo[] = [
  {
    id: "claude-opus-4-8",
    providerId: "anthropic",
    label: "Opus 4.8",
    tier: "Highest quality",
    description:
      "The most capable tier. Best voice match and sharpest angles; slowest and priciest.",
    capabilities: ["analysis", "generation", "rewrite", "judge"],
    inputPerMTok: 5,
    outputPerMTok: 25,
  },
  {
    id: "claude-sonnet-5",
    providerId: "anthropic",
    label: "Sonnet 5",
    tier: "Balanced",
    description:
      "Near-Opus quality at a fraction of the cost. The sweet spot for high-volume replying.",
    capabilities: ["generation", "rewrite"],
    inputPerMTok: 3,
    outputPerMTok: 15,
  },
  {
    id: "claude-haiku-4-5",
    providerId: "anthropic",
    label: "Haiku 4.5",
    tier: "Fastest / cheapest",
    description:
      "Fastest and cheapest. Fine for short, simple replies; weaker on nuanced angles.",
    capabilities: ["generation", "rewrite"],
    inputPerMTok: 1,
    outputPerMTok: 5,
  },
];

export const XAI_DISCOVERY_MODEL_ID = "grok-4.3";

export const DISCOVERY_MODELS: ModelInfo[] = [
  {
    id: XAI_DISCOVERY_MODEL_ID,
    providerId: "xai",
    label: "Grok 4.3",
    tier: "Discovery research",
    description:
      "Pinned Grok discovery model for future X Search research; not exposed as a user generation choice.",
    capabilities: ["discovery", "x_search"],
    defaultReasoningEffort: "low",
    inputPerMTok: 1.25,
    outputPerMTok: 2.5,
  },
];

export const ALL_MODELS: ModelInfo[] = [
  ...GENERATION_MODELS,
  ...DISCOVERY_MODELS,
];

// Backwards-compatible export for existing generation model pickers/evals.
export const MODELS = GENERATION_MODELS;

export const DEFAULT_MODEL_ID = MODELS[0].id;
export const DEFAULT_DISCOVERY_MODEL_ID = XAI_DISCOVERY_MODEL_ID;
export const DEFAULT_DISCOVERY_REASONING_EFFORT = "low" satisfies ReasoningEffort;

export function modelInfo(id: string): ModelInfo | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function modelPricing(id: string): ProviderPricing | undefined {
  const info = modelInfo(id);
  if (!info) return undefined;
  return {
    inputPerMTok: info.inputPerMTok,
    outputPerMTok: info.outputPerMTok,
    cachedInputPerMTok: info.cachedInputPerMTok,
  };
}

export function isKnownModel(id: string): boolean {
  return MODELS.some((m) => m.id === id);
}

export function isKnownCatalogModel(id: string): boolean {
  return ALL_MODELS.some((m) => m.id === id);
}

export function modelsForCapability(capability: AiCapability): ModelInfo[] {
  return ALL_MODELS.filter((m) => m.capabilities.includes(capability));
}

export function modelLabel(id: string): string {
  return modelInfo(id)?.label ?? id;
}

/** Estimated cost in USD for a request on the given model. */
export function estimateCostUsd(
  modelId: string,
  tokensIn: number,
  tokensOut: number
): number {
  const info = modelInfo(modelId);
  if (!info) return 0;
  return (
    (tokensIn / 1_000_000) * info.inputPerMTok +
    (tokensOut / 1_000_000) * info.outputPerMTok
  );
}

/** "$0.0123" with enough precision for sub-cent amounts. */
export function formatUsd(amount: number): string {
  if (amount === 0) return "$0";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}
