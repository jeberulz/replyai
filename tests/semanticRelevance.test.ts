import { describe, expect, it } from "vitest";
import { topicRelevanceForKeywords } from "../shared/scoring";
import {
  combineTopicRelevance,
  CURATED_SOURCE_MIN_RELEVANCE,
  demoSemanticRelevance,
  demoSuggestedAngle,
  opportunityStillRelevant,
  passesCombinedFeedFilter,
  resolveManualTopicRelevance,
  resolveSuggestedAngle,
  selectSemanticClassificationTargets,
} from "../shared/semanticRelevance";

describe("combineTopicRelevance", () => {
  it("uses max(keyword, semantic * 0.9)", () => {
    expect(combineTopicRelevance(0.3, 0.8)).toBeCloseTo(0.72);
    expect(combineTopicRelevance(0.7, 0.5)).toBe(0.7);
  });
});

describe("suggested-angle hygiene", () => {
  it("does not interpolate weak niche tokens into missing-angle copy", () => {
    const angle = demoSuggestedAngle("Everyone asks what to build?", {
      keywords: ["not", "all", "Deleted", "Everyone"],
      voiceTopics: ["get"],
      recentTopics: [],
    });

    expect(angle).toBe(
      "Answer with one specific example from your own work — skip the generic advice."
    );
    expect(angle).not.toMatch(/missing (not|all|deleted|everyone|get) angle/i);
  });
});

describe("passesCombinedFeedFilter", () => {
  const keywords = ["ai", "startup"];

  it("blocks tweets the semantic screen marks unsafe", () => {
    expect(
      passesCombinedFeedFilter(
        "Trump won the election again",
        keywords,
        0,
        {
          relevance: 0,
          reason: "Political context",
          brandSafety: "unsafe",
        },
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
        semantic,
        "following"
      )
    ).toBe(true);
  });

  it("rejects off-topic curated sources below the relaxed relevance bar", () => {
    expect(
      passesCombinedFeedFilter(
        "random pasta recipe",
        keywords,
        0,
        { relevance: 0.1, reason: "off-topic", brandSafety: "safe" },
        "watched"
      )
    ).toBe(false);
  });

  it("passes curated sources that clear the relaxed relevance bar", () => {
    expect(
      passesCombinedFeedFilter(
        "Shipping an AI agent for support teams",
        keywords,
        0,
        {
          relevance: CURATED_SOURCE_MIN_RELEVANCE / 0.9,
          reason: "weak but on-niche",
          brandSafety: "safe",
        },
        "list"
      )
    ).toBe(true);
  });

  it("still blocks unsafe curated sources even when relevance is high", () => {
    expect(
      passesCombinedFeedFilter(
        "boycott this founder",
        keywords,
        0.9,
        {
          relevance: 0.9,
          reason: "outrage",
          brandSafety: "unsafe",
        },
        "search"
      )
    ).toBe(false);
  });
});

describe("opportunityStillRelevant", () => {
  it("applies the curated bar to stored topic relevance", () => {
    expect(
      opportunityStillRelevant("pasta", ["ai"], "watched", 0.2)
    ).toBe(false);
    expect(
      opportunityStillRelevant("ai agents", ["ai"], "watched", 0.35)
    ).toBe(true);
  });

  it("keeps the following bar at FEED_SCANNER_MIN_RELEVANCE", () => {
    expect(
      opportunityStillRelevant("x", ["ai"], "following", 0.4)
    ).toBe(false);
    expect(
      opportunityStillRelevant("x", ["ai"], "following", 0.5)
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

  it("caps the batch at the operator-supplied limit", () => {
    const candidates = Array.from({ length: 30 }, (_, i) => ({
      tweetId: `t${i}`,
      text: "x",
      source: "list" as const,
      keywordScore: 1,
      velocity: i,
    }));
    // Default cap is 25; a lower operator limit trims further.
    expect(selectSemanticClassificationTargets(candidates).length).toBe(25);
    expect(
      selectSemanticClassificationTargets(candidates, undefined, 10).length
    ).toBe(10);
    // A non-positive limit falls back to the default cap.
    expect(
      selectSemanticClassificationTargets(candidates, undefined, 0).length
    ).toBe(25);
  });
});

describe("resolveSuggestedAngle", () => {
  it("prefers the triage angle when present", () => {
    expect(
      resolveSuggestedAngle(
        {
          relevance: 0.8,
          reason: "fit",
          brandSafety: "safe",
          suggestedAngle: "Name the eval gap the thread skipped.",
        },
        "hot take with 40% growth?"
      )
    ).toBe("Name the eval gap the thread skipped.");
  });

  it("falls back to demoSuggestedAngle when cache omits angle", () => {
    const text = "We're rolling out autonomous support bots for customer teams";
    expect(
      resolveSuggestedAngle(
        {
          relevance: 0.7,
          reason: "Cached safe result",
          brandSafety: "safe",
        },
        text,
        { keywords: ["ai"], voiceTopics: [], recentTopics: [] }
      )
    ).toBe(
      demoSuggestedAngle(text, {
        keywords: ["ai"],
        voiceTopics: [],
        recentTopics: [],
      })
    );
  });
});

describe("demoSuggestedAngle", () => {
  it("returns a deterministic actionable angle for agent/support posts", () => {
    const text = "We're rolling out autonomous support bots for customer teams";
    const a = demoSuggestedAngle(text, {
      keywords: ["ai agents"],
      voiceTopics: [],
      recentTopics: [],
    });
    const b = demoSuggestedAngle(text, {
      keywords: ["ai agents"],
      voiceTopics: [],
      recentTopics: [],
    });
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(20);
    expect(a.toLowerCase()).not.toMatch(/share your thoughts/);
  });

  it("does not use the old hot-take / digit template heuristics", () => {
    const hot = demoSuggestedAngle("Unpopular opinion: hot take about shipping");
    const digits = demoSuggestedAngle("We grew 40% MoM with no new hires");
    expect(hot).not.toMatch(/measured contrarian/i);
    expect(digits).not.toMatch(/numbers replying to numbers/i);
  });
});

describe("demoSemanticRelevance", () => {
  it("always includes a suggestedAngle", () => {
    const result = demoSemanticRelevance(
      "We're rolling out autonomous support bots for customer teams",
      {
        keywords: ["llm agents", "ai"],
        voiceTopics: [],
        recentTopics: [],
      }
    );
    expect(result.suggestedAngle).toBeTruthy();
    expect(result.suggestedAngle).toBe(
      demoSuggestedAngle(
        "We're rolling out autonomous support bots for customer teams",
        {
          keywords: ["llm agents", "ai"],
          voiceTopics: [],
          recentTopics: [],
        }
      )
    );
  });

  it("returns an unsafe verdict for political content", () => {
    const result = demoSemanticRelevance(
      "Congress passed a new immigration bill",
      {
        keywords: ["ai"],
        voiceTopics: [],
        recentTopics: [],
      }
    );
    expect(result.relevance).toBe(0);
    expect(result.brandSafety).toBe("unsafe");
    expect(result.suggestedAngle).toBeTruthy();
  });

  it("allows niche policy discussions when they fit the user's focus", () => {
    const result = demoSemanticRelevance(
      "Congress is debating how the EU AI Act compliance rules will change how AI startups ship enterprise copilots",
      {
        keywords: ["ai", "startup", "compliance"],
        voiceTopics: ["enterprise copilots"],
        recentTopics: [],
      }
    );
    expect(result.brandSafety).toBe("safe");
    expect(result.relevance).toBeGreaterThan(0.4);
  });

  it("returns an unsafe verdict for tragedy and outrage-bait threads", () => {
    expect(
      demoSemanticRelevance("Breaking: earthquake victims need help right now", {
        keywords: ["ai"],
        voiceTopics: [],
        recentTopics: [],
      }).brandSafety
    ).toBe("unsafe");
    expect(
      demoSemanticRelevance("Everyone should boycott this founder, total scam", {
        keywords: ["startup"],
        voiceTopics: [],
        recentTopics: [],
      }).brandSafety
    ).toBe("unsafe");
  });
});

describe("resolveManualTopicRelevance", () => {
  it("uses semantic relevance when available instead of defaulting to 0.5", () => {
    expect(
      resolveManualTopicRelevance(0, {
        relevance: 0.82,
        reason: "strong semantic fit",
        brandSafety: "safe",
      })
    ).toBeCloseTo(0.738);
  });

  it("zeros out unsafe semantic matches", () => {
    expect(
      resolveManualTopicRelevance(0.3, {
        relevance: 0.9,
        reason: "unsafe thread",
        brandSafety: "unsafe",
      })
    ).toBe(0.3);
  });

  it("keeps the old 0.5 neutral fallback only when no semantic score is available", () => {
    expect(resolveManualTopicRelevance(0, undefined)).toBe(0.5);
    expect(resolveManualTopicRelevance(0.7, undefined)).toBe(0.7);
  });
});
