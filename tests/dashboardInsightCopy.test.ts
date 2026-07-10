import { describe, expect, it } from "vitest";
import {
  engagementWindowEmptyBody,
  engagementWindowFilledCopy,
  personalAnalyticsHeroMetric,
  personalAnalyticsSparseCopy,
} from "../src/lib/dashboard-insight-copy";

describe("dashboard insight copy", () => {
  it("engagement empty copy is actionable when sends exist today", () => {
    expect(
      engagementWindowEmptyBody({
        publishedToday: 2,
        minSampleSize: 5,
      })
    ).toContain("2 sends today");
  });

  it("engagement filled copy uses peak-after-post framing", () => {
    const copy = engagementWindowFilledCopy({
      curve: {
        authorBand: "medium",
        authorBandLabel: "10k–100k followers",
        topicTag: "AI agents",
        sampleSize: 6,
        medianPeakMinutes: 40,
        minPeakMinutes: 25,
        maxPeakMinutes: 55,
        medianReplyBackMinutes: 30,
        hasEnoughData: true,
      },
      minSampleSize: 5,
    });
    expect(copy.headline).toContain("after the post");
    expect(copy.headline).not.toContain("closes");
  });

  it("personal analytics uses in-progress hero denominator", () => {
    expect(
      personalAnalyticsHeroMetric({
        responded: 0,
        sent: 0,
        publishedToday: 1,
      })
    ).toBe("0/1");
  });

  it("personal analytics sparse copy explains waiting period", () => {
    expect(
      personalAnalyticsSparseCopy({
        sent: 0,
        isSparse: true,
        publishedToday: 1,
      })
    ).toContain("48h");
  });
});
