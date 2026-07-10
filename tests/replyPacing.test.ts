import { describe, expect, it } from "vitest";
import {
  collectPacingPublishPoints,
  DAILY_REPLY_LIMIT_THRESHOLD,
  DAILY_REPLY_WARNING_THRESHOLD,
  DAILY_REPLY_WATCH_THRESHOLD,
  deriveBestReplyWindows,
  getReplyPacingWarningLevel,
  summarizeReplyPacing,
} from "../shared/replyPacing";

describe("summarizeReplyPacing", () => {
  it("counts sent replies on the user's local day", () => {
    const nowMs = Date.parse("2026-07-08T08:00:00.000Z");
    const timezoneOffsetMinutes = 240; // America/New_York (UTC-4)

    const summary = summarizeReplyPacing({
      nowMs,
      timezoneOffsetMinutes,
      publishedReplies: [
        {
          publishedAt: Date.parse("2026-07-08T05:30:00.000Z"), // 01:30 local, same day
          editBucket: "no_edit",
        },
        {
          publishedAt: Date.parse("2026-07-08T02:30:00.000Z"), // 22:30 previous local day
          editBucket: "minor_edit",
        },
        {
          publishedAt: Date.parse("2026-07-08T11:15:00.000Z"), // 07:15 local, same day
          editBucket: "major_edit",
        },
      ],
      liveOpportunities: [],
    });

    expect(summary.sentRepliesToday).toBe(2);
    expect(summary.remainingToTarget).toBe(13);
    expect(summary.warningLevel).toBe("none");
  });
});

describe("collectPacingPublishPoints", () => {
  const nowMs = Date.parse("2026-07-08T15:00:00.000Z");

  it("counts published replies, quotes, and due scheduled sends", () => {
    const points = collectPacingPublishPoints(
      [
        {
          id: "reply-1",
          kind: "reply",
          status: "published",
          publishedAt: Date.parse("2026-07-08T10:00:00.000Z"),
        },
        {
          id: "quote-1",
          kind: "quote",
          status: "published",
          publishedAt: Date.parse("2026-07-08T11:00:00.000Z"),
        },
        {
          id: "in-flight",
          kind: "reply",
          status: "scheduled",
          scheduledFor: Date.parse("2026-07-08T14:30:00.000Z"),
        },
        {
          id: "future",
          kind: "reply",
          status: "scheduled",
          scheduledFor: Date.parse("2026-07-08T18:00:00.000Z"),
        },
        {
          id: "thread",
          kind: "thread",
          status: "published",
          publishedAt: Date.parse("2026-07-08T09:00:00.000Z"),
        },
      ],
      nowMs
    );

    expect(points).toHaveLength(3);
  });
});

describe("getReplyPacingWarningLevel", () => {
  it("steps through the warning thresholds near the ~50/day ceiling", () => {
    expect(getReplyPacingWarningLevel(DAILY_REPLY_WATCH_THRESHOLD - 1)).toBe(
      "none"
    );
    expect(getReplyPacingWarningLevel(DAILY_REPLY_WATCH_THRESHOLD)).toBe("watch");
    expect(getReplyPacingWarningLevel(DAILY_REPLY_WARNING_THRESHOLD)).toBe(
      "warning"
    );
    expect(getReplyPacingWarningLevel(DAILY_REPLY_LIMIT_THRESHOLD)).toBe("limit");
  });
});

describe("deriveBestReplyWindows", () => {
  it("blends live opportunities with clean historical send hours", () => {
    const windows = deriveBestReplyWindows({
      nowMs: Date.parse("2026-07-08T13:30:00.000Z"),
      timezoneOffsetMinutes: 0,
      publishedReplies: [
        { publishedAt: Date.parse("2026-07-01T09:05:00.000Z"), editBucket: "no_edit" },
        { publishedAt: Date.parse("2026-07-02T09:20:00.000Z"), editBucket: "minor_edit" },
        { publishedAt: Date.parse("2026-07-03T09:45:00.000Z"), editBucket: "no_edit" },
        { publishedAt: Date.parse("2026-07-03T14:00:00.000Z"), editBucket: "major_edit" },
      ],
      liveOpportunities: [
        {
          postedAt: Date.parse("2026-07-08T09:00:00.000Z"),
          scannedAt: Date.parse("2026-07-08T09:15:00.000Z"),
          score: 82,
          status: "new",
        },
        {
          postedAt: Date.parse("2026-07-08T14:00:00.000Z"),
          scannedAt: Date.parse("2026-07-08T14:10:00.000Z"),
          score: 74,
          status: "analyzed",
        },
      ],
    });

    expect(windows[0]?.hour).toBe(9);
    expect(windows[0]?.source).toBe("blend");
    expect(windows[0]?.noOrMinorRate).toBe(100);
    expect(windows.some((window) => window.hour === 14)).toBe(true);
  });

  it("falls back to deterministic default windows when there is no live or historical data", () => {
    const windows = deriveBestReplyWindows({
      nowMs: Date.parse("2026-07-08T13:30:00.000Z"),
      timezoneOffsetMinutes: 0,
      publishedReplies: [],
      liveOpportunities: [],
    });

    expect(windows.map((window) => window.hour)).toEqual([16, 12, 9]);
    expect(windows.every((window) => window.source === "default")).toBe(true);
  });
});
