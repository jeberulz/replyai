import "server-only";

import { xaiDiscoveryConfig, type XaiDiscoveryConfig } from "./config";
import {
  normalizeProviderError,
  normalizeProviderUsage,
  type NormalizedProviderError,
  type NormalizedProviderUsage,
} from "../../../shared/providers";

type FetchLike = typeof fetch;

type XaiModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

export type XaiEntitlementResult =
  | {
      ok: true;
      providerId: "xai";
      modelId: string;
      availableModelIds: string[];
      usage: NormalizedProviderUsage;
    }
  | {
      ok: false;
      providerId: "xai";
      modelId: string;
      reason: "missing_api_key" | "model_not_available" | "request_failed";
      availableModelIds: string[];
      usage: NormalizedProviderUsage;
      error?: NormalizedProviderError;
    };

function emptyXaiUsage(config: XaiDiscoveryConfig, latencyMs?: number) {
  return normalizeProviderUsage(
    {
      providerId: "xai",
      modelId: config.modelId,
      operation: "discovery",
      latencyMs,
      reasoningEffort: config.reasoningEffort,
    },
    config.pricing
  );
}

function modelIdsFromModelsResponse(json: XaiModelsResponse): string[] {
  return (json.data ?? [])
    .map((model) => (typeof model.id === "string" ? model.id : null))
    .filter((modelId): modelId is string => Boolean(modelId));
}

export async function verifyXaiModelEntitlement(args: {
  config?: XaiDiscoveryConfig;
  fetchImpl?: FetchLike;
} = {}): Promise<XaiEntitlementResult> {
  const config = args.config ?? xaiDiscoveryConfig();
  const startedAt = Date.now();
  const fetchImpl = args.fetchImpl ?? fetch;

  if (!config.enabled) {
    return {
      ok: false,
      providerId: "xai",
      modelId: config.modelId,
      reason: "missing_api_key",
      availableModelIds: [],
      usage: emptyXaiUsage(config, 0),
    };
  }

  try {
    const response = await fetchImpl(config.modelsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const latencyMs = Date.now() - startedAt;
    const usage = emptyXaiUsage(config, latencyMs);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        providerId: "xai",
        modelId: config.modelId,
        reason: "request_failed",
        availableModelIds: [],
        usage,
        error: normalizeProviderError(body || response.statusText, {
          providerId: "xai",
          modelId: config.modelId,
          operation: "discovery",
          status: response.status,
        }),
      };
    }

    const json = (await response.json()) as XaiModelsResponse;
    const availableModelIds = modelIdsFromModelsResponse(json);
    const ok = availableModelIds.includes(config.modelId);
    return ok
      ? {
          ok: true,
          providerId: "xai",
          modelId: config.modelId,
          availableModelIds,
          usage,
        }
      : {
          ok: false,
          providerId: "xai",
          modelId: config.modelId,
          reason: "model_not_available",
          availableModelIds,
          usage,
          error: normalizeProviderError(
            `xAI model ${config.modelId} is not available to this API key`,
            {
              providerId: "xai",
              modelId: config.modelId,
              operation: "discovery",
              status: 403,
              code: "entitlement_denied",
            }
          ),
        };
  } catch (error) {
    return {
      ok: false,
      providerId: "xai",
      modelId: config.modelId,
      reason: "request_failed",
      availableModelIds: [],
      usage: emptyXaiUsage(config, Date.now() - startedAt),
      error: normalizeProviderError(error, {
        providerId: "xai",
        modelId: config.modelId,
        operation: "discovery",
        code: "network_error",
      }),
    };
  }
}
