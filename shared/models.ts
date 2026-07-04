/**
 * Claude model catalog, shared by the Next.js app and Convex functions.
 *
 * Pricing is USD per million tokens (June 2026). Used for the estimated-cost
 * display in the model eval — estimates, not billing-grade numbers.
 */

export type ModelInfo = {
  id: string;
  label: string;
  tier: string;
  description: string;
  inputPerMTok: number;
  outputPerMTok: number;
};

export const MODELS: ModelInfo[] = [
  {
    id: "claude-opus-4-8",
    label: "Opus 4.8",
    tier: "Highest quality",
    description:
      "The most capable tier. Best voice match and sharpest angles; slowest and priciest.",
    inputPerMTok: 5,
    outputPerMTok: 25,
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    tier: "Balanced",
    description:
      "Near-Opus quality at a fraction of the cost. The sweet spot for high-volume replying.",
    inputPerMTok: 3,
    outputPerMTok: 15,
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    tier: "Fastest / cheapest",
    description:
      "Fastest and cheapest. Fine for short, simple replies; weaker on nuanced angles.",
    inputPerMTok: 1,
    outputPerMTok: 5,
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export function modelInfo(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function isKnownModel(id: string): boolean {
  return MODELS.some((m) => m.id === id);
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
