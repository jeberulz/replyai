import { describe, expect, it } from "vitest";
import {
  ageMinutesFromIso,
  buildWorkbenchDeepLink,
  normalizeAppOrigin,
  parseCompactCount,
  scoreFromPageMetrics,
  tweetIdFromLocation,
} from "../shared/extensionBadge";

describe("tweetIdFromLocation", () => {
  it("extracts status ids from x.com URLs", () => {
    expect(
      tweetIdFromLocation("https://x.com/sarahbuilds/status/1800000000000000001")
    ).toBe("1800000000000000001");
    expect(
      tweetIdFromLocation("https://twitter.com/a_b/status/123456?s=20")
    ).toBe("123456");
  });

  it("rejects non-status pages", () => {
    expect(tweetIdFromLocation("https://x.com/home")).toBeNull();
    expect(tweetIdFromLocation("https://example.com/status/1")).toBeNull();
  });
});

describe("scoreFromPageMetrics", () => {
  it("returns a 0-100 score with a reason", () => {
    const score = scoreFromPageMetrics({
      followers: 50_000,
      likes: 120,
      retweets: 20,
      replies: 15,
      quotes: 2,
      ageMinutes: 25,
    });
    expect(score.value).toBeGreaterThan(0);
    expect(score.value).toBeLessThanOrEqual(100);
    expect(score.reason.length).toBeGreaterThan(10);
  });

  it("uses neutral topic relevance by default", () => {
    const a = scoreFromPageMetrics({
      followers: 10_000,
      likes: 10,
      retweets: 1,
      replies: 1,
      quotes: 0,
      ageMinutes: 40,
    });
    const b = scoreFromPageMetrics({
      followers: 10_000,
      likes: 10,
      retweets: 1,
      replies: 1,
      quotes: 0,
      ageMinutes: 40,
      topicRelevance: 0.5,
    });
    expect(a.value).toBe(b.value);
  });
});

describe("buildWorkbenchDeepLink", () => {
  it("builds dashboard url with auto=1", () => {
    const link = buildWorkbenchDeepLink({
      appOrigin: "https://app.example",
      tweetUrl: "https://x.com/a/status/1800000000000000099",
    });
    expect(link).toBe(
      "https://app.example/dashboard?url=https%3A%2F%2Fx.com%2Fa%2Fstatus%2F1800000000000000099&auto=1"
    );
  });


  it("rejects invalid tweet urls", () => {
    expect(
      buildWorkbenchDeepLink({
        tweetUrl: "https://x.com/home",
      })
    ).toBeNull();
  });
});

describe("normalizeAppOrigin", () => {
  it("strips trailing slashes and defaults safely", () => {
    expect(normalizeAppOrigin("https://app.example/")).toBe("https://app.example");
    expect(normalizeAppOrigin("not a url")).toBe("http://localhost:3000");
    expect(normalizeAppOrigin("ftp://bad")).toBe("http://localhost:3000");
  });
});

describe("parseCompactCount", () => {
  it("parses k/m suffixes and commas", () => {
    expect(parseCompactCount("1.2K")).toBe(1200);
    expect(parseCompactCount("3M")).toBe(3_000_000);
    expect(parseCompactCount("12,345")).toBe(12345);
    expect(parseCompactCount("")).toBe(0);
  });
});

describe("ageMinutesFromIso", () => {
  it("computes age from datetime", () => {
    const now = Date.parse("2026-07-09T12:00:00.000Z");
    expect(
      ageMinutesFromIso("2026-07-09T11:30:00.000Z", now)
    ).toBe(30);
    expect(ageMinutesFromIso("nope", now)).toBeNull();
  });
});
