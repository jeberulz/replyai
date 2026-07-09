import { describe, expect, it } from "vitest";
import {
  ALL_NOTIFICATION_SOURCES,
  NOTIFICATION_DEFAULTS,
  buildNotificationCopy,
  classifyNotificationTier,
  evaluateNotificationEnqueue,
  isInQuietHours,
  opportunitySourceEnabled,
} from "../shared/notifications";

const baseSettings = {
  masterEnabled: true,
  pushEnabled: true,
  digestEnabled: true,
  scoreThreshold: 70,
  dailyCap: 5,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  timezone: "UTC",
  youngWindowHours: 2,
  enabledSources: [...ALL_NOTIFICATION_SOURCES],
  permissionGrantedAt: Date.now(),
};

describe("notification quiet hours", () => {
  it("detects overnight quiet hours in UTC", () => {
    const lateNight = Date.parse("2026-07-09T23:30:00Z");
    const morning = Date.parse("2026-07-09T07:30:00Z");
    const afternoon = Date.parse("2026-07-09T14:00:00Z");
    expect(
      isInQuietHours(
        lateNight,
        NOTIFICATION_DEFAULTS.quietHoursStart,
        NOTIFICATION_DEFAULTS.quietHoursEnd,
        "UTC"
      )
    ).toBe(true);
    expect(
      isInQuietHours(
        morning,
        NOTIFICATION_DEFAULTS.quietHoursStart,
        NOTIFICATION_DEFAULTS.quietHoursEnd,
        "UTC"
      )
    ).toBe(true);
    expect(
      isInQuietHours(
        afternoon,
        NOTIFICATION_DEFAULTS.quietHoursStart,
        NOTIFICATION_DEFAULTS.quietHoursEnd,
        "UTC"
      )
    ).toBe(false);
  });
});

describe("golden-15 tier classification", () => {
  const now = Date.parse("2026-07-09T12:10:00Z");

  it("classifies watched young tweets as golden15", () => {
    expect(
      classifyNotificationTier(
        {
          score: 82,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "watched",
        },
        baseSettings,
        now
      )
    ).toBe("golden15");
  });

  it("classifies list young tweets as golden15", () => {
    expect(
      classifyNotificationTier(
        {
          score: 75,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "list",
        },
        baseSettings,
        now
      )
    ).toBe("golden15");
  });

  it("falls back to hot for following when still young", () => {
    expect(
      classifyNotificationTier(
        {
          score: 80,
          postedAt: Date.parse("2026-07-09T11:30:00Z"),
          source: "following",
        },
        baseSettings,
        now
      )
    ).toBe("hot");
  });

  it("skips stale or low-score opportunities", () => {
    expect(
      classifyNotificationTier(
        {
          score: 60,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "watched",
        },
        baseSettings,
        now
      )
    ).toBeNull();
    expect(
      classifyNotificationTier(
        {
          score: 90,
          postedAt: Date.parse("2026-07-09T09:00:00Z"),
          source: "watched",
        },
        baseSettings,
        now
      )
    ).toBeNull();
  });
});

describe("notification copy", () => {
  it("uses the golden-15 line without fake ML percentages", () => {
    const copy = buildNotificationCopy("golden15");
    expect(copy.body).toBe(
      "Reply in the next ~15 min — window is still young."
    );
    expect(copy.body).not.toMatch(/%/);
  });
});

describe("enqueue eligibility", () => {
  const now = Date.parse("2026-07-09T12:05:00Z");

  it("requires master enabled", () => {
    expect(
      evaluateNotificationEnqueue({
        settings: { ...baseSettings, masterEnabled: false },
        opportunity: {
          score: 80,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "watched",
        },
        nowMs: now,
        deliveredToday: 0,
        existingAlertForOpportunity: false,
      })
    ).toEqual({ action: "skip", reason: "master_disabled" });
  });

  it("respects per-source toggles", () => {
    expect(
      evaluateNotificationEnqueue({
        settings: {
          ...baseSettings,
          enabledSources: ["following", "lists", "search"],
        },
        opportunity: {
          score: 80,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "watched",
        },
        nowMs: now,
        deliveredToday: 0,
        existingAlertForOpportunity: false,
      })
    ).toEqual({ action: "skip", reason: "source_disabled" });
    expect(
      opportunitySourceEnabled("list", ["following", "lists"])
    ).toBe(true);
  });

  it("enqueues golden15 when eligible", () => {
    expect(
      evaluateNotificationEnqueue({
        settings: baseSettings,
        opportunity: {
          score: 88,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "list",
        },
        nowMs: now,
        deliveredToday: 0,
        existingAlertForOpportunity: false,
      })
    ).toEqual({ action: "enqueue", tier: "golden15" });
  });

  it("skips when daily cap is reached and digest is off", () => {
    expect(
      evaluateNotificationEnqueue({
        settings: { ...baseSettings, digestEnabled: false },
        opportunity: {
          score: 88,
          postedAt: Date.parse("2026-07-09T12:00:00Z"),
          source: "list",
        },
        nowMs: now,
        deliveredToday: 5,
        existingAlertForOpportunity: false,
      })
    ).toEqual({ action: "skip", reason: "daily_cap_reached" });
  });
});
