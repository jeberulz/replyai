import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { xaiDiscoveryConfig } from "../src/lib/providers/config";
import {
  runHydratedXaiXSearchDiscovery,
  runXaiXSearchDiscovery,
  verifyXaiModelEntitlement,
} from "../src/lib/providers/xai";

const baseConfig = {
  providerId: "xai" as const,
  apiKey: "xai_test_key",
  baseUrl: "https://api.x.ai/v1",
  enabled: true,
  modelId: "grok-4.3",
  reasoningEffort: "low" as const,
  modelsUrl: "https://api.x.ai/v1/models",
  responsesUrl: "https://api.x.ai/v1/responses",
  timeoutMs: 20_000,
  pricing: { inputPerMTok: 1.25, cachedInputPerMTok: 0.2, outputPerMTok: 2.5 },
};

const baseRequest = {
  query: "AI workflow posts from founders",
  fromDate: "2026-07-10",
  toDate: "2026-07-11",
  maxResults: 5,
  maxToolCalls: 3,
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("xaiDiscoveryConfig", () => {
  it("defaults to the pinned Grok discovery model with low reasoning", () => {
    vi.stubEnv("XAI_API_KEY", undefined);
    vi.stubEnv("XAI_BASE_URL", undefined);
    vi.stubEnv("XAI_DISCOVERY_MODEL", undefined);
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", undefined);

    const config = xaiDiscoveryConfig();

    expect(config.enabled).toBe(false);
    expect(config.modelId).toBe("grok-4.3");
    expect(config.reasoningEffort).toBe("low");
    expect(config.modelsUrl).toBe("https://api.x.ai/v1/models");
  });

  it("honors a valid reasoning env override over the catalog default", () => {
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", "medium");

    expect(xaiDiscoveryConfig().reasoningEffort).toBe("medium");
  });

  it("keeps invalid reasoning env values fail-closed to the catalog default", () => {
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", "extreme");

    expect(xaiDiscoveryConfig().reasoningEffort).toBe("low");
  });
});

describe("verifyXaiModelEntitlement", () => {
  it("does not call the network when the xAI key is missing", async () => {
    const fetchImpl = vi.fn();

    const result = await verifyXaiModelEntitlement({
      config: {
        ...baseConfig,
        apiKey: "",
        enabled: false,
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected missing-key entitlement failure");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.reason).toBe("missing_api_key");
    expect(result.usage.tokensIn).toBe(0);
  });

  it("passes when /v1/models includes the pinned model", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: "grok-4.3" }, { id: "grok-4.5" }] }),
    }));

    const result = await verifyXaiModelEntitlement({
      config: {
        ...baseConfig,
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(result.availableModelIds).toEqual(["grok-4.3", "grok-4.5"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.x.ai/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer xai_test_key",
        }),
      })
    );
  });

  it("fails entitlement when the pinned model is absent", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ id: "grok-4.5" }] }),
    }));

    const result = await verifyXaiModelEntitlement({
      config: {
        ...baseConfig,
        apiKey: "xai_secret_value_1234567890",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected absent-model entitlement failure");
    expect(result.reason).toBe("model_not_available");
    expect(result.error?.code).toBe("entitlement_denied");
  });

  it("normalizes and redacts failed provider responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "bad key xai-secret-token-1234567890",
    }));

    const result = await verifyXaiModelEntitlement({
      config: {
        ...baseConfig,
        apiKey: "xai-secret-token-1234567890",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected provider request failure");
    expect(result.reason).toBe("request_failed");
    expect(result.error?.status).toBe(401);
    expect(result.error?.redactedMessage).not.toContain("xai-secret-token");
  });
});

describe("runXaiXSearchDiscovery", () => {
  it("does not call the network when the xAI key is missing", async () => {
    const fetchImpl = vi.fn();

    const result = await runXaiXSearchDiscovery({
      request: baseRequest,
      config: { ...baseConfig, apiKey: "", enabled: false },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    if (result.ok) throw new Error("expected missing key failure");
    expect(result.reason).toBe("missing_api_key");
  });

  it("builds a bounded Responses API x_search request and normalizes candidates", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.model).toBe("grok-4.3");
      expect(body.tools).toEqual([
        {
          type: "x_search",
          from_date: "2026-07-10",
          to_date: "2026-07-11",
          enable_image_understanding: false,
        },
      ]);
      expect(body.max_tool_calls).toBe(3);
      expect(body.reasoning).toEqual({ effort: "low" });
      expect(body.store).toBe(false);
      expect(String(body.input[0].content)).toContain("untrusted data");

      return {
        ok: true,
        json: async () => ({
          id: "resp_123",
          model: "grok-4.3",
          output_text: JSON.stringify({
            candidates: [
              {
                postUrl:
                  "https://x.com/sarahbuilds/status/1800000000000000001",
                tweetId: "1800000000000000001",
                authorHandle: "sarahbuilds",
                relevanceReason:
                  "Strong live AI workflow debate with room for a builder angle.",
                missingAngle:
                  "Connect workflow ownership to data quality, not model swaps.",
                searchIntent: "ai-workflow-moats",
                citations: [
                  "https://x.com/sarahbuilds/status/1800000000000000001",
                ],
                mediaInfluenced: false,
              },
            ],
          }),
          citations: ["https://x.com/sarahbuilds/status/1800000000000000001"],
          server_side_tool_usage: { SERVER_SIDE_TOOL_X_SEARCH: 1 },
          usage: {
            input_tokens: 1000,
            output_tokens: 200,
            input_tokens_details: { cached_tokens: 100 },
            output_tokens_details: { reasoning_tokens: 50 },
          },
        }),
      };
    });

    const result = await runXaiXSearchDiscovery({
      request: baseRequest,
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected x search success");
    expect(result.rawProviderResponseId).toBe("resp_123");
    expect(result.candidates).toHaveLength(1);
    expect(result.usage.successfulToolCalls).toBe(1);
    expect(result.usage.reasoningTokens).toBe(50);
    expect(result.usage.costUsd).toBeGreaterThan(0);
  });

  it("fails closed when x_search did not succeed", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({ candidates: [] }),
        citations: [],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    }));

    const result = await runXaiXSearchDiscovery({
      request: baseRequest,
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected missing tool failure");
    expect(result.reason).toBe("missing_successful_x_search");
  });

  it("normalizes and redacts provider failures", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "Bearer xai-secret-token-1234567890 over limit",
    }));

    const result = await runXaiXSearchDiscovery({
      request: baseRequest,
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected provider failure");
    expect(result.reason).toBe("request_failed");
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.redactedMessage).not.toContain("xai-secret-token");
  });
});

describe("runHydratedXaiXSearchDiscovery", () => {
  it("does not invoke paid xAI search without X hydration credentials", async () => {
    vi.stubEnv("X_CLIENT_ID", "");
    vi.stubEnv("X_CLIENT_SECRET", "");
    const fetchImpl = vi.fn();

    const result = await runHydratedXaiXSearchDiscovery({
      request: baseRequest,
      accessToken: "x-access-token",
      config: baseConfig,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected missing X credential failure");
    expect(result.validationErrors).toEqual(["missing_x_credentials"]);
  });
});
