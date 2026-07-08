import { describe, expect, it } from "vitest";
import {
  FREE_PLAN,
  PRO_PLAN,
  hasProAccess,
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

  it("maps active subscription states to pro", () => {
    expect(planFromStripeStatus("active")).toBe(PRO_PLAN);
    expect(planFromStripeStatus("trialing")).toBe(PRO_PLAN);
    expect(planFromStripeStatus("past_due")).toBe(PRO_PLAN);
  });

  it("maps canceled, unpaid, or missing subscription states to free", () => {
    expect(planFromStripeStatus("canceled")).toBe(FREE_PLAN);
    // unpaid = dunning exhausted; access ends (past_due is the grace state).
    expect(planFromStripeStatus("unpaid")).toBe(FREE_PLAN);
    expect(planFromStripeStatus(undefined)).toBe(FREE_PLAN);
  });

  it("returns a user-facing gate message", () => {
    expect(paidFeatureGateMessage("scanner")).toContain("Feed scanner");
  });
});
