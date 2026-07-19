import { describe, expect, it } from "vitest";
import {
  estimateProviderCostUsd,
  normalizeProviderError,
  normalizeProviderUsage,
  redactProviderText,
} from "../shared/providers";

describe("provider usage normalization", () => {
  it("normalizes token, cache, reasoning, tool, latency, and cost fields", () => {
    const usage = normalizeProviderUsage(
      {
        providerId: "xai",
        modelId: "grok-4.3",
        operation: "discovery",
        latencyMs: 321,
        tokensIn: 1000,
        cachedTokensIn: 400,
        tokensOut: 200,
        reasoningTokens: 50,
        toolCalls: 3,
        successfulToolCalls: 2,
        reasoningEffort: "low",
      },
      {
        inputPerMTok: 1.25,
        cachedInputPerMTok: 0.25,
        outputPerMTok: 2.5,
      }
    );

    expect(usage).toMatchObject({
      providerId: "xai",
      modelId: "grok-4.3",
      operation: "discovery",
      latencyMs: 321,
      tokensIn: 1000,
      cachedTokensIn: 400,
      tokensOut: 200,
      reasoningTokens: 50,
      toolCalls: 3,
      successfulToolCalls: 2,
      reasoningEffort: "low",
    });
    expect(usage.costUsd).toBeCloseTo(0.001475, 8);
  });

  it("returns zero cost without pricing", () => {
    expect(
      estimateProviderCostUsd(undefined, {
        tokensIn: 1000,
        tokensOut: 1000,
      })
    ).toBe(0);
  });
});
describe("provider error normalization", () => {
  it("redacts provider secrets from messages", () => {
    const text =
      "Bearer xai-secret-token-1234567890 and XAI_API_KEY=xai_abcdefghijklmnopqrstuvwxyz failed";
    expect(redactProviderText(text)).not.toContain("xai-secret-token");
    expect(redactProviderText(text)).not.toContain("abcdefghijklmnopqrstuvwxyz");
  });

  it("marks provider throttling as retryable and redacts the public message", () => {
    const error = normalizeProviderError(
      "api_key=sk-ant-abcdefghijklmnopqrstuvwxyz rate limit",
      {
        providerId: "anthropic",
        modelId: "claude-sonnet-5",
        operation: "generation",
        status: 429,
      }
    );

    expect(error.retryable).toBe(true);
    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(error.redactedMessage).not.toContain("sk-ant");
  });
});
