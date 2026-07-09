import { describe, expect, it } from "vitest";
import {
  applyRankingMultiplier,
  computeRankingWeights,
  followerBand,
  funnelOutcomeScore,
  opportunityToAnalyzeRate,
  opportunityWasAnalyzed,
  recencyWeight,
  scoreDecile,
} from "../shared/rankingWeights";
import type { OpportunityFunnelRow } from "../shared/rankingWeights";

function row(
  partial: Partial<OpportunityFunnelRow> & Pick<OpportunityFunnelRow, "scannedAt">
): OpportunityFunnelRow {
  return {
    authorFollowers: 5_000,
    score: 55,
    status: "new",
    source: "following",
    ...partial,
  };
}

describe("followerBand", () => {
  it("maps follower counts to bands", () => {
    expect(followerBand(500)).toBe("micro");
    expect(followerBand(5_000)).toBe("small");
    expect(followerBand(50_000)).toBe("medium");
    expect(followerBand(500_000)).toBe("large");
  });
});

describe("scoreDecile", () => {
  it("maps scores 0-100 into deciles", () => {
    expect(scoreDecile(0)).toBe(0);
    expect(scoreDecile(99)).toBe(9);
    expect(scoreDecile(55)).toBe(5);
  });
});

describe("opportunityWasAnalyzed", () => {
  it("treats analyzed/sent/responded outcomes and analyzed status as analyzed", () => {
    expect(opportunityWasAnalyzed(row({ outcome: "analyzed", scannedAt: 1 }))).toBe(
      true
    );
    expect(opportunityWasAnalyzed(row({ outcome: "sent", scannedAt: 1 }))).toBe(true);
    expect(
      opportunityWasAnalyzed(row({ status: "analyzed", scannedAt: 1 }))
    ).toBe(true);
    expect(opportunityWasAnalyzed(row({ status: "new", scannedAt: 1 }))).toBe(false);
  });
});

describe("opportunityToAnalyzeRate", () => {
  it("returns null for empty input", () => {
    expect(opportunityToAnalyzeRate([])).toBeNull();
  });

  it("computes percent analyzed", () => {
    const rows = [
      row({ scannedAt: 1, outcome: "analyzed" }),
      row({ scannedAt: 2, status: "new" }),
      row({ scannedAt: 3, outcome: "sent" }),
      row({ scannedAt: 4, outcome: "ignored" }),
    ];
    expect(opportunityToAnalyzeRate(rows)).toBe(50);
  });
});

describe("computeRankingWeights", () => {
  const now = Date.UTC(2026, 6, 1);

  it("returns null when sample is too small", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      row({ scannedAt: now - i * 1000, source: "following" })
    );
    expect(computeRankingWeights(rows, now)).toBeNull();
  });

  it("boosts sources with higher analyze conversion", () => {
    const rows: OpportunityFunnelRow[] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(
        row({
          scannedAt: now - i * 60_000,
          source: "following",
          outcome: "ignored",
        })
      );
    }
    for (let i = 0; i < 6; i++) {
      rows.push(
        row({
          scannedAt: now - i * 60_000,
          source: "list",
          outcome: "analyzed",
        })
      );
    }
    const weights = computeRankingWeights(rows, now);
    expect(weights).not.toBeNull();
    expect(weights!.sourceMultipliers.list).toBeGreaterThan(1);
    expect(weights!.sourceMultipliers.following).toBeLessThan(1);
  });
});

describe("funnelOutcomeScore", () => {
  it("ranks responded > sent > analyzed > ignored/no-outcome", () => {
    expect(funnelOutcomeScore(row({ outcome: "responded", scannedAt: 1 }))).toBe(1);
    expect(funnelOutcomeScore(row({ outcome: "sent", scannedAt: 1 }))).toBe(0.6);
    expect(funnelOutcomeScore(row({ outcome: "analyzed", scannedAt: 1 }))).toBe(0.25);
    expect(funnelOutcomeScore(row({ outcome: "ignored", scannedAt: 1 }))).toBe(0);
    expect(funnelOutcomeScore(row({ status: "new", scannedAt: 1 }))).toBe(0);
  });
});

describe("recencyWeight", () => {
  it("decays toward 0 as rows age, full weight at scan time", () => {
    const now = Date.UTC(2026, 6, 1);
    expect(recencyWeight(now, now)).toBe(1);
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    expect(recencyWeight(sevenDaysAgo, now)).toBeCloseTo(0.5, 5);
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    expect(recencyWeight(fourteenDaysAgo, now)).toBeLessThan(
      recencyWeight(sevenDaysAgo, now)
    );
  });
});

describe("computeRankingWeights outcome + recency weighting", () => {
  const now = Date.UTC(2026, 6, 1);

  it("boosts a source whose rows responded over one whose rows were only analyzed", () => {
    const rows: OpportunityFunnelRow[] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(
        row({
          scannedAt: now - i * 60_000,
          source: "following",
          outcome: "analyzed",
        })
      );
    }
    for (let i = 0; i < 6; i++) {
      rows.push(
        row({
          scannedAt: now - i * 60_000,
          source: "list",
          outcome: "responded",
        })
      );
    }
    const weights = computeRankingWeights(rows, now);
    expect(weights).not.toBeNull();
    expect(weights!.sourceMultipliers.list).toBeGreaterThan(1);
    expect(weights!.sourceMultipliers.following).toBeLessThan(1);
  });

  it("weighs an old responded row less than a recent one with the same outcome mix", () => {
    const baseRows = (): OpportunityFunnelRow[] => {
      const rows: OpportunityFunnelRow[] = [];
      for (let i = 0; i < 6; i++) {
        rows.push(
          row({ scannedAt: now - i * 60_000, source: "following", outcome: "ignored" })
        );
      }
      rows.push(row({ scannedAt: now, source: "list", outcome: "responded" }));
      for (let i = 0; i < 5; i++) {
        rows.push(
          row({ scannedAt: now - i * 60_000, source: "list", outcome: "ignored" })
        );
      }
      return rows;
    };

    const recentWeights = computeRankingWeights(baseRows(), now);

    const staleRows = baseRows().map((r) =>
      r.source === "list" && r.outcome === "responded"
        ? { ...r, scannedAt: r.scannedAt - 10 * 24 * 60 * 60 * 1000 }
        : r
    );
    const staleWeights = computeRankingWeights(staleRows, now);

    expect(recentWeights).not.toBeNull();
    expect(staleWeights).not.toBeNull();
    expect(staleWeights!.sourceMultipliers.list!).toBeLessThan(
      recentWeights!.sourceMultipliers.list!
    );
  });
});

describe("applyRankingMultiplier", () => {
  it("leaves score unchanged without weights", () => {
    expect(
      applyRankingMultiplier(60, { authorFollowers: 5_000, source: "list" }, null)
    ).toBe(60);
  });

  it("applies stacked multipliers", () => {
    const weights = {
      updatedAt: Date.now(),
      sourceMultipliers: { list: 1.1 },
      followerBandMultipliers: { small: 1.1 },
      scoreDecileMultipliers: { "5": 1.1 },
    };
    expect(
      applyRankingMultiplier(
        55,
        { source: "list", authorFollowers: 5_000 },
        weights
      )
    ).toBe(73);
  });
});
