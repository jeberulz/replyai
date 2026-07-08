import { describe, expect, it } from "vitest";
import {
  applySaturatedThreadPenalty,
  DISMISSED_AUTHOR_COOLDOWN_MS,
  isAuthorInCooldown,
  isRetweetText,
  limitPerAuthor,
  pruneExpiredDismissedAuthors,
  shouldExcludeCandidate,
} from "../shared/feedFilters";

describe("isRetweetText", () => {
  it("detects classic RT prefix", () => {
    expect(isRetweetText("RT @someone: hello world")).toBe(true);
  });

  it("allows original posts", () => {
    expect(isRetweetText("Shipping our AI startup today")).toBe(false);
  });
});

describe("isAuthorInCooldown", () => {
  const now = 1_000_000_000_000;

  it("blocks authors inside cooldown window", () => {
    expect(
      isAuthorInCooldown(
        "sarahbuilds",
        [{ handle: "sarahbuilds", until: now + DISMISSED_AUTHOR_COOLDOWN_MS }],
        now
      )
    ).toBe(true);
  });

  it("allows authors after cooldown expires", () => {
    expect(
      isAuthorInCooldown("sarahbuilds", [{ handle: "sarahbuilds", until: now - 1 }], now)
    ).toBe(false);
  });
});

describe("pruneExpiredDismissedAuthors", () => {
  it("drops expired entries", () => {
    const now = 5000;
    const pruned = pruneExpiredDismissedAuthors(
      [
        { handle: "a", until: 4000 },
        { handle: "b", until: 6000 },
      ],
      now
    );
    expect(pruned).toEqual([{ handle: "b", until: 6000 }]);
  });
});

describe("applySaturatedThreadPenalty", () => {
  it("penalizes saturated threads except watched source", () => {
    expect(applySaturatedThreadPenalty(80, 250, "following")).toBe(68);
    expect(applySaturatedThreadPenalty(80, 250, "watched")).toBe(80);
  });
});

describe("limitPerAuthor", () => {
  it("caps tweets per author while preserving score order", () => {
    const items = [
      { authorHandle: "a", score: 90 },
      { authorHandle: "a", score: 85 },
      { authorHandle: "a", score: 80 },
      { authorHandle: "b", score: 70 },
    ];
    expect(limitPerAuthor(items, 2, 12)).toEqual([
      { authorHandle: "a", score: 90 },
      { authorHandle: "a", score: 85 },
      { authorHandle: "b", score: 70 },
    ]);
  });
});

describe("shouldExcludeCandidate", () => {
  const baseCtx = {
    repliedTweetIds: new Set<string>(),
    dismissedAuthors: [] as { handle: string; until: number }[],
    now: 1_000_000,
  };

  it("excludes already-replied tweet ids", () => {
    expect(
      shouldExcludeCandidate(
        {
          tweetId: "123",
          authorHandle: "a",
          text: "hello",
          replies: 0,
        },
        { ...baseCtx, repliedTweetIds: new Set(["123"]) }
      )
    ).toBe(true);
  });

  it("excludes retweets and replies", () => {
    expect(
      shouldExcludeCandidate(
        {
          tweetId: "1",
          authorHandle: "a",
          text: "RT @x: y",
          replies: 0,
        },
        baseCtx
      )
    ).toBe(true);
    expect(
      shouldExcludeCandidate(
        {
          tweetId: "2",
          authorHandle: "a",
          text: "a reply",
          replies: 0,
          isReply: true,
        },
        baseCtx
      )
    ).toBe(true);
  });

  it("does not exclude tweets only because they look political", () => {
    expect(
      shouldExcludeCandidate(
        {
          tweetId: "3",
          authorHandle: "a",
          text: "Congress is debating the AI Act again",
          replies: 0,
        },
        baseCtx
      )
    ).toBe(false);
  });
});
