import { describe, expect, it } from "vitest";
import {
  decideBetaAccess,
  normalizeXHandle,
  parseBetaAccessConfig,
} from "../src/lib/betaAccess";

describe("beta access", () => {
  it("normalizes X handles for allowlist checks", () => {
    expect(normalizeXHandle("@Founder_One")).toBe("founder_one");
    expect(normalizeXHandle(" bad handle ")).toBeNull();
    expect(normalizeXHandle("thishandleistoolong")).toBeNull();
  });

  it("allows normalized handles on the private beta allowlist", () => {
    const config = parseBetaAccessConfig({
      mode: "allowlist",
      allowedHandles: "@Founder_One, builder_two",
      accessDays: "10",
      nodeEnv: "production",
    });
    const decision = decideBetaAccess({
      handle: "FOUNDER_ONE",
      config,
      now: 1_000,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.normalizedHandle).toBe("founder_one");
    expect(decision.betaAccessExpiresAt).toBe(1_000 + 10 * 24 * 60 * 60 * 1000);
  });

  it("denies handles missing from the allowlist", () => {
    const config = parseBetaAccessConfig({
      mode: "allowlist",
      allowedHandles: "approved",
      nodeEnv: "production",
    });

    const decision = decideBetaAccess({ handle: "stranger", config });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("not_invited");
  });

  it("fails closed when production allowlist mode has no valid handles", () => {
    const config = parseBetaAccessConfig({
      mode: "allowlist",
      allowedHandles: " , @@@",
      nodeEnv: "production",
    });

    const decision = decideBetaAccess({ handle: "approved", config });
    expect(config.configError).toContain("allowlist");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("config");
  });

  it("keeps local default mode open without minting beta entitlement", () => {
    const config = parseBetaAccessConfig({ nodeEnv: "development" });
    const decision = decideBetaAccess({ handle: "anyone", config, now: 1_000 });

    expect(config.mode).toBe("open");
    expect(decision.allowed).toBe(true);
    expect(decision.betaAccessExpiresAt).toBeUndefined();
  });
});
