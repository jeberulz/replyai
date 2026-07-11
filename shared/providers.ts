export const AI_PROVIDER_IDS = ["anthropic", "xai", "demo"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const AI_CAPABILITIES = [
  "analysis",
  "generation",
  "rewrite",
  "judge",
  "discovery",
  "x_search",
] as const;
export type AiCapability = (typeof AI_CAPABILITIES)[number];

export const AI_OPERATIONS = [
  "analysis",
  "generation",
  "rewrite",
  "judge",
  "compose",
  "discovery",
] as const;
export type AiOperation = (typeof AI_OPERATIONS)[number];

export const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "adaptive",
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export type ProviderPricing = {
  inputPerMTok: number;
  outputPerMTok: number;
  cachedInputPerMTok?: number;
  reasoningPerMTok?: number;
};

export type ProviderUsageInput = {
  providerId: AiProviderId;
  modelId: string;
  operation: AiOperation;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  cachedTokensIn?: number;
  reasoningTokens?: number;
  toolCalls?: number;
  successfulToolCalls?: number;
  reasoningEffort?: ReasoningEffort;
};

export type NormalizedProviderUsage = Required<
  Omit<ProviderUsageInput, "latencyMs" | "reasoningEffort">
> & {
  latencyMs: number | null;
  reasoningEffort: ReasoningEffort | null;
  costUsd: number;
};

export type LegacyTokenUsage = {
  tokensIn: number;
  tokensOut: number;
};

export type ProviderGenerationRequest<TInput = unknown> = {
  providerId: AiProviderId;
  modelId: string;
  operation: Exclude<AiOperation, "discovery">;
  input: TInput;
  reasoningEffort?: ReasoningEffort;
};

export type ProviderDiscoveryRequest<TInput = unknown> = {
  providerId: AiProviderId;
  modelId: string;
  operation: "discovery";
  input: TInput;
  reasoningEffort: ReasoningEffort;
  maxToolCalls: number;
};

export type ProviderResult<TOutput = unknown> = {
  output: TOutput;
  usage: NormalizedProviderUsage;
  rawProviderResponseId?: string;
};

export type NormalizedProviderError = {
  providerId?: AiProviderId;
  modelId?: string;
  operation?: AiOperation;
  code: string;
  status: number | null;
  retryable: boolean;
  message: string;
  redactedMessage: string;
};

const SECRET_PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\b(?:xai|sk|sk-ant|gho)_[A-Za-z0-9._-]{12,}\b/gi,
  /\b(?:xai|sk|sk-ant|gho)-[A-Za-z0-9._-]{12,}\b/gi,
  /\b(ANTHROPIC_API_KEY|XAI_API_KEY|api[_-]?key)\s*[:=]\s*["']?[^"',\s]+/gi,
];

export function redactProviderText(text: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[redacted]"),
    text
  );
}

export function estimateProviderCostUsd(
  pricing: ProviderPricing | null | undefined,
  usage: Pick<
    ProviderUsageInput,
    "tokensIn" | "tokensOut" | "cachedTokensIn" | "reasoningTokens"
  >
): number {
  if (!pricing) return 0;
  const uncachedInput = Math.max(
    0,
    (usage.tokensIn ?? 0) - (usage.cachedTokensIn ?? 0)
  );
  return (
    (uncachedInput / 1_000_000) * pricing.inputPerMTok +
    ((usage.cachedTokensIn ?? 0) / 1_000_000) *
      (pricing.cachedInputPerMTok ?? pricing.inputPerMTok) +
    ((usage.tokensOut ?? 0) / 1_000_000) * pricing.outputPerMTok +
    ((usage.reasoningTokens ?? 0) / 1_000_000) *
      (pricing.reasoningPerMTok ?? pricing.outputPerMTok)
  );
}

export function normalizeProviderUsage(
  input: ProviderUsageInput,
  pricing?: ProviderPricing | null
): NormalizedProviderUsage {
  const usage = {
    providerId: input.providerId,
    modelId: input.modelId,
    operation: input.operation,
    latencyMs: input.latencyMs ?? null,
    tokensIn: input.tokensIn ?? 0,
    tokensOut: input.tokensOut ?? 0,
    cachedTokensIn: input.cachedTokensIn ?? 0,
    reasoningTokens: input.reasoningTokens ?? 0,
    toolCalls: input.toolCalls ?? 0,
    successfulToolCalls: input.successfulToolCalls ?? 0,
    reasoningEffort: input.reasoningEffort ?? null,
    costUsd: 0,
  };
  return {
    ...usage,
    costUsd: estimateProviderCostUsd(pricing, usage),
  };
}
export function legacyTokenUsage(
  usage: Pick<NormalizedProviderUsage, "tokensIn" | "tokensOut">
): LegacyTokenUsage {
  return { tokensIn: usage.tokensIn, tokensOut: usage.tokensOut };
}

export function isRetryableProviderStatus(status: number | null): boolean {
  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    (status !== null && status >= 500)
  );
}

export function normalizeProviderError(
  error: unknown,
  context: {
    providerId?: AiProviderId;
    modelId?: string;
    operation?: AiOperation;
    status?: number | null;
    code?: string;
  } = {}
): NormalizedProviderError {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Provider request failed";
  const status = context.status ?? null;
  const code =
    context.code ??
    (status === 401 || status === 403
      ? "entitlement_denied"
      : status === 429
        ? "rate_limited"
        : isRetryableProviderStatus(status)
          ? "provider_unavailable"
          : "provider_error");
  return {
    providerId: context.providerId,
    modelId: context.modelId,
    operation: context.operation,
    code,
    status,
    retryable: isRetryableProviderStatus(status),
    message: redactProviderText(rawMessage),
    redactedMessage: redactProviderText(rawMessage),
  };
}
