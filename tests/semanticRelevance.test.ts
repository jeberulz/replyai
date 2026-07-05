import { describe, expect, it } from "vitest";
import { topicRelevanceForKeywords } from "../shared/scoring";
import {
  combineTopicRelevance,
  demoSemanticRelevance,
  passesCombinedFeedFilter,
  selectSemanticClassificationTargets,
} from "../shared/semanticRelevance";

describe("combineTopicRelevance", () => {
  it("uses max(keyword, semantic * 0.9)", () => {
    expect(combineTopicRelevance(0.3, 0.8)).toBeCloseTo(0.72);
    expect(combineTopicRelevance(0.7, 0.5)).toBe(0.7);
  });
});

describe("passesCombinedFeedFilter", () => {
  const keywords = ["ai", "startup"];

  it("blocks political tweets even with high semantic score", () => {
    expect(
      passesCombinedFeedFilter(
        "Trump won the election again",
        keywords,
        0,
        0.95,
        "following"
      )
    ).toBe(false);
  });

  it("surfaces paraphrased niche fit on following timeline", () => {
    const text = "We're rolling out autonomous support bots for customer teams";
    const keywordScore = topicRelevanceForKeywords(text, ["llm agents"]);
    expect(keywordScore).toBe(0);
    const semantic = demoSemanticRelevance(text, {
      keywords: ["llm agents", "ai"],
      voiceTopics: [],
      recentTopics: [],
    });
    expect(semantic.relevance).toBeGreaterThanOrEqual(0.5);
    expect(
      passesCombinedFeedFilter(
        text,
        ["llm agents"],
        keywordScore,
        semantic.relevance,
        "following"
      )
    ).toBe(true);
  });

  it("always passes curated sources unless political", () => {
    expect(
      passesCombinedFeedFilter("random pasta recipe", keywords, 0, 0, "watched")
    ).toBe(true);
  });
});

describe("selectSemanticClassificationTargets", () => {
  it("includes list/watched and top rescue following tweets by velocity", () => {
    const following = Array.from({ length: 10 }, (_, i) => ({
      tweetId: `f${i}`,
      text: "x",
      source: "following" as const,
      keywordScore: 0,
      velocity: i,
    }));
    const targets = selectSemanticClassificationTargets([
      {
        tweetId: "1",
        text: "a",
        source: "list",
        keywordScore: 0,
        velocity: 1,
      },
      ...following,
    ]);
    expect(targets.map((t) => t.tweetId)).toContain("1");
    expect(targets.filter((t) => t.tweetId.startsWith("f")).length).toBe(8);
    expect(targets.some((t) => t.tweetId === "f0")).toBe(false);
    expect(targets.some((t) => t.tweetId === "f9")).toBe(true);
  });
});

describe("demoSemanticRelevance", () => {
  it("returns zero for political content", () => {
    expect(
      demoSemanticRelevance("Congress passed a new immigration bill", {
        keywords: ["ai"],
        voiceTopics: [],
        recentTopics: [],
      }).relevance
    ).toBe(0);
  });
});
