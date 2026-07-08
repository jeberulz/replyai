import { describe, expect, it } from "vitest";
import {
  bucketObservedEdit,
  countObservedEditBuckets,
  measureObservedEdit,
} from "../shared/editDistance";

describe("measureObservedEdit", () => {
  it("treats an exact match as no edit", () => {
    expect(measureObservedEdit("Hello world", "Hello world")).toEqual({
      normalizedEditDistance: 0,
      bucket: "no_edit",
    });
  });

  it("keeps typo-level changes in the minor bucket", () => {
    expect(measureObservedEdit("Ship it today", "Ship it todays")).toEqual({
      normalizedEditDistance: 0.0714,
      bucket: "minor_edit",
    });
  });

  it("classifies substantial rewrites as major edits", () => {
    const result = measureObservedEdit(
      "I agree with this take because distribution matters.",
      "Hot take but distribution is the moat."
    );

    expect(result.normalizedEditDistance).toBeGreaterThanOrEqual(0.15);
    expect(result.bucket).toBe("major_edit");
  });
});

describe("bucketObservedEdit", () => {
  it("uses the documented thresholds", () => {
    expect(bucketObservedEdit(0.0199)).toBe("no_edit");
    expect(bucketObservedEdit(0.02)).toBe("minor_edit");
    expect(bucketObservedEdit(0.1499)).toBe("minor_edit");
    expect(bucketObservedEdit(0.15)).toBe("major_edit");
  });
});

describe("countObservedEditBuckets", () => {
  it("computes launch-baseline counts and the north-star rate", () => {
    expect(
      countObservedEditBuckets([
        "no_edit",
        "minor_edit",
        "major_edit",
        "minor_edit",
        null,
        undefined,
      ])
    ).toEqual({
      no_edit: 1,
      minor_edit: 2,
      major_edit: 1,
      total: 4,
      noOrMinorRate: 75,
    });
  });

  it("returns null rate when there is no observed data", () => {
    expect(countObservedEditBuckets([]).noOrMinorRate).toBeNull();
  });
});
