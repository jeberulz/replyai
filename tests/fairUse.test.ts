import { describe, expect, it } from "vitest";
import {
  evaluateFairUse,
  FREE_DAILY_ANALYSIS_LIMIT,
  PRO_MONTHLY_ANALYSIS_LIMIT,
  PRO_MONTHLY_GENERATION_LIMIT,
} from "../shared/fairUse";

describe("fairUse", () => {
  it("allows demo users regardless of usage", () => {
    const status = evaluateFairUse({
      isDemo: true,
      plan: "free",
      usage: {
        analysesToday: 99,
        analysesThisMonth: 999,
        generationsThisMonth: 999,
      },
      action: "start_analysis",
    });
    expect(status.unlimited).toBe(true);
    expect(status.blocked).toBe(false);
  });

  it("blocks free users after the daily analysis cap", () => {
    const status = evaluateFairUse({
      isDemo: false,
      plan: "free",
      usage: {
        analysesToday: FREE_DAILY_ANALYSIS_LIMIT,
        analysesThisMonth: FREE_DAILY_ANALYSIS_LIMIT,
        generationsThisMonth: 0,
      },
      action: "start_analysis",
    });
    expect(status.blocked).toBe(true);
    expect(status.blockReason).toBe("free_daily_analyses");
  });

  it("does not block free generate-more on existing analyses", () => {
    const status = evaluateFairUse({
      isDemo: false,
      plan: "free",
      usage: {
        analysesToday: FREE_DAILY_ANALYSIS_LIMIT,
        analysesThisMonth: FREE_DAILY_ANALYSIS_LIMIT,
        generationsThisMonth: 50,
      },
      action: "generate",
    });
    expect(status.blocked).toBe(false);
  });

  it("blocks pro users at monthly analysis fair use", () => {
    const status = evaluateFairUse({
      isDemo: false,
      plan: "pro",
      usage: {
        analysesToday: 10,
        analysesThisMonth: PRO_MONTHLY_ANALYSIS_LIMIT,
        generationsThisMonth: 0,
      },
      action: "run_analysis",
    });
    expect(status.blocked).toBe(true);
    expect(status.blockReason).toBe("pro_monthly_analyses");
  });

  it("blocks pro users at monthly generation fair use", () => {
    const status = evaluateFairUse({
      isDemo: false,
      plan: "pro",
      usage: {
        analysesToday: 10,
        analysesThisMonth: 10,
        generationsThisMonth: PRO_MONTHLY_GENERATION_LIMIT,
      },
      action: "generate",
    });
    expect(status.blocked).toBe(true);
    expect(status.blockReason).toBe("pro_monthly_generations");
  });
});
