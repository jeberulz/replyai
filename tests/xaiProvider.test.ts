import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { xaiDiscoveryConfig } from "../src/lib/providers/config";
import { verifyXaiModelEntitlement } from "../src/lib/providers/xai";

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

  it("keeps invalid reasoning env values fail-closed to low", () => {
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", "extreme");

    expect(xaiDiscoveryConfig().reasoningEffort).toBe("low");
  });
});

describe("verifyXaiModelEntitlement", () => {
  it("does not call the network when the xAI key is missing", async () => {
    const fetchImpl = vi.fn();

    const result = await verifyXaiModelEntitlement({
      config: {
        providerId: "xai",
        apiKey: "",
        baseUrl: "https://api.x.ai/v1",
        enabled: false,
        modelId: "grok-4.3",
        reasoningEffort: "low",
        modelsUrl: "https://api.x.ai/v1/models",
        pricing: { inputPerMTok: 1.25, outputPerMTok: 2.5 },
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
        providerId: "xai",
        apiKey: "xai_test_key",
        baseUrl: "https://api.x.ai/v1",
        enabled: true,
        modelId: "grok-4.3",
        reasoningEffort: "low",
        modelsUrl: "https://api.x.ai/v1/models",
        pricing: { inputPerMTok: 1.25, outputPerMTok: 2.5 },
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
        providerId: "xai",
        apiKey: "xai_secret_value_1234567890",
        baseUrl: "https://api.x.ai/v1",
        enabled: true,
        modelId: "grok-4.3",
        reasoningEffort: "low",
        modelsUrl: "https://api.x.ai/v1/models",
        pricing: { inputPerMTok: 1.25, outputPerMTok: 2.5 },
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
        providerId: "xai",
        apiKey: "xai-secret-token-1234567890",
        baseUrl: "https://api.x.ai/v1",
        enabled: true,
        modelId: "grok-4.3",
        reasoningEffort: "low",
        modelsUrl: "https://api.x.ai/v1/models",
        pricing: { inputPerMTok: 1.25, outputPerMTok: 2.5 },
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
