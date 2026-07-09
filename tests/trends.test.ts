import { describe, expect, it } from "vitest";
import {
  TREND_DEFAULTS,
  clusterTrends,
  demoTrendTopics,
  formatTopicLabel,
  primaryClusterKey,
  topicSlug,
  trendRadarSentence,
  type TrendOpportunityInput,
} from "../shared/trends";

const NOW = Date.parse("2026-07-09T12:00:00Z");
const HOUR = 60 * 60 * 1000;

function opp(
  id: string,
  text: string,
  scannedAt = NOW - HOUR
): TrendOpportunityInput {
  return { id, text, scannedAt };
}

describe("formatTopicLabel / topicSlug", () => {
  it("uppercases known acronyms", () => {
    expect(formatTopicLabel("ai")).toBe("AI");
    expect(formatTopicLabel("llm")).toBe("LLM");
    expect(formatTopicLabel("saas")).toBe("SaaS");
    expect(formatTopicLabel("indie hacker")).toBe("Indie Hacker");
  });

  it("slugs labels for URL filters", () => {
    expect(topicSlug("AI")).toBe("ai");
    expect(topicSlug("Indie Hacker")).toBe("indie-hacker");
  });
});

describe("primaryClusterKey", () => {
  it("prefers niche keyword matches", () => {
    const result = primaryClusterKey(
      "Most AI startups aren't real AI companies",
      ["ai", "startup", "saas"]
    );
    expect(result?.kind).toBe("keyword");
    expect(result?.matchedKeywords).toContain("ai");
  });

  it("falls back to content tokens when no niche hit", () => {
    const result = primaryClusterKey(
      "Distribution is the product. Features are table stakes.",
      ["quantum", "blockchain"]
    );
    expect(result?.kind).toBe("token");
    expect(result?.key).toBeTruthy();
  });
});

describe("clusterTrends", () => {
  it("clusters by keyword overlap and caps at top 3", () => {
    const opportunities: TrendOpportunityInput[] = [
      opp("1", "AI wrappers aren't moats — workflows are."),
      opp("2", "Another take on AI product strategy."),
      opp("3", "Shipping SaaS weekly beats perfect roadmaps."),
      opp("4", "SaaS pricing is still broken for indie hackers."),
      opp("5", "LLM evals matter more than demos."),
      opp("6", "LLM maintenance is where models fall over."),
      opp("7", "Startup distribution > features."),
      opp("8", "Startup reply speed beats polish."),
    ];

    const result = clusterTrends({
      opportunities,
      nicheKeywords: ["ai", "saas", "llm", "startup"],
      nowMs: NOW,
      maxTopics: 3,
      minClusterSize: 2,
    });

    expect(result.demo).toBe(false);
    expect(result.topics.length).toBeLessThanOrEqual(3);
    expect(result.topics.length).toBeGreaterThanOrEqual(1);
    expect(result.corpusSize).toBe(8);
    for (const t of result.topics) {
      expect(t.conversationCount).toBeGreaterThanOrEqual(2);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.slug.length).toBeGreaterThan(0);
      // No fake engagement percentages in labels.
      expect(t.label).not.toMatch(/%/);
    }
    // Ranked by count descending.
    for (let i = 1; i < result.topics.length; i++) {
      expect(result.topics[i - 1]!.conversationCount).toBeGreaterThanOrEqual(
        result.topics[i]!.conversationCount
      );
    }
  });

  it("excludes opportunities outside the 7-day window", () => {
    const opportunities = [
      opp("fresh-a", "AI product take one", NOW - HOUR),
      opp("fresh-b", "AI product take two", NOW - 2 * HOUR),
      opp(
        "stale-a",
        "AI product take stale",
        NOW - TREND_DEFAULTS.windowMs - HOUR
      ),
      opp(
        "stale-b",
        "AI product take stale two",
        NOW - TREND_DEFAULTS.windowMs - 2 * HOUR
      ),
    ];

    const result = clusterTrends({
      opportunities,
      nicheKeywords: ["ai"],
      nowMs: NOW,
      minClusterSize: 2,
    });

    expect(result.corpusSize).toBe(2);
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0]!.conversationCount).toBe(2);
    expect(result.topics[0]!.opportunityIds).not.toContain("stale-a");
  });

  it("drops clusters below minClusterSize", () => {
    const result = clusterTrends({
      opportunities: [opp("solo", "Only one AI mention here")],
      nicheKeywords: ["ai"],
      nowMs: NOW,
      minClusterSize: 2,
    });
    expect(result.topics).toHaveLength(0);
  });
});

describe("demoTrendTopics", () => {
  it("returns deterministic fixture topics capped at 3", () => {
    const a = demoTrendTopics(NOW);
    const b = demoTrendTopics(NOW);
    expect(a.demo).toBe(true);
    expect(a.topics.length).toBeGreaterThan(0);
    expect(a.topics.length).toBeLessThanOrEqual(TREND_DEFAULTS.maxTopics);
    expect(a.topics.map((t) => t.slug)).toEqual(b.topics.map((t) => t.slug));
    expect(a.topics.map((t) => t.conversationCount)).toEqual(
      b.topics.map((t) => t.conversationCount)
    );
  });
});

describe("trendRadarSentence", () => {
  it("formats observed counts without fake scores", () => {
    expect(
      trendRadarSentence({
        slug: "ai",
        label: "AI",
        conversationCount: 3,
        opportunityIds: ["1", "2", "3"],
        matchedKeywords: ["ai"],
      })
    ).toBe("3 conversations forming around AI");
    expect(
      trendRadarSentence({
        slug: "saas",
        label: "SaaS",
        conversationCount: 1,
        opportunityIds: ["1"],
        matchedKeywords: ["saas"],
      })
    ).toBe("1 conversation forming around SaaS");
  });
});
