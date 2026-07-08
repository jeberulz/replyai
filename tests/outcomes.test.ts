import { describe, expect, it } from "vitest";
import {
  classifyReplyOutcome,
  nextOutcomePollDelayMs,
  replyResponseRate,
  replyResponseStats,
} from "../shared/outcomes";

describe("classifyReplyOutcome", () => {
  it("classifies a target author reply as the strongest response signal", () => {
    expect(
      classifyReplyOutcome({
        targetAuthorHandle: "@founder",
        publishedMetrics: { likeCount: 4, replyCount: 2 },
        candidates: [
          { tweetId: "r1", authorHandle: "reader" },
          { tweetId: "r2", authorHandle: "Founder" },
        ],
      })
    ).toEqual({
      label: "author_replied",
      responseTweetId: "r2",
      responseAuthorHandle: "Founder",
    });
  });

  it("classifies high-reply low-like outcomes as got_ratioed", () => {
    expect(
      classifyReplyOutcome({
        publishedMetrics: { likeCount: 2, replyCount: 8 },
        candidates: [{ tweetId: "r1", authorHandle: "critic" }],
      })
    ).toEqual({
      label: "got_ratioed",
      responseTweetId: "r1",
      responseAuthorHandle: "critic",
    });
  });

  it("falls back to conversation_continued for any observed reply", () => {
    expect(
      classifyReplyOutcome({
        candidates: [{ tweetId: "r1", authorHandle: "reader" }],
      })
    ).toEqual({
      label: "conversation_continued",
      responseTweetId: "r1",
      responseAuthorHandle: "reader",
    });
  });

  it("uses public reply count when search results are unavailable", () => {
    expect(
      classifyReplyOutcome({
        publishedMetrics: { likeCount: 9, replyCount: 1 },
        candidates: [],
      })
    ).toEqual({ label: "conversation_continued" });
  });

  it("returns null when no response signal exists", () => {
    expect(
      classifyReplyOutcome({
        publishedMetrics: { likeCount: 9, replyCount: 0 },
        candidates: [],
      })
    ).toBeNull();
  });
});

describe("nextOutcomePollDelayMs", () => {
  it("backs off exponentially and caps at six hours", () => {
    expect(nextOutcomePollDelayMs(0)).toBe(15 * 60 * 1000);
    expect(nextOutcomePollDelayMs(1)).toBe(30 * 60 * 1000);
    expect(nextOutcomePollDelayMs(2)).toBe(60 * 60 * 1000);
    expect(nextOutcomePollDelayMs(20)).toBe(6 * 60 * 60 * 1000);
  });
});

describe("replyResponseRate", () => {
  it("returns null without sent outcomes", () => {
    expect(replyResponseRate({ responded: 0, sent: 0 })).toBeNull();
  });

  it("rounds the observed response percentage", () => {
    expect(replyResponseRate({ responded: 2, sent: 3 })).toBe(67);
  });
});

describe("replyResponseStats", () => {
  it("counts completed observed outcomes and excludes active/failed trackers", () => {
    expect(
      replyResponseStats([
        { status: "responded" },
        { status: "expired" },
        { status: "active" },
        { status: "failed" },
      ])
    ).toEqual({ rate: 50, responded: 1, sent: 2 });
  });
});
