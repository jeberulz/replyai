import { describe, expect, it } from "vitest";
import {
  MIN_ENGAGEMENT_WINDOW_SAMPLE,
  authorSizeBand,
  buildEngagementWindowCurves,
  buildEngagementWindowSnapshot,
  closesInMinutes,
  demoEngagementWindowSnapshot,
  formatEngagementMinutes,
  formatEngagementWindowGuidance,
  roundEngagementMinutes,
  type EngagementWindowObservation,
} from "../shared/engagementWindow";

function obs(
  partial: Partial<EngagementWindowObservation> &
    Pick<EngagementWindowObservation, "publishedAt" | "respondedAt">
): EngagementWindowObservation {
  return {
    originalPostedAt: partial.originalPostedAt ?? partial.publishedAt - 10 * 60_000,
    authorFollowers: partial.authorFollowers ?? 20_000,
    topicTag: partial.topicTag ?? "AI agents",
    ...partial,
  };
}

describe("authorSizeBand", () => {
  it("matches scoring follower bands", () => {
    expect(authorSizeBand(500)).toBe("micro");
    expect(authorSizeBand(5_000)).toBe("small");
    expect(authorSizeBand(50_000)).toBe("medium");
    expect(authorSizeBand(250_000)).toBe("large");
  });
});

describe("roundEngagementMinutes", () => {
  it("rounds to 10-minute steps and never invents sub-step precision", () => {
    expect(roundEngagementMinutes(37)).toBe(40);
    expect(roundEngagementMinutes(42)).toBe(40);
    expect(roundEngagementMinutes(3)).toBe(10);
    expect(formatEngagementMinutes(40)).toBe("~40 min");
  });
});

describe("buildEngagementWindowCurves", () => {
  it("refuses a prediction when sample is below threshold", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    const observations = [1, 2, 3, 4].map((i) =>
      obs({
        originalPostedAt: posted,
        publishedAt: posted + 5 * 60_000,
        respondedAt: posted + (20 + i * 5) * 60_000,
        authorFollowers: 12_000,
        topicTag: "niche",
      })
    );

    const curves = buildEngagementWindowCurves({ observations });
    const primary = curves[0];
    expect(primary).toBeDefined();
    expect(primary!.sampleSize).toBe(4);
    expect(primary!.hasEnoughData).toBe(false);
    expect(primary!.medianPeakMinutes).toBeNull();

    const guidance = formatEngagementWindowGuidance({ curve: primary! });
    expect(guidance.headline).toMatch(/not enough data/i);
    expect(guidance.detail).toContain(String(MIN_ENGAGEMENT_WINDOW_SAMPLE));
  });

  it("computes rounded median/min/max peak from sufficient responded rows", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    // Peaks at 25, 35, 40, 45, 55 → median 40 → rounds to 40
    const peaks = [25, 35, 40, 45, 55];
    const observations = peaks.map((peakMin, i) =>
      obs({
        originalPostedAt: posted + i,
        publishedAt: posted + i + 5 * 60_000,
        respondedAt: posted + i + peakMin * 60_000,
        authorFollowers: 30_000,
        topicTag: "AI agents",
      })
    );

    const curves = buildEngagementWindowCurves({ observations });
    const curve = curves.find((c) => c.topicTag === "AI agents");
    expect(curve).toMatchObject({
      authorBand: "medium",
      sampleSize: 5,
      hasEnoughData: true,
      medianPeakMinutes: 40,
      minPeakMinutes: 30, // 25 → 30
      maxPeakMinutes: 60, // 55 → 60
    });
  });

  it("ignores non-responded rows for curve math", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    const observations: EngagementWindowObservation[] = [
      ...[30, 40, 50, 60, 70].map((peakMin, i) =>
        obs({
          originalPostedAt: posted + i,
          publishedAt: posted + i + 5 * 60_000,
          respondedAt: posted + i + peakMin * 60_000,
          authorFollowers: 8_000,
        })
      ),
      {
        originalPostedAt: posted,
        publishedAt: posted + 5 * 60_000,
        respondedAt: null,
        authorFollowers: 8_000,
        topicTag: "AI agents",
      },
    ];

    const curves = buildEngagementWindowCurves({ observations });
    expect(curves[0]!.sampleSize).toBe(5);
  });
});

describe("closesInMinutes", () => {
  it("returns remaining rounded minutes until median peak", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    const now = posted + 15 * 60_000;
    expect(
      closesInMinutes({
        medianPeakMinutes: 40,
        originalPostedAt: posted,
        nowMs: now,
      })
    ).toBe(30);
  });

  it("returns null once past the median peak", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    expect(
      closesInMinutes({
        medianPeakMinutes: 40,
        originalPostedAt: posted,
        nowMs: posted + 50 * 60_000,
      })
    ).toBeNull();
  });
});

describe("demoEngagementWindowSnapshot", () => {
  it("is deterministic and surfaces a data-backed medium-band curve", () => {
    const a = demoEngagementWindowSnapshot();
    const b = demoEngagementWindowSnapshot();
    expect(a).toEqual(b);
    expect(a.isDemo).toBe(true);
    expect(a.primary?.hasEnoughData).toBe(true);
    expect(a.primary?.authorBand).toBe("medium");
    expect(a.primary?.medianPeakMinutes).toBe(40);

    const sparse = a.buckets.find((c) => c.authorBand === "small");
    expect(sparse?.hasEnoughData).toBe(false);
  });
});

describe("buildEngagementWindowSnapshot", () => {
  it("picks the best-backed bucket as primary", () => {
    const posted = Date.parse("2026-07-08T12:00:00.000Z");
    const observations = [20, 30, 40, 50, 60, 70].map((peakMin, i) =>
      obs({
        originalPostedAt: posted + i,
        publishedAt: posted + i + 5 * 60_000,
        respondedAt: posted + i + peakMin * 60_000,
        authorFollowers: 150_000,
        topicTag: null,
      })
    );
    const snap = buildEngagementWindowSnapshot({ observations });
    expect(snap.primary?.authorBand).toBe("large");
    expect(snap.primary?.hasEnoughData).toBe(true);
  });
});
