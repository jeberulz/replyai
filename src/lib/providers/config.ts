import "server-only";

import { env, hasAnthropicKey, hasXaiKey } from "../env";
import {
  DEFAULT_DISCOVERY_MODEL_ID,
  DEFAULT_DISCOVERY_REASONING_EFFORT,
  modelInfo,
  modelPricing,
} from "../../../shared/models";
import type { AiProviderId, ReasoningEffort } from "../../../shared/providers";
import { REASONING_EFFORTS } from "../../../shared/providers";

export type ProviderRuntimeConfig = {
  providerId: AiProviderId;
  apiKey: string;
  baseUrl: string | null;
  enabled: boolean;
};

export type XaiDiscoveryConfig = ProviderRuntimeConfig & {
  providerId: "xai";
  modelId: string;
  reasoningEffort: ReasoningEffort;
  modelsUrl: string;
  pricing: ReturnType<typeof modelPricing>;
};

function parseReasoningEffort(value: string | undefined): ReasoningEffort | null {
  if (!value) return null;
  return REASONING_EFFORTS.find((effort) => effort === value)
    ? (value as ReasoningEffort)
    : null;
}

export function anthropicProviderConfig(): ProviderRuntimeConfig {
  return {
    providerId: "anthropic",
    apiKey: env.anthropicApiKey,
    baseUrl: null,
    enabled: hasAnthropicKey(),
  };
}

export function xaiDiscoveryConfig(): XaiDiscoveryConfig {
  const modelId = env.xaiDiscoveryModel || DEFAULT_DISCOVERY_MODEL_ID;
  const baseUrl = env.xaiBaseUrl;
  const model = modelInfo(modelId);
  const configuredReasoningEffort = parseReasoningEffort(
    process.env.XAI_DISCOVERY_REASONING_EFFORT
  );
  return {
    providerId: "xai",
    apiKey: env.xaiApiKey,
    baseUrl,
    enabled: hasXaiKey(),
    modelId,
    reasoningEffort:
      configuredReasoningEffort ??
      model?.defaultReasoningEffort ??
      DEFAULT_DISCOVERY_REASONING_EFFORT,
    modelsUrl: `${baseUrl}/models`,
    pricing: modelPricing(modelId),
  };
}
