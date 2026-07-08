import { describe, expect, it } from "vitest";
import {
  buildPersonalAnalytics,
  chooseObservedAngle,
} from "../shared/personalAnalytics";

describe("chooseObservedAngle", () => {
  it("prefers the observed scanner angle when present", () => {
    expect(
      chooseObservedAngle({
        suggestedAngle: "Show the concrete distribution moat",
        missingAngles: ["Tell a founder story"],
        replyText: "Distribution is the moat here.",
      })
    ).toBe("Show the concrete distribution moat");
  });

  it("matches the reply to the closest missing angle when no scanner angle exists", () => {
    expect(
      chooseObservedAngle({
        missingAngles: [
          "Tell the founder story behind the decision",
          "Explain the distribution moat",
          "Ask what broke first",
        ],
        replyText: "This is really a distribution moat story. The product only works once distribution compounds.",
      })
    ).toBe("Explain the distribution moat");
  });
});

describe("buildPersonalAnalytics", () => {
  it("aggregates category and angle response rates from completed outcomes", () => {
    const analytics = buildPersonalAnalytics({
      timezoneOffsetMinutes: 0,
      rows: [
        {
          category: "question",
          angle: "Ask what broke first",
          publishedAt: Date.parse("2026-07-08T09:00:00.000Z"),
          responded: true,
          editBucket: "no_edit",
        },
        {
          category: "question",
          angle: "Ask what broke first",
          publishedAt: Date.parse("2026-07-08T10:00:00.000Z"),
          responded: false,
          editBucket: "minor_edit",
        },
        {
          category: "story",
          angle: "Tell the founder story",
          publishedAt: Date.parse("2026-07-08T11:00:00.000Z"),
          responded: true,
          editBucket: "major_edit",
        },
        {
          category: "question",
          angle: "Ask what broke first",
          publishedAt: Date.parse("2026-07-08T12:00:00.000Z"),
          responded: true,
          editBucket: "minor_edit",
        },
      ],
    });

    expect(analytics.sample).toEqual({
      sent: 4,
      responded: 3,
      responseRate: 75,
      isSparse: false,
    });

    expect(analytics.categories[0]).toEqual({
      label: "question",
      sent: 3,
      responded: 2,
      responseRate: 67,
      noOrMinorSent: 3,
      noOrMinorResponseRate: 67,
      isSparse: false,
    });
    expect(analytics.angles[0]).toEqual({
      label: "Ask what broke first",
      sent: 3,
      responded: 2,
      responseRate: 67,
      noOrMinorSent: 3,
      noOrMinorResponseRate: 67,
      isSparse: false,
    });
  });

  it("maps publish hours in the user's local timezone and ranks best hours by observed responses", () => {
    const analytics = buildPersonalAnalytics({
      timezoneOffsetMinutes: 240, // America/New_York (UTC-4)
      rows: [
        {
          category: "question",
          angle: "Ask what broke first",
          publishedAt: Date.parse("2026-07-08T13:10:00.000Z"), // 09:10 local
          responded: true,
          editBucket: "no_edit",
        },
        {
          category: "question",
          angle: "Ask what broke first",
          publishedAt: Date.parse("2026-07-09T13:20:00.000Z"), // 09:20 local
          responded: true,
          editBucket: "minor_edit",
        },
        {
          category: "story",
          angle: "Tell the founder story",
          publishedAt: Date.parse("2026-07-09T17:05:00.000Z"), // 13:05 local
          responded: false,
          editBucket: "major_edit",
        },
      ],
    });

    expect(analytics.timeOfDay.buckets[9]).toEqual({
      hour: 9,
      sent: 2,
      responded: 2,
      responseRate: 100,
      noOrMinorSent: 2,
      noOrMinorResponseRate: 100,
      isSparse: true,
    });
    expect(analytics.timeOfDay.buckets[13]).toEqual({
      hour: 13,
      sent: 1,
      responded: 0,
      responseRate: 0,
      noOrMinorSent: 0,
      noOrMinorResponseRate: null,
      isSparse: true,
    });
    expect(analytics.timeOfDay.bestHours.map((bucket) => bucket.hour)).toEqual([
      9,
      13,
    ]);
  });

  it("keeps empty groups honest when there is no completed observed history", () => {
    const analytics = buildPersonalAnalytics({
      timezoneOffsetMinutes: 0,
      rows: [],
    });

    expect(analytics.sample).toEqual({
      sent: 0,
      responded: 0,
      responseRate: null,
      isSparse: true,
    });
    expect(analytics.categories).toEqual([]);
    expect(analytics.angles).toEqual([]);
    expect(analytics.timeOfDay.bestHours).toEqual([]);
    expect(
      analytics.timeOfDay.buckets.every(
        (bucket) =>
          bucket.sent === 0 &&
          bucket.responded === 0 &&
          bucket.responseRate === null &&
          bucket.noOrMinorSent === 0 &&
          bucket.noOrMinorResponseRate === null &&
          bucket.isSparse === false
      )
    ).toBe(true);
  });
});
