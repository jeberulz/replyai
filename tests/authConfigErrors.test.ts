import { ConvexError } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authConfigErrorSlug, realSignInConfigError } from "../src/lib/oauth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authConfigErrorSlug", () => {
  it("maps the provisioning-secret ConvexError to its landing-page slug", () => {
    const error = new ConvexError({
      code: "auth_provisioning_misconfigured",
      reason: "missing_expected_secret",
    });
    expect(authConfigErrorSlug(error)).toBe("provisioning");
  });

  it("maps the token-encryption-key ConvexError to its landing-page slug", () => {
    const error = new ConvexError({
      code: "token_encryption_key_missing",
      message: "X_TOKEN_ENCRYPTION_KEY is not configured.",
    });
    expect(authConfigErrorSlug(error)).toBe("token_key");
  });

  it("ignores plain errors and unrelated ConvexErrors", () => {
    expect(authConfigErrorSlug(new Error("X token exchange failed"))).toBeNull();
    expect(authConfigErrorSlug(new ConvexError("Unauthorized"))).toBeNull();
    expect(authConfigErrorSlug(new ConvexError({ code: "other" }))).toBeNull();
    expect(authConfigErrorSlug(undefined)).toBeNull();
  });
});

describe("realSignInConfigError", () => {
  it("fails fast when the Next side has no provisioning secret", () => {
    vi.stubEnv("CONVEX_AUTH_PROVISION_SECRET", "");
    vi.stubEnv("BETA_ACCESS_MODE", "open");

    expect(realSignInConfigError()).toBe("provisioning");
  });

  it("fails fast when allowlist mode has no configured invites", () => {
    vi.stubEnv("CONVEX_AUTH_PROVISION_SECRET", "shared-secret");
    vi.stubEnv("BETA_ACCESS_MODE", "allowlist");
    vi.stubEnv("BETA_ALLOWED_X_HANDLES", " , @@@");

    expect(realSignInConfigError()).toBe("beta_config");
  });

  it("passes when the secret is set and the allowlist is populated", () => {
    vi.stubEnv("CONVEX_AUTH_PROVISION_SECRET", "shared-secret");
    vi.stubEnv("BETA_ACCESS_MODE", "allowlist");
    vi.stubEnv("BETA_ALLOWED_X_HANDLES", "founder_one");

    expect(realSignInConfigError()).toBeNull();
  });

  it("passes in open mode with a provisioning secret", () => {
    vi.stubEnv("CONVEX_AUTH_PROVISION_SECRET", "shared-secret");
    vi.stubEnv("BETA_ACCESS_MODE", "open");

    expect(realSignInConfigError()).toBeNull();
  });
});
