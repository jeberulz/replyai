import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env.anthropicGenerateModel", () => {
  it("defaults generation to Sonnet even when no model env is set", () => {
    vi.stubEnv("ANTHROPIC_GENERATE_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_MODEL", undefined);
    expect(env.anthropicGenerateModel).toBe("claude-sonnet-5");
  });

  it("honors an explicit generation override above everything", () => {
    vi.stubEnv("ANTHROPIC_GENERATE_MODEL", "claude-haiku-4-5");
    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-4-8");
    expect(env.anthropicGenerateModel).toBe("claude-haiku-4-5");
  });

  it("falls back to ANTHROPIC_MODEL when generation is unset", () => {
    vi.stubEnv("ANTHROPIC_GENERATE_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-4-8");
    expect(env.anthropicGenerateModel).toBe("claude-opus-4-8");
  });

  it("keeps analysis on the strong base model by default", () => {
    vi.stubEnv("ANTHROPIC_ANALYZE_MODEL", undefined);
    vi.stubEnv("ANTHROPIC_MODEL", undefined);
    expect(env.anthropicAnalyzeModel).toBe("claude-opus-4-8");
  });
});

describe("env.publicDemoEnabled", () => {
  it("defaults off in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_PUBLIC_DEMO", undefined);

    expect(env.publicDemoEnabled).toBe(false);
  });

  it("allows an explicit demo enable override", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_PUBLIC_DEMO", "true");

    expect(env.publicDemoEnabled).toBe(true);
  });

  it("defaults on locally unless explicitly disabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ENABLE_PUBLIC_DEMO", undefined);
    expect(env.publicDemoEnabled).toBe(true);

    vi.stubEnv("ENABLE_PUBLIC_DEMO", "false");
    expect(env.publicDemoEnabled).toBe(false);
  });
});

describe("env.xaiDiscoveryModel", () => {
  it("defaults to the pinned Grok discovery model", () => {
    vi.stubEnv("XAI_DISCOVERY_MODEL", undefined);
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", undefined);
    vi.stubEnv("XAI_BASE_URL", undefined);

    expect(env.xaiDiscoveryModel).toBe("grok-4.3");
    expect(env.xaiDiscoveryReasoningEffort).toBe("low");
    expect(env.xaiBaseUrl).toBe("https://api.x.ai/v1");
  });

  it("honors server-side xAI overrides and trims trailing base URL slashes", () => {
    vi.stubEnv("XAI_DISCOVERY_MODEL", "grok-4.3");
    vi.stubEnv("XAI_DISCOVERY_REASONING_EFFORT", "medium");
    vi.stubEnv("XAI_BASE_URL", "https://api.x.ai/v1/");

    expect(env.xaiDiscoveryModel).toBe("grok-4.3");
    expect(env.xaiDiscoveryReasoningEffort).toBe("medium");
    expect(env.xaiBaseUrl).toBe("https://api.x.ai/v1");
  });
});
