import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";

import { modelPricing } from "../../../shared/models";
import {
  legacyTokenUsage,
  normalizeProviderUsage,
  type AiOperation,
  type LegacyTokenUsage,
  type NormalizedProviderUsage,
} from "../../../shared/providers";

type AnthropicUsageLike = Pick<
  Message["usage"],
  "input_tokens" | "output_tokens" | "cache_read_input_tokens" | "cache_creation_input_tokens"
>;

export function normalizeAnthropicUsage(args: {
  modelId: string;
  operation: Exclude<AiOperation, "discovery">;
  usage: AnthropicUsageLike;
  latencyMs?: number;
}): NormalizedProviderUsage {
  return normalizeProviderUsage(
    {
      providerId: "anthropic",
      modelId: args.modelId,
      operation: args.operation,
      latencyMs: args.latencyMs,
      tokensIn: args.usage.input_tokens,
      tokensOut: args.usage.output_tokens,
      cachedTokensIn:
        (args.usage.cache_read_input_tokens ?? 0) +
        (args.usage.cache_creation_input_tokens ?? 0),
    },
    modelPricing(args.modelId)
  );
}

export function legacyAnthropicUsage(args: {
  modelId: string;
  operation: Exclude<AiOperation, "discovery">;
  usage: AnthropicUsageLike;
  latencyMs?: number;
}): LegacyTokenUsage {
  return legacyTokenUsage(normalizeAnthropicUsage(args));
}
