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

function parseReasoningEffort(value: string): ReasoningEffort {
  return REASONING_EFFORTS.find((effort) => effort === value)
    ? (value as ReasoningEffort)
    : DEFAULT_DISCOVERY_REASONING_EFFORT;
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
  return {
    providerId: "xai",
    apiKey: env.xaiApiKey,
    baseUrl,
    enabled: hasXaiKey(),
    modelId,
    reasoningEffort:
      model?.defaultReasoningEffort ??
      parseReasoningEffort(env.xaiDiscoveryReasoningEffort),
    modelsUrl: `${baseUrl}/models`,
    pricing: modelPricing(modelId),
  };
}
