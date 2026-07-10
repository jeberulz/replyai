import { describe, expect, it } from "vitest";
import {
  aiSpendHourKey,
  evaluateAiSpendLimit,
  parseOptionalPositiveInt,
} from "../shared/spendLimits";

describe("spend limits", () => {
  it("fails closed when required limits are missing", () => {
    const decision = evaluateAiSpendLimit({
      kind: "generation",
      usedThisHour: 0,
      limitsRequired: true,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.message).toContain("spend caps");
  });

  it("blocks at the configured hourly cap", () => {
    const decision = evaluateAiSpendLimit({
      kind: "analysis",
      usedThisHour: 3,
      hourlyLimit: 3,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.message).toContain("analysis");
  });

  it("allows below cap and local uncapped mode", () => {
    expect(
      evaluateAiSpendLimit({
        kind: "generation",
        usedThisHour: 2,
        hourlyLimit: 3,
      }).allowed
    ).toBe(true);
    expect(
      evaluateAiSpendLimit({
        kind: "generation",
        usedThisHour: 200,
        limitsRequired: false,
      }).allowed
    ).toBe(true);
  });

  it("parses only positive integer caps", () => {
    expect(parseOptionalPositiveInt("12")).toBe(12);
    expect(parseOptionalPositiveInt("0")).toBeNull();
    expect(parseOptionalPositiveInt("nope")).toBeNull();
    expect(parseOptionalPositiveInt(undefined)).toBeNull();
  });

  it("uses a stable UTC hourly ledger key", () => {
    expect(aiSpendHourKey(Date.UTC(2026, 6, 10, 15, 45))).toBe("2026-07-10T15");
  });
});
