import { describe, expect, it } from "vitest";
import {
  evaluateXReadBudget,
  parseOptionalNonNegativeInt,
  xReadDayKey,
} from "../shared/xReadLimits";

describe("X read limits", () => {
  it("fails closed when caps are required but missing", () => {
    const decision = evaluateXReadBudget({
      priority: "low",
      userRequestsToday: 0,
      globalRequestsToday: 0,
      limitsRequired: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing_caps");
  });

  it("blocks low-priority reads at user and global caps", () => {
    expect(
      evaluateXReadBudget({
        priority: "low",
        userRequestsToday: 5,
        globalRequestsToday: 10,
        userDailyLimit: 5,
        globalDailyLimit: 100,
      }).reason
    ).toBe("user_cap");
    expect(
      evaluateXReadBudget({
        priority: "low",
        userRequestsToday: 4,
        globalRequestsToday: 100,
        userDailyLimit: 5,
        globalDailyLimit: 100,
      }).reason
    ).toBe("global_cap");
  });

  it("allows high-priority reads through numeric caps but not kill switch", () => {
    expect(
      evaluateXReadBudget({
        priority: "high",
        userRequestsToday: 5,
        globalRequestsToday: 10,
        userDailyLimit: 5,
        globalDailyLimit: 10,
      }).allowed
    ).toBe(true);
    expect(
      evaluateXReadBudget({
        priority: "high",
        userRequestsToday: 0,
        globalRequestsToday: 0,
        killSwitch: true,
      }).reason
    ).toBe("kill_switch");
  });

  it("lets an unlimited-access test account bypass missing and numeric caps", () => {
    // Missing caps would normally fail closed.
    expect(
      evaluateXReadBudget({
        priority: "low",
        userRequestsToday: 0,
        globalRequestsToday: 0,
        limitsRequired: true,
        unlimitedAccess: true,
      }).allowed
    ).toBe(true);
    // Numeric caps are already exceeded, but unlimited access clears them.
    expect(
      evaluateXReadBudget({
        priority: "low",
        userRequestsToday: 500,
        globalRequestsToday: 500,
        userDailyLimit: 5,
        globalDailyLimit: 10,
        unlimitedAccess: true,
      }).allowed
    ).toBe(true);
  });

  it("still stops an unlimited-access account at the operator kill switch", () => {
    expect(
      evaluateXReadBudget({
        priority: "low",
        userRequestsToday: 0,
        globalRequestsToday: 0,
        killSwitch: true,
        unlimitedAccess: true,
      }).reason
    ).toBe("kill_switch");
  });

  it("parses non-negative integer caps and UTC day keys", () => {
    expect(parseOptionalNonNegativeInt("0")).toBe(0);
    expect(parseOptionalNonNegativeInt("42")).toBe(42);
    expect(parseOptionalNonNegativeInt("-1")).toBeNull();
    expect(xReadDayKey(Date.UTC(2026, 6, 10, 23))).toBe("2026-07-10");
  });
});
