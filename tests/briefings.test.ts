import { describe, expect, it } from "vitest";
import {
  BRIEFING_DEFAULTS,
  BriefingArtifactSchema,
  clampHourLocal,
  demoBriefingArtifact,
  isBriefingHour,
  localDayKey,
  rankingChangelogSentence,
  shouldEnqueueBriefing,
} from "../shared/briefings";
import type { RankingWeights } from "../shared/rankingWeights";

describe("briefing hour matching", () => {
  it("clamps hourLocal to 0–23", () => {
    expect(clampHourLocal(-1)).toBe(0);
    expect(clampHourLocal(8.9)).toBe(8);
    expect(clampHourLocal(24)).toBe(23);
    expect(clampHourLocal(Number.NaN)).toBe(BRIEFING_DEFAULTS.hourLocal);
  });

  it("matches local hour in UTC", () => {
    const eightUtc = Date.parse("2026-07-09T08:15:00Z");
    const nineUtc = Date.parse("2026-07-09T09:00:00Z");
    expect(isBriefingHour(eightUtc, 8, "UTC")).toBe(true);
    expect(isBriefingHour(nineUtc, 8, "UTC")).toBe(false);
  });

  it("uses timezone for local day key", () => {
    // 2026-07-09 01:00 UTC = still 2026-07-08 in America/Los_Angeles (PDT).
    const ms = Date.parse("2026-07-09T01:00:00Z");
    expect(localDayKey(ms, "UTC")).toBe("2026-07-09");
    expect(localDayKey(ms, "America/Los_Angeles")).toBe("2026-07-08");
  });
});

describe("shouldEnqueueBriefing", () => {
  const nowMs = Date.parse("2026-07-09T08:05:00Z");
  const settings = {
    enabled: true,
    hourLocal: 8,
    timezone: "UTC",
    emailOptIn: false,
  };

  it("enqueues when enabled, hour matches, and no run yet", () => {
    expect(
      shouldEnqueueBriefing({
        nowMs,
        settings,
        hasRunForLocalDay: false,
      })
    ).toBe(true);
  });

  it("skips when disabled", () => {
    expect(
      shouldEnqueueBriefing({
        nowMs,
        settings: { ...settings, enabled: false },
        hasRunForLocalDay: false,
      })
    ).toBe(false);
  });

  it("skips when a run already exists for the local day", () => {
    expect(
      shouldEnqueueBriefing({
        nowMs,
        settings,
        hasRunForLocalDay: true,
      })
    ).toBe(false);
  });

  it("skips when local hour does not match", () => {
    expect(
      shouldEnqueueBriefing({
        nowMs: Date.parse("2026-07-09T10:00:00Z"),
        settings,
        hasRunForLocalDay: false,
      })
    ).toBe(false);
  });
});

describe("demoBriefingArtifact", () => {
  it("returns a zod-valid artifact with ~5 opportunities", () => {
    const artifact = demoBriefingArtifact({
      nowMs: Date.parse("2026-07-09T08:00:00Z"),
    });
    expect(BriefingArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(artifact.demo).toBe(true);
    expect(artifact.opportunities).toHaveLength(5);
    expect(artifact.coachingInsight.length).toBeGreaterThan(10);
    expect(artifact.outcomes.summary.length).toBeGreaterThan(0);
  });

  it("folds ranking sentence into coaching insight when provided", () => {
    const artifact = demoBriefingArtifact({
      rankingSentence:
        "Your feed ranking recently leaned toward watched handles based on what you actually engage with.",
    });
    expect(artifact.coachingInsight).toContain("watched handles");
  });
});

describe("rankingChangelogSentence", () => {
  const nowMs = Date.parse("2026-07-09T12:00:00Z");

  it("returns null when weights missing or stale", () => {
    expect(rankingChangelogSentence(null, nowMs)).toBeNull();
    expect(
      rankingChangelogSentence(
        {
          updatedAt: nowMs - 30 * 24 * 60 * 60 * 1000,
          sourceMultipliers: { watched: 1.1 },
          followerBandMultipliers: {},
          scoreDecileMultipliers: {},
        },
        nowMs
      )
    ).toBeNull();
  });

  it("describes the strongest source lean without inventing percentages", () => {
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
});
