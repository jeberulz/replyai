import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authRateLimitMapSizeForTests,
  consumeAuthRateLimit,
  hasAllowedOrigin,
  resetAuthRateLimitsForTests,
} from "../src/lib/authSecurity";

function request(headers: Record<string, string> = {}) {
  return {
    url: "https://replypilot.test/api/auth/logout",
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as never;
}

afterEach(() => {
  resetAuthRateLimitsForTests();
  vi.unstubAllEnvs();
});

describe("auth route Origin checks", () => {
  it("allows missing Origin for OAuth top-level navigations by default", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://replypilot.test");

    expect(hasAllowedOrigin(request())).toBe(true);
  });

  it("rejects mismatched Origin headers", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://replypilot.test");

    expect(
      hasAllowedOrigin(request({ origin: "https://attacker.test" }))
    ).toBe(false);
  });

  it("requires Origin when requested for mutating POST handlers", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://replypilot.test");

    expect(hasAllowedOrigin(request(), { requireOrigin: true })).toBe(false);
    expect(
      hasAllowedOrigin(request({ origin: "https://replypilot.test" }), {
        requireOrigin: true,
      })
    ).toBe(true);
  });
});

describe("auth route rate limiting", () => {
  it("limits by client IP and bucket", () => {
    const req = request({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" });

    expect(
      consumeAuthRateLimit(req, "login", {
        now: 1000,
        limit: 2,
        windowMs: 60_000,
      }).allowed
    ).toBe(true);
    expect(
      consumeAuthRateLimit(req, "login", {
        now: 1001,
        limit: 2,
        windowMs: 60_000,
      }).allowed
    ).toBe(true);
    const limited = consumeAuthRateLimit(req, "login", {
      now: 1002,
      limit: 2,
      windowMs: 60_000,
    });
    expect(limited.allowed).toBe(false);
    expect(limited.retryAfterSeconds).toBe(60);
  });

  it("resets after the window", () => {
    const req = request({ "x-forwarded-for": "203.0.113.10" });

    expect(
      consumeAuthRateLimit(req, "callback", {
        now: 1000,
        limit: 1,
        windowMs: 1000,
      }).allowed
    ).toBe(true);
    expect(
      consumeAuthRateLimit(req, "callback", {
        now: 2000,
        limit: 1,
        windowMs: 1000,
      }).allowed
    ).toBe(true);
  });

  it("sweeps expired buckets once the map grows large, bounding memory growth", () => {
    // Simulates a client rotating a fake IP-bearing header on every request:
    // each distinct value creates a permanent entry unless swept.
    const now = 1_000_000;
    for (let i = 0; i < 5_000; i += 1) {
      consumeAuthRateLimit(
        request({ "x-forwarded-for": `10.0.0.${i}` }),
        "login",
        { now: now - 120_000, windowMs: 60_000 } // already expired by `now`
      );
    }
    expect(authRateLimitMapSizeForTests()).toBe(5_000);

    consumeAuthRateLimit(request({ "x-forwarded-for": "10.0.0.new" }), "login", {
      now,
      windowMs: 60_000,
    });

    expect(authRateLimitMapSizeForTests()).toBeLessThan(10);
  });
});
