import { describe, expect, it } from "vitest";
import { demoResearchProfiles } from "../shared/demoData";
import {
  isWatchedHandle,
  mergeSeedKeywords,
  mergeWatchedHandles,
} from "../shared/researchWatch";
import {
  bandNormalizedEngagementScore,
  followersBandScore,
  postFrequencyLabel,
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

  it("does not structurally over-rank huge accounts on raw likes alone", () => {
    const ranked = rankResearchProfiles(
      [
        {
          tweetId: "mid-1",
          text: "AI product lessons",
          likes: 1200,
          replies: 35,
          postedAt: Date.UTC(2026, 6, 8, 10),
          authorHandle: "mid",
          authorName: "Mid",
          authorFollowers: 60_000,
          authorBio: "AI founder",
        },
        {
          tweetId: "mid-2",
          text: "Shipping notes for founders",
          likes: 1000,
          replies: 30,
          postedAt: Date.UTC(2026, 6, 6, 10),
          authorHandle: "mid",
          authorName: "Mid",
          authorFollowers: 60_000,
          authorBio: "AI founder",
        },
        {
          tweetId: "big-1",
          text: "AI product lessons",
          likes: 3200,
          replies: 35,
          postedAt: Date.UTC(2026, 6, 8, 10),
          authorHandle: "big",
          authorName: "Big",
          authorFollowers: 2_000_000,
          authorBio: "AI founder",
        },
        {
          tweetId: "big-2",
          text: "Shipping notes for founders",
          likes: 2800,
          replies: 30,
          postedAt: Date.UTC(2026, 6, 6, 10),
          authorHandle: "big",
          authorName: "Big",
          authorFollowers: 2_000_000,
          authorBio: "AI founder",
        },
      ],
      ["ai", "founder", "shipping"]
    );

    expect(ranked[0]?.handle).toBe("mid");
  });
});

describe("bandNormalizedEngagementScore", () => {
  it("does not let raw like volume from huge accounts outrank strong mid-size engagement", () => {
    expect(bandNormalizedEngagementScore(60_000, 1_100)).toBe(1);
    expect(bandNormalizedEngagementScore(2_000_000, 3_000)).toBeLessThan(0.5);
  });
});

describe("postFrequencyLabel", () => {
  it("derives cadence from tweet timestamps", () => {
    const now = Date.UTC(2026, 6, 8, 12, 0, 0);
    const tweets: ResearchTweetSample[] = [
      {
        tweetId: "1",
        text: "a",
        likes: 10,
        replies: 1,
        postedAt: now,
        authorHandle: "alpha",
        authorName: "Alpha",
        authorFollowers: 1_000,
      },
      {
        tweetId: "2",
        text: "b",
        likes: 10,
        replies: 1,
        postedAt: now - 2 * 86_400_000,
        authorHandle: "alpha",
        authorName: "Alpha",
        authorFollowers: 1_000,
      },
      {
        tweetId: "3",
        text: "c",
        likes: 10,
        replies: 1,
        postedAt: now - 4 * 86_400_000,
        authorHandle: "alpha",
        authorName: "Alpha",
        authorFollowers: 1_000,
      },
    ];

    expect(postFrequencyLabel(tweets)).toBe("Posts every few days");
  });

  it("falls back to explicit uncertainty when timestamps are missing", () => {
    const tweets: ResearchTweetSample[] = [
      {
        tweetId: "1",
        text: "a",
        likes: 10,
        replies: 1,
        authorHandle: "alpha",
        authorName: "Alpha",
        authorFollowers: 1_000,
      },
    ];

    expect(postFrequencyLabel(tweets)).toBe("Recent sample only");
  });
});

describe("demoResearchProfiles", () => {
  it("returns five demo profiles", () => {
    expect(demoResearchProfiles("ai founders").length).toBeGreaterThanOrEqual(3);
  });
});

describe("research watch helpers", () => {
  it("dedupes watched handles case-insensitively", () => {
    expect(mergeWatchedHandles(["SarahBuilds"], "@sarahbuilds")).toEqual([
      "sarahbuilds",
    ]);
    expect(isWatchedHandle(["SarahBuilds"], "sarahbuilds")).toBe(true);
  });

  it("seeds scanner keywords from topic tags without duplicates", () => {
    expect(mergeSeedKeywords(["ai", "founder"], ["AI", "startup", "founder"])).toEqual({
      keywords: ["ai", "founder", "startup"],
      seeded: ["startup"],
    });
  });
});
