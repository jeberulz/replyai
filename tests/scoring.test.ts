import { describe, expect, it } from "vitest";
import {
  SCORE_WEIGHTS,
  isPoliticalContent,
  parseTweetUrl,
  passesFeedScannerFilter,
  passesOpportunityRelevance,
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

  it("keeps the displayed score the same for curated 'list' sources", () => {
    const plain = scoreConversation({ ...base, ageMinutes: 60 * 24 });
    const listed = scoreConversation({
      ...base,
      ageMinutes: 60 * 24,
      source: "list",
    });
    expect(listed.value).toBe(plain.value);
  });

  it("keeps the displayed score the same for 'watched' sources", () => {
    const plain = scoreConversation({ ...base, ageMinutes: 60 * 24 });
    const watched = scoreConversation({
      ...base,
      ageMinutes: 60 * 24,
      source: "watched",
    });
    expect(watched.value).toBe(plain.value);
  });

  it("treats 'following' as the baseline, same as no source", () => {
    const plain = scoreConversation({ ...base, ageMinutes: 60 * 24 });
    const following = scoreConversation({
      ...base,
      ageMinutes: 60 * 24,
      source: "following",
    });
    expect(following.value).toBe(plain.value);
  });

  it("clamps at 100 for near-max base scores", () => {
    const score = scoreConversation({ ...base, ageMinutes: 30, source: "list" });
    expect(score.value).toBeLessThanOrEqual(100);
  });

  it("calls out off-topic conversations in the displayed reason", () => {
    const score = scoreConversation({
      followers: 12_000,
      likes: 40,
      retweets: 4,
      replies: 3,
      quotes: 1,
      ageMinutes: 35,
      topicRelevance: 0.05,
    });
    expect(score.reason).toContain("off-niche");
  });

  it("calls out brand-safety risk when the classifier flags it", () => {
    const score = scoreConversation({
      followers: 12_000,
      likes: 40,
      retweets: 4,
      replies: 3,
      quotes: 1,
      ageMinutes: 35,
      topicRelevance: 0,
      brandSafety: "unsafe",
    });
    expect(score.reason).toContain("risky for your brand");
  });

  it("normalizes velocity by follower band so smaller accounts can earn momentum credit", () => {
    const sameRawEngagement = {
      likes: 24,
      retweets: 3,
      replies: 5,
      quotes: 1,
      ageMinutes: 30,
      topicRelevance: 0.8,
    };

    const micro = scoreConversation({
      ...sameRawEngagement,
      followers: 700,
    });
    const large = scoreConversation({
      ...sameRawEngagement,
      followers: 400_000,
    });

    expect(micro.factors.growthVelocity).toBeGreaterThan(large.factors.growthVelocity);
    expect(micro.value).toBeGreaterThan(large.value - 15);
  });

  it("still bounds normalized velocity at 1 for very fast large-account tweets", () => {
    const score = scoreConversation({
      followers: 800_000,
      likes: 4_000,
      retweets: 600,
      replies: 500,
      quotes: 200,
      ageMinutes: 20,
      topicRelevance: 0.8,
    });

    expect(score.factors.growthVelocity).toBeLessThanOrEqual(1);
    expect(score.reason).toContain("audience size");
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

  it("does not hard-zero niche policy discussions that match specific keywords", () => {
    const text =
      "Congress is debating how the EU AI Act compliance burden will change how AI startups ship in Europe.";
    expect(isPoliticalContent(text)).toBe(true);
    expect(
      topicRelevanceForKeywords(text, ["ai", "startup", "compliance"])
    ).toBeGreaterThanOrEqual(0.8);
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

describe("passesOpportunityRelevance", () => {
  const offTopic = "great pasta recipe tonight";
  const keywords = ["ai", "startup"];

  it("bypasses keyword filter for list sources", () => {
    expect(passesOpportunityRelevance(offTopic, keywords, "list")).toBe(true);
    expect(passesFeedScannerFilter(offTopic, keywords)).toBe(false);
  });

  it("bypasses keyword filter for watched sources", () => {
    expect(passesOpportunityRelevance(offTopic, keywords, "watched")).toBe(true);
  });

  it("bypasses keyword filter for search sources", () => {
    expect(passesOpportunityRelevance(offTopic, keywords, "search")).toBe(true);
  });

  it("applies keyword filter for following source", () => {
    expect(passesOpportunityRelevance(offTopic, keywords, "following")).toBe(
      false
    );
    expect(
      passesOpportunityRelevance("shipping our AI startup today", keywords, "following")
    ).toBe(true);
  });

  it("applies keyword filter when source is omitted", () => {
    expect(passesOpportunityRelevance(offTopic, keywords)).toBe(false);
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

describe("goal-aware score weights", () => {
  const base = {
    followers: 900,
    likes: 40,
    retweets: 8,
    replies: 12,
    quotes: 3,
    ageMinutes: 45,
  };

  it("every weight set sums to 1", () => {
    for (const [goal, w] of Object.entries(SCORE_WEIGHTS)) {
      const sum =
        w.audienceSize + w.replyTiming + w.growthVelocity + w.topicRelevance;
      expect(sum, `weights for ${goal}`).toBeCloseTo(1, 6);
    }
  });

  it("keeps topicRelevance the heaviest factor for every goal", () => {
    for (const w of Object.values(SCORE_WEIGHTS)) {
      expect(w.topicRelevance).toBeGreaterThanOrEqual(w.audienceSize);
      expect(w.topicRelevance).toBeGreaterThanOrEqual(w.replyTiming);
      expect(w.topicRelevance).toBeGreaterThanOrEqual(w.growthVelocity);
    }
  });

  it("no goal behaves exactly like the default weights", () => {
    const withUndefined = scoreConversation({ ...base, topicRelevance: 0.8 });
    expect(withUndefined.value).toBe(
      scoreConversation({ ...base, topicRelevance: 0.8, goal: undefined }).value
    );
  });

  it("leads ranks a perfect-fit small account above what audience-goal gives it", () => {
    // Small author, on-topic: worth more when hunting leads than reach.
    const onTopicSmall = { ...base, followers: 900, topicRelevance: 1 };
    const leads = scoreConversation({ ...onTopicSmall, goal: "leads" });
    const audience = scoreConversation({ ...onTopicSmall, goal: "audience" });
    expect(leads.value).toBeGreaterThan(audience.value);
  });

  it("audience goal rewards big-author momentum more than leads does", () => {
    const viralOffNiche = {
      ...base,
      followers: 2_000_000,
      likes: 4000,
      retweets: 900,
      replies: 700,
      quotes: 300,
      topicRelevance: 0.4,
    };
    const audience = scoreConversation({ ...viralOffNiche, goal: "audience" });
    const leads = scoreConversation({ ...viralOffNiche, goal: "leads" });
    expect(audience.value).toBeGreaterThan(leads.value);
  });
});
