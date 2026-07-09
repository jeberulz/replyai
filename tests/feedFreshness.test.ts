import { describe, expect, it } from "vitest";
import {
  effectiveDisplayScore,
  freshnessLabel,
  isOpportunityExpired,
  opportunityAgeMinutes,
  replyTimingFactor,
  REPLY_WINDOW_DEAD_MINUTES,
  REPLY_WINDOW_FULL_MINUTES,
} from "../shared/feedFreshness";

describe("opportunityAgeMinutes", () => {
  it("computes minutes since posted", () => {
    const postedAt = 1_000_000_000_000;
    const nowMs = postedAt + 90 * 60 * 1000;
    expect(opportunityAgeMinutes(postedAt, nowMs)).toBeCloseTo(90, 5);
  });

  it("clamps negative ages (clock skew) to zero", () => {
    const postedAt = 1_000_000_000_000;
    expect(opportunityAgeMinutes(postedAt, postedAt - 5_000)).toBe(0);
  });
});

describe("replyTimingFactor", () => {
  it("is full credit at and before the full window", () => {
    expect(replyTimingFactor(0)).toBe(1);
    expect(replyTimingFactor(REPLY_WINDOW_FULL_MINUTES)).toBe(1);
  });

  it("decays linearly between the full and dead windows", () => {
    const midpoint =
      REPLY_WINDOW_FULL_MINUTES +
      (REPLY_WINDOW_DEAD_MINUTES - REPLY_WINDOW_FULL_MINUTES) / 2;
    expect(replyTimingFactor(midpoint)).toBeCloseTo(0.5, 5);
  });

  it("is monotonically non-increasing with age", () => {
    const samples = [0, 60, 120, 180, 240, 300, 360, 420, 480, 600];
    const values = samples.map(replyTimingFactor);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it("is zero at and after the dead window", () => {
    expect(replyTimingFactor(REPLY_WINDOW_DEAD_MINUTES)).toBe(0);
    expect(replyTimingFactor(REPLY_WINDOW_DEAD_MINUTES + 120)).toBe(0);
  });
});

describe("isOpportunityExpired", () => {
  const postedAt = 1_000_000_000_000;

  it("is false inside the dead window", () => {
    const nowMs = postedAt + (REPLY_WINDOW_DEAD_MINUTES - 1) * 60 * 1000;
    expect(isOpportunityExpired(postedAt, nowMs)).toBe(false);
  });

  it("is true exactly at the dead window boundary", () => {
    const nowMs = postedAt + REPLY_WINDOW_DEAD_MINUTES * 60 * 1000;
    expect(isOpportunityExpired(postedAt, nowMs)).toBe(true);
  });

  it("is true well past the dead window", () => {
    const nowMs = postedAt + (REPLY_WINDOW_DEAD_MINUTES + 60) * 60 * 1000;
    expect(isOpportunityExpired(postedAt, nowMs)).toBe(true);
  });
});

describe("effectiveDisplayScore", () => {
  const postedAt = 1_000_000_000_000;

  it("returns the stored score unchanged inside the full window", () => {
    const nowMs = postedAt + 10 * 60 * 1000;
    expect(effectiveDisplayScore(80, postedAt, nowMs)).toBe(80);
  });

  it("drops toward zero as the window closes", () => {
    const midpoint =
      postedAt +
      (REPLY_WINDOW_FULL_MINUTES +
        (REPLY_WINDOW_DEAD_MINUTES - REPLY_WINDOW_FULL_MINUTES) / 2) *
        60 *
        1000;
    expect(effectiveDisplayScore(80, postedAt, midpoint)).toBe(40);
  });

  it("is zero once expired", () => {
    const nowMs = postedAt + REPLY_WINDOW_DEAD_MINUTES * 60 * 1000;
    expect(effectiveDisplayScore(80, postedAt, nowMs)).toBe(0);
  });
});

describe("freshnessLabel", () => {
  const postedAt = 1_000_000_000_000;

  it("is null while inside the full window", () => {
    const nowMs = postedAt + 30 * 60 * 1000;
    expect(freshnessLabel(postedAt, nowMs)).toBeNull();
  });

  it("says the window is closing between full and dead", () => {
    const nowMs = postedAt + 200 * 60 * 1000;
    expect(freshnessLabel(postedAt, nowMs)).toBe("Window closing");
  });

  it("says the window is closed at and after the dead window", () => {
    const nowMs = postedAt + REPLY_WINDOW_DEAD_MINUTES * 60 * 1000;
    expect(freshnessLabel(postedAt, nowMs)).toBe("Window closed");
  });
});
