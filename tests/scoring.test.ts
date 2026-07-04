import { describe, expect, it } from "vitest";
import {
  isPoliticalContent,
  parseTweetUrl,
  passesFeedScannerFilter,
  scoreConversation,
  topicRelevanceForKeywords,
  velocityPerHour,
} from "../shared/scoring";

describe("parseTweetUrl", () => {
  it("parses x.com status URLs", () => {
    expect(
      parseTweetUrl("https://x.com/sarahbuilds/status/1800000000000000001")
    ).toBe("1800000000000000001");
  });

  it("parses twitter.com, mobile, and www variants", () => {
    expect(parseTweetUrl("https://twitter.com/a_b/status/123456")).toBe("123456");
    expect(parseTweetUrl("https://www.x.com/a_b/status/123456")).toBe("123456");
    expect(parseTweetUrl("https://mobile.twitter.com/a_b/status/123456")).toBe(
      "123456"
    );
  });

  it("parses i/web status URLs and trailing query params", () => {
    expect(parseTweetUrl("https://x.com/i/web/status/123456?s=20")).toBe("123456");
  });

  it("rejects non-tweet URLs", () => {
    expect(parseTweetUrl("https://x.com/sarahbuilds")).toBeNull();
    expect(parseTweetUrl("https://example.com/status/123456")).toBeNull();
    expect(parseTweetUrl("not a url")).toBeNull();
  });
});

describe("scoreConversation", () => {
  const base = {
    followers: 100_000,
    likes: 1000,
    retweets: 100,
    replies: 200,
    quotes: 50,
  };

  it("scores fresh, fast-moving tweets from large accounts highly", () => {
    const score = scoreConversation({ ...base, ageMinutes: 30 });
    expect(score.value).toBeGreaterThanOrEqual(70);
    expect(score.factors.replyTiming).toBe(1);
  });

  it("decays as the reply window closes", () => {
    const fresh = scoreConversation({ ...base, ageMinutes: 30 });
    const stale = scoreConversation({ ...base, ageMinutes: 60 * 24 });
    expect(stale.value).toBeLessThan(fresh.value);
    expect(stale.factors.replyTiming).toBe(0);
  });

  it("stays within 0-100 and produces a reason", () => {
    const score = scoreConversation({
      followers: 10,
      likes: 0,
      retweets: 0,
      replies: 0,
      quotes: 0,
      ageMinutes: 60 * 72,
    });
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(100);
    expect(score.reason.length).toBeGreaterThan(10);
  });
});

describe("topicRelevanceForKeywords", () => {
  it("returns zero with no keywords configured", () => {
    expect(topicRelevanceForKeywords("anything", [])).toBe(0);
  });

  it("scores keyword hits higher than misses", () => {
    const hit = topicRelevanceForKeywords("shipping our AI startup today", [
      "ai",
      "startup",
    ]);
    const miss = topicRelevanceForKeywords("great pasta recipe", ["ai", "startup"]);
    expect(hit).toBeGreaterThan(miss);
    expect(hit).toBeLessThanOrEqual(1);
    expect(miss).toBe(0);
  });

  it("does not match short keywords inside unrelated words", () => {
    expect(topicRelevanceForKeywords("I said nothing about tech", ["ai"])).toBe(0);
    expect(topicRelevanceForKeywords("building with AI tools", ["ai"])).toBeGreaterThan(0);
  });

  it("blocks political content even when a generic keyword appears", () => {
    const text =
      "Trump just signed an executive order. We need to build a stronger border.";
    expect(isPoliticalContent(text)).toBe(true);
    expect(topicRelevanceForKeywords(text, ["ai", "build", "startup"])).toBe(0);
    expect(passesFeedScannerFilter(text, ["ai", "build", "startup"])).toBe(false);
  });

  it("rejects a lone generic keyword hit", () => {
    expect(
      topicRelevanceForKeywords("We must build a better society", ["build", "product"])
    ).toBe(0);
    expect(
      topicRelevanceForKeywords("Shipping our AI SaaS startup today", [
        "ai",
        "startup",
        "saas",
      ])
    ).toBeGreaterThanOrEqual(0.5);
  });

  it("passes pricing tweets that mention AI apps with typical keywords", () => {
    const text =
      "US users are willing to pay $20–$40+/month for AI apps if the value is clear.";
    const keywords = ["ai", "startup", "founder", "build", "product"];
    expect(passesFeedScannerFilter(text, keywords)).toBe(true);
  });
});

describe("velocityPerHour", () => {
  it("computes engagement per hour", () => {
    expect(
      velocityPerHour({
        likes: 60,
        retweets: 30,
        replies: 20,
        quotes: 10,
        ageMinutes: 60,
      })
    ).toBe(120);
  });
});
