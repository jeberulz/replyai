import { describe, expect, it } from "vitest";
import {
  cadenceMinutesForScan,
  dedupeCandidates,
  normalizeScannerPlan,
  shouldEnqueueScan,
  type TimelineTweet,
} from "../convex/scannerActions";

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

describe("normalizeScannerPlan", () => {
  it("maps plan aliases into scanner tiers", () => {
    expect(normalizeScannerPlan("free")).toBe("free");
    expect(normalizeScannerPlan("pro")).toBe("pro");
    expect(normalizeScannerPlan("founder")).toBe("priority");
    expect(normalizeScannerPlan("Pro+")).toBe("priority");
  });
});

describe("cadenceMinutesForScan", () => {
  it("gives priority plans the 15 minute lane when scans are productive", () => {
    expect(cadenceMinutesForScan({ plan: "founder", lastScanCount: 8 })).toBe(15);
    expect(cadenceMinutesForScan({ plan: "pro", lastScanCount: 8 })).toBe(15);
  });

  it("backs off low-yield plans to cheaper cadences", () => {
    expect(cadenceMinutesForScan({ plan: "founder", lastScanCount: 0 })).toBe(30);
    expect(cadenceMinutesForScan({ plan: "pro", lastScanCount: 0 })).toBe(60);
    expect(cadenceMinutesForScan({ plan: "free", lastScanCount: 0 })).toBe(120);
  });
});

describe("shouldEnqueueScan", () => {
  it("enqueues first-run users immediately", () => {
    expect(shouldEnqueueScan(Date.now(), { plan: "pro" })).toBe(true);
  });

  it("waits until the cadence window has elapsed", () => {
    const now = Date.now();
    expect(
      shouldEnqueueScan(now, {
        plan: "pro",
        lastScanCount: 4,
        lastScanAt: now - 29 * 60_000,
      })
    ).toBe(false);
    expect(
      shouldEnqueueScan(now, {
        plan: "pro",
        lastScanCount: 4,
        lastScanAt: now - 30 * 60_000,
      })
    ).toBe(true);
  });
});
