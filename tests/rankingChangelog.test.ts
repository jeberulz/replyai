import { describe, expect, it } from "vitest";
import {
  RANKING_CHANGELOG_MAX_AGE_MS,
  rankingChangelogSentence,
} from "../shared/rankingChangelog";
import type { RankingWeights } from "../shared/rankingWeights";

describe("rankingChangelogSentence", () => {
  const nowMs = Date.parse("2026-07-09T12:00:00Z");

  it("returns null when weights are missing", () => {
    expect(rankingChangelogSentence(null, nowMs)).toBeNull();
    expect(rankingChangelogSentence(undefined, nowMs)).toBeNull();
  });

  it("returns null when weights are stale (older than the max age window)", () => {
    const staleWeights: RankingWeights = {
      updatedAt: nowMs - RANKING_CHANGELOG_MAX_AGE_MS - 1,
      sourceMultipliers: { watched: 1.1 },
      followerBandMultipliers: {},
      scoreDecileMultipliers: {},
    };
    expect(rankingChangelogSentence(staleWeights, nowMs)).toBeNull();
  });

  it("returns a fallback sentence when weights are fresh but have no deltas", () => {
    const flatWeights: RankingWeights = {
      updatedAt: nowMs - 60_000,
      sourceMultipliers: { following: 1 },
      followerBandMultipliers: { small: 1 },
      scoreDecileMultipliers: {},
    };
    const sentence = rankingChangelogSentence(flatWeights, nowMs);
    expect(sentence).toBeTruthy();
    expect(sentence).not.toMatch(/\d+%/);
  });

  it("describes the strongest source and band lean without inventing percentages", () => {
    const weights: RankingWeights = {
      updatedAt: nowMs - 60_000,
      sourceMultipliers: { search: 1.12, following: 0.9 },
      followerBandMultipliers: { medium: 1.08 },
      scoreDecileMultipliers: {},
    };
    const sentence = rankingChangelogSentence(weights, nowMs);
    expect(sentence).toBeTruthy();
    expect(sentence!).toContain("keyword search");
    expect(sentence!).toContain("mid-size accounts");
    expect(sentence!).not.toMatch(/\d+%/);
  });

  it("respects a custom maxAgeMs override", () => {
    const weights: RankingWeights = {
      updatedAt: nowMs - 2 * 24 * 60 * 60 * 1000,
      sourceMultipliers: { watched: 1.1 },
      followerBandMultipliers: {},
      scoreDecileMultipliers: {},
    };
    expect(rankingChangelogSentence(weights, nowMs, 1 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(rankingChangelogSentence(weights, nowMs, 3 * 24 * 60 * 60 * 1000)).toBeTruthy();
  });
});
