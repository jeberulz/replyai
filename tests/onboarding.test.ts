import { describe, expect, it } from "vitest";
import {
  buildSetupChecklist,
  DEFAULT_KEYWORDS,
  GOALS,
  goalLabel,
  isGoalId,
  suggestedKeywordsForGoal,
} from "../shared/onboarding";

describe("goals", () => {
  it("defines exactly three goals with labels and hints", () => {
    expect(GOALS).toHaveLength(3);
    for (const goal of GOALS) {
      expect(goal.label.length).toBeGreaterThan(0);
      expect(goal.hint.length).toBeGreaterThan(0);
    }
  });

  it("validates goal ids", () => {
    expect(isGoalId("audience")).toBe(true);
    expect(isGoalId("leads")).toBe(true);
    expect(isGoalId("authority")).toBe(true);
    expect(isGoalId("growth-hacking")).toBe(false);
    expect(isGoalId("")).toBe(false);
  });

  it("resolves labels", () => {
    expect(goalLabel("audience")).toBe("Grow my audience");
  });

  it("suggests distinct, non-empty keywords per goal", () => {
    for (const goal of GOALS) {
      const keywords = suggestedKeywordsForGoal(goal.id);
      expect(keywords.length).toBeGreaterThanOrEqual(4);
      expect(new Set(keywords).size).toBe(keywords.length);
    }
    // Goal-seeded chips must differ from the login defaults, otherwise the
    // checklist could never detect that a niche was chosen.
    for (const goal of GOALS) {
      const suggested = suggestedKeywordsForGoal(goal.id).sort();
      expect(suggested).not.toEqual([...DEFAULT_KEYWORDS].sort());
    }
  });
});

describe("buildSetupChecklist", () => {
  const fresh = {
    goal: undefined,
    keywords: DEFAULT_KEYWORDS,
    hasTrainedVoice: false,
    hasAnalysis: false,
    hasDraft: false,
  };

  it("starts at zero for a fresh user on seeded defaults", () => {
    const checklist = buildSetupChecklist(fresh);
    expect(checklist.doneCount).toBe(0);
    expect(checklist.percent).toBe(0);
    expect(checklist.complete).toBe(false);
    expect(checklist.items).toHaveLength(5);
  });

  it("treats default keywords as 'niche not chosen' regardless of order/case", () => {
    const shuffled = [...DEFAULT_KEYWORDS].reverse().map((k) => k.toUpperCase());
    const checklist = buildSetupChecklist({ ...fresh, keywords: shuffled });
    expect(checklist.items.find((i) => i.id === "niche")?.done).toBe(false);
  });

  it("marks the niche chosen once keywords move off the defaults", () => {
    const checklist = buildSetupChecklist({
      ...fresh,
      keywords: ["ai agents", "devtools"],
    });
    expect(checklist.items.find((i) => i.id === "niche")?.done).toBe(true);
  });

  it("does not count empty keywords as a chosen niche", () => {
    const checklist = buildSetupChecklist({ ...fresh, keywords: [] });
    expect(checklist.items.find((i) => i.id === "niche")?.done).toBe(false);
  });

  it("computes partial progress", () => {
    const checklist = buildSetupChecklist({
      goal: "audience",
      keywords: ["build in public", "growth"],
      hasTrainedVoice: true,
      hasAnalysis: false,
      hasDraft: false,
    });
    expect(checklist.doneCount).toBe(3);
    expect(checklist.percent).toBe(60);
    expect(checklist.complete).toBe(false);
  });

  it("completes at 100%", () => {
    const checklist = buildSetupChecklist({
      goal: "leads",
      keywords: ["b2b saas"],
      hasTrainedVoice: true,
      hasAnalysis: true,
      hasDraft: true,
    });
    expect(checklist.percent).toBe(100);
    expect(checklist.complete).toBe(true);
  });
});
