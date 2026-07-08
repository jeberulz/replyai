import { describe, expect, it } from "vitest";
import { dedupeCandidates, type TimelineTweet } from "../convex/scannerActions";

function makeTweet(
  overrides: Partial<TimelineTweet> & Pick<TimelineTweet, "tweetId" | "text">
): TimelineTweet {
  return {
    tweetId: overrides.tweetId,
    text: overrides.text,
    authorHandle: overrides.authorHandle ?? "author",
    authorName: overrides.authorName ?? "Author",
    authorFollowers: overrides.authorFollowers ?? 1000,
    postedAt: overrides.postedAt ?? Date.now(),
    likes: overrides.likes ?? 10,
    retweets: overrides.retweets ?? 2,
    replies: overrides.replies ?? 1,
    quotes: overrides.quotes ?? 0,
    source: overrides.source,
    sourceLabel: overrides.sourceLabel,
    isReply: overrides.isReply,
  };
}

describe("dedupeCandidates", () => {
  it("keeps the highest-priority source for duplicate text across tweet ids", () => {
    const watched = makeTweet({
      tweetId: "watched-1",
      text: "Same text from two discovery sources",
      source: "watched",
    });
    const following = makeTweet({
      tweetId: "following-1",
      text: "Same text from two discovery sources",
      source: "following",
    });

    expect(dedupeCandidates([[watched], [following]])).toEqual([watched]);
  });

  it("still dedupes exact tweet ids even when the text differs", () => {
    const first = makeTweet({
      tweetId: "same-id",
      text: "Original text",
      source: "search",
    });
    const second = makeTweet({
      tweetId: "same-id",
      text: "Edited text",
      source: "following",
    });

    expect(dedupeCandidates([[first], [second]])).toEqual([first]);
  });
});
