import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
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
