import { describe, expect, it } from "vitest";
import { demoResearchProfiles } from "../shared/demoData";
import {
  followersBandScore,
  rankResearchProfiles,
  type ResearchTweetSample,
} from "../shared/researchScoring";

describe("followersBandScore", () => {
  it("prefers mid-size audiences", () => {
    expect(followersBandScore(500)).toBeLessThan(followersBandScore(50_000));
    expect(followersBandScore(50_000)).toBeGreaterThan(followersBandScore(2_000_000));
  });
});

describe("rankResearchProfiles", () => {
  const samples: ResearchTweetSample[] = [
    {
      tweetId: "1",
      text: "Shipping our AI SaaS startup today",
      likes: 500,
      replies: 40,
      authorHandle: "alpha",
      authorName: "Alpha",
      authorFollowers: 40_000,
      authorBio: "AI founder",
    },
    {
      tweetId: "2",
      text: "Another AI startup post",
      likes: 300,
      replies: 20,
      authorHandle: "alpha",
      authorName: "Alpha",
      authorFollowers: 40_000,
      authorBio: "AI founder",
    },
    {
      tweetId: "3",
      text: "Random cooking tips",
      likes: 50,
      replies: 5,
      authorHandle: "beta",
      authorName: "Beta",
      authorFollowers: 500,
      authorBio: "Chef",
    },
  ];

  it("ranks niche-aligned profiles higher", () => {
    const ranked = rankResearchProfiles(samples, ["ai", "startup"]);
    expect(ranked[0]?.handle).toBe("alpha");
    expect(ranked[0]?.exampleTweets.length).toBeGreaterThan(0);
  });
});

describe("demoResearchProfiles", () => {
  it("returns five demo profiles", () => {
    expect(demoResearchProfiles("ai founders").length).toBeGreaterThanOrEqual(3);
  });
});
