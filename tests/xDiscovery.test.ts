import { describe, expect, it } from "vitest";
import {
  parseXStatusUrl,
  validateXDiscoveryRequest,
  validateXSearchResponse,
} from "../shared/xDiscovery";

describe("parseXStatusUrl", () => {
  it("normalizes x.com and twitter status URLs", () => {
    expect(
      parseXStatusUrl("https://x.com/sarahbuilds/status/1800000000000000001?s=20")
    ).toEqual({
      tweetId: "1800000000000000001",
      authorHandle: "sarahbuilds",
      canonicalUrl: "https://x.com/sarahbuilds/status/1800000000000000001",
    });
    expect(parseXStatusUrl("https://mobile.twitter.com/a_b/statuses/123456"))
      .toMatchObject({
        tweetId: "123456",
        authorHandle: "a_b",
      });
  });

  it("rejects non-status and non-X URLs", () => {
    expect(parseXStatusUrl("https://x.com/sarahbuilds")).toBeNull();
    expect(parseXStatusUrl("https://example.com/a/status/123456")).toBeNull();
    expect(parseXStatusUrl("not a url")).toBeNull();
  });
});

describe("validateXDiscoveryRequest", () => {
  it("accepts a bounded search request", () => {
    expect(
      validateXDiscoveryRequest({
        query: "AI founder conversations from credible builders",
        fromDate: "2026-07-10",
        toDate: "2026-07-11",
        maxResults: 5,
        maxToolCalls: 3,
        allowedHandles: ["sarahbuilds", "@priyaml"],
      })
    ).toEqual([]);
  });

  it("rejects over-broad requests and mixed handle modes", () => {
    const errors = validateXDiscoveryRequest({
      query: "",
      fromDate: "2026-07-01",
      toDate: "2026-07-20",
      maxResults: 50,
      maxToolCalls: 20,
      allowedHandles: ["sarahbuilds"],
      excludedHandles: ["bad-handle!"],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "query_required",
        "date_window_too_large",
        "max_results_out_of_bounds",
        "max_tool_calls_out_of_bounds",
        "handle_modes_are_mutually_exclusive",
        "invalid_handle",
      ])
    );
  });
});

describe("validateXSearchResponse", () => {
  const validResponse = {
    candidates: [
      {
        postUrl: "https://x.com/sarahbuilds/status/1800000000000000001",
        tweetId: "1800000000000000001",
        authorHandle: "sarahbuilds",
        relevanceReason: "Strong live AI workflow debate with room for a builder angle.",
        missingAngle: "Connect workflow ownership to data quality, not just model swaps.",
        searchIntent: "ai-workflow-moats",
        citations: ["https://x.com/sarahbuilds/status/1800000000000000001"],
        mediaInfluenced: false,
      },
    ],
  };

  it("returns normalized cited candidates", () => {
    const result = validateXSearchResponse(validResponse, [
      "https://x.com/sarahbuilds/status/1800000000000000001",
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected valid response");
    expect(result.value).toEqual([
      expect.objectContaining({
        tweetId: "1800000000000000001",
        canonicalUrl: "https://x.com/sarahbuilds/status/1800000000000000001",
        authorHandle: "sarahbuilds",
      }),
    ]);
  });

  it("rejects malformed schemas", () => {
    expect(validateXSearchResponse({ candidates: [{ postUrl: "x" }] }, []).ok).toBe(
      false
    );
    expect(validateXSearchResponse("not-json", []).ok).toBe(false);
  });

  it("rejects candidates without matching X citations", () => {
    const result = validateXSearchResponse(
      {
        candidates: [
          {
            ...validResponse.candidates[0],
            postUrl: undefined,
            citations: ["https://example.com/article"],
          },
        ],
      },
      []
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected citation failure");
    expect(result.errors).toContain("candidate_0_missing_x_citation");
  });

  it("rejects fake metric language in reasons or angles", () => {
    const result = validateXSearchResponse(
      {
        candidates: [
          {
            ...validResponse.candidates[0],
            relevanceReason: "92% engagement probability from Grok.",
          },
        ],
      },
      ["https://x.com/sarahbuilds/status/1800000000000000001"]
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected fake metric failure");
    expect(result.errors).toContain("candidate_0_fake_metric_language");
  });

  it("dedupes repeated candidates by tweet id", () => {
    const result = validateXSearchResponse(
      { candidates: [validResponse.candidates[0], validResponse.candidates[0]] },
      ["https://x.com/sarahbuilds/status/1800000000000000001"]
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected valid response");
    expect(result.value).toHaveLength(1);
  });
});
