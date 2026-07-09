import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  DEFAULT_QUIET_DAYS,
  MAX_REPLACEMENT_SUGGESTIONS,
  QUIET_REASON,
  REPLACEMENT_REASON_PREFIX,
  curatorMonthKey,
  demoCuratorArtifact,
  isProfileQuiet,
  replacementReason,
} from "../shared/researchCurator";

const NOW = Date.UTC(2026, 6, 9); // 2026-07-09

describe("isProfileQuiet", () => {
  it("flags profiles untouched past the quiet window", () => {
    const stale = { discoveredAt: NOW - (DEFAULT_QUIET_DAYS + 1) * DAY_MS };
    expect(isProfileQuiet(stale, NOW)).toBe(true);
  });

  it("keeps profiles refreshed within the window", () => {
    const fresh = { discoveredAt: NOW - 5 * DAY_MS, exampleTweets: [{}] };
    expect(isProfileQuiet(fresh, NOW)).toBe(false);
  });

  it("treats the exact boundary as not-yet-quiet", () => {
    const boundary = { discoveredAt: NOW - DEFAULT_QUIET_DAYS * DAY_MS };
    expect(isProfileQuiet(boundary, NOW)).toBe(false);
  });

  it("honors a custom quietDays threshold", () => {
    const p = { discoveredAt: NOW - 8 * DAY_MS };
    expect(isProfileQuiet(p, NOW, 7)).toBe(true);
    expect(isProfileQuiet(p, NOW, 14)).toBe(false);
  });
});

describe("curatorMonthKey", () => {
  it("formats a UTC YYYY-MM key", () => {
    expect(curatorMonthKey(NOW)).toBe("2026-07");
    expect(curatorMonthKey(Date.UTC(2024, 0, 1))).toBe("2024-01");
    expect(curatorMonthKey(Date.UTC(2024, 11, 31))).toBe("2024-12");
  });

  it("uses UTC, not local time, at month edges", () => {
    // 2026-01-31T23:30:00Z stays in January regardless of local offset.
    expect(curatorMonthKey(Date.UTC(2026, 0, 31, 23, 30))).toBe("2026-01");
  });
});

describe("replacementReason", () => {
  it("prefixes a plain reason once", () => {
    const r = replacementReason("Ships fast, replies stay open.");
    expect(r.startsWith(REPLACEMENT_REASON_PREFIX)).toBe(true);
    expect(replacementReason(r)).toBe(r); // idempotent
  });
});

describe("demoCuratorArtifact", () => {
  it("returns deterministic prefixed candidates and a summary", () => {
    const { candidates, artifact } = demoCuratorArtifact(NOW, 2);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(MAX_REPLACEMENT_SUGGESTIONS);
    for (const c of candidates) {
      expect(c.reason.startsWith(REPLACEMENT_REASON_PREFIX)).toBe(true);
    }
    expect(artifact.month).toBe("2026-07");
    expect(artifact.quietPrunedCount).toBe(2);
    expect(artifact.newSuggestionCount).toBe(candidates.length);
    expect(artifact.demo).toBe(true);
    expect(artifact.suggestions).toHaveLength(candidates.length);
  });

  it("is stable across calls (deterministic)", () => {
    expect(demoCuratorArtifact(NOW, 1)).toEqual(demoCuratorArtifact(NOW, 1));
  });
});

describe("constants", () => {
  it("exposes the quiet reason string used on passed rows", () => {
    expect(QUIET_REASON).toBe("quiet_30d");
  });
});
