import { describe, expect, it } from "vitest";
import {
  buildAnalyzeDeepLink,
  buildOpportunityDeepLink,
  extractTweetUrlFromQuery,
  filterOpportunitiesForPalette,
} from "../src/lib/commandPalette";

describe("extractTweetUrlFromQuery", () => {
  it("detects a bare x.com status URL", () => {
    expect(
      extractTweetUrlFromQuery(
        "https://x.com/sarahbuilds/status/1800000000000000001"
      )
    ).toBe("https://x.com/sarahbuilds/status/1800000000000000001");
  });

  it("detects twitter.com / mobile / www variants", () => {
    expect(
      extractTweetUrlFromQuery("https://twitter.com/a_b/status/123456")
    ).toBe("https://twitter.com/a_b/status/123456");
    expect(
      extractTweetUrlFromQuery("https://www.x.com/a_b/status/123456")
    ).toBe("https://www.x.com/a_b/status/123456");
    expect(
      extractTweetUrlFromQuery("https://mobile.twitter.com/a_b/status/123456")
    ).toBe("https://mobile.twitter.com/a_b/status/123456");
  });

  it("extracts a URL embedded in pasted text", () => {
    expect(
      extractTweetUrlFromQuery(
        "check this https://x.com/i/web/status/123456?s=20 please"
      )
    ).toBe("https://x.com/i/web/status/123456?s=20");
  });

  it("rejects non-tweet URLs and empty input", () => {
    expect(extractTweetUrlFromQuery("https://x.com/sarahbuilds")).toBeNull();
    expect(
      extractTweetUrlFromQuery("https://example.com/status/123456")
    ).toBeNull();
    expect(extractTweetUrlFromQuery("not a url")).toBeNull();
    expect(extractTweetUrlFromQuery("")).toBeNull();
    expect(extractTweetUrlFromQuery("   ")).toBeNull();
  });
});

describe("buildAnalyzeDeepLink", () => {
  it("builds /dashboard?url=…&auto=1 (WP10 ruling)", () => {
    const url = "https://x.com/sarahbuilds/status/1800000000000000001";
    expect(buildAnalyzeDeepLink(url)).toBe(
      `/dashboard?url=${encodeURIComponent(url)}&auto=1`
    );
  });
});

describe("buildOpportunityDeepLink", () => {
  it("builds /feed?opportunity=…", () => {
    expect(buildOpportunityDeepLink("jd7abc")).toBe("/feed?opportunity=jd7abc");
  });
});

describe("filterOpportunitiesForPalette", () => {
  const opps = [
    {
      _id: "1",
      authorHandle: "alice",
      text: "shipping AI tools",
      score: 40,
      effectiveScore: 40,
    },
    {
      _id: "2",
      authorHandle: "bob",
      text: "hot take on growth",
      score: 90,
      effectiveScore: 90,
    },
    {
      _id: "3",
      authorHandle: "carol",
      text: "AI readiness for designers",
      score: 70,
      effectiveScore: 70,
    },
  ];

  it("returns top-scored opportunities when query is empty", () => {
    expect(filterOpportunitiesForPalette(opps, "").map((o) => o._id)).toEqual([
      "2",
      "3",
      "1",
    ]);
  });

  it("filters by handle or text snippet and caps at limit", () => {
    expect(
      filterOpportunitiesForPalette(opps, "AI", 2).map((o) => o._id)
    ).toEqual(["3", "1"]);
    expect(
      filterOpportunitiesForPalette(opps, "@bob").map((o) => o._id)
    ).toEqual(["2"]);
  });
});
