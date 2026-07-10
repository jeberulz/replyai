import { describe, expect, it } from "vitest";
import {
  FREE_PLAN,
  PRO_PLAN,
  hasProAccess,
  hasActiveBetaAccess,
  paidFeatureGateMessage,
  planFromStripeStatus,
} from "../shared/billing";

describe("billing helpers", () => {
  it("treats demo users as having pro access", () => {
    expect(hasProAccess({ plan: FREE_PLAN, isDemo: true })).toBe(true);
  });

  it("grants pro access only to paid plans for non-demo users", () => {
    expect(hasProAccess({ plan: FREE_PLAN, isDemo: false })).toBe(false);
    expect(hasProAccess({ plan: PRO_PLAN, isDemo: false })).toBe(true);
  });

  it("grants active beta access without changing Stripe plan", () => {
    expect(
      hasProAccess({
        plan: FREE_PLAN,
        isDemo: false,
        betaAccessExpiresAt: Date.now() + 60_000,
      })
    ).toBe(true);
    expect(hasActiveBetaAccess({ betaAccessExpiresAt: 2_000, now: 1_000 })).toBe(
      true
    );
  });

  it("does not grant access for expired beta entitlements", () => {
    expect(
      hasProAccess({
        plan: FREE_PLAN,
        isDemo: false,
        betaAccessExpiresAt: 500,
      })
    ).toBe(false);
    expect(hasActiveBetaAccess({ betaAccessExpiresAt: 500, now: 1_000 })).toBe(
      false
    );
  });

  it("maps active subscription states to pro", () => {
    expect(planFromStripeStatus("active")).toBe(PRO_PLAN);
    expect(planFromStripeStatus("trialing")).toBe(PRO_PLAN);
    expect(planFromStripeStatus("past_due")).toBe(PRO_PLAN);
  });

  it("maps canceled or missing subscription states to free", () => {
    expect(planFromStripeStatus("canceled")).toBe(FREE_PLAN);
    expect(planFromStripeStatus(undefined)).toBe(FREE_PLAN);
  });

  it("returns a user-facing gate message", () => {
    expect(paidFeatureGateMessage("scanner")).toContain("Feed scanner");
  });
});
