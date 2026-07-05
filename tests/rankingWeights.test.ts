import { describe, expect, it } from "vitest";
import {
  applyRankingMultiplier,
  computeRankingWeights,
  followerBand,
  opportunityToAnalyzeRate,
  opportunityWasAnalyzed,
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
