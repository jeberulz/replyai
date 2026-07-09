import { describe, expect, it } from "vitest";
import {
  aggregateVariantComparison,
  demoVariantComparison,
  formatVariantComparisonCopy,
  MAX_VARIANTS_PER_GROUP,
  nextVariantLabel,
  VARIANT_COMPARE_WINDOW_HOURS,
} from "../shared/variantCompare";

describe("nextVariantLabel", () => {
  it("assigns A then B then C", () => {
    expect(nextVariantLabel([])).toBe("A");
    expect(nextVariantLabel(["A"])).toBe("B");
    expect(nextVariantLabel(["A", "B"])).toBe("C");
  });

  it("returns null when the group is full (max 3)", () => {
    expect(nextVariantLabel(["A", "B", "C"])).toBeNull();
    expect(MAX_VARIANTS_PER_GROUP).toBe(3);
  });

  it("fills gaps when a middle label is free", () => {
    expect(nextVariantLabel(["A", "C"])).toBe("B");
  });
});

describe("aggregateVariantComparison", () => {
  it("aggregates published, responded, and edit-bucket counts per label", () => {
    const comparison = aggregateVariantComparison({
      drafts: [
        {
          id: "d1",
          variantLabel: "A",
          status: "published",
          editBucket: "no_edit",
        },
        {
          id: "d2",
          variantLabel: "B",
          status: "published",
          editBucket: "major_edit",
        },
        {
          id: "d3",
          variantLabel: "B",
          status: "draft",
        },
      ],
      trackers: [
        { draftId: "d1", status: "responded" },
        { draftId: "d1", status: "responded" },
        { draftId: "d2", status: "expired" },
      ],
    });

    expect(comparison.windowHours).toBe(VARIANT_COMPARE_WINDOW_HOURS);
    expect(comparison.hasPublished).toBe(true);
    expect(comparison.variants).toHaveLength(2);

    const a = comparison.variants.find((v) => v.label === "A")!;
    expect(a).toMatchObject({
      publishedCount: 1,
      respondedCount: 2,
      expiredCount: 0,
      noOrMinorEditCount: 1,
      editBucketKnownCount: 1,
    });

    const b = comparison.variants.find((v) => v.label === "B")!;
    expect(b).toMatchObject({
      draftCount: 2,
      publishedCount: 1,
      respondedCount: 0,
      expiredCount: 1,
      noOrMinorEditCount: 0,
      editBucketKnownCount: 1,
    });
  });

  it("ignores trackers for unpublished drafts", () => {
    const comparison = aggregateVariantComparison({
      drafts: [
        {
          id: "d1",
          variantLabel: "A",
          status: "draft",
        },
      ],
      trackers: [{ draftId: "d1", status: "responded" }],
    });
    expect(comparison.variants[0]).toMatchObject({
      publishedCount: 0,
      respondedCount: 0,
    });
  });
});

describe("formatVariantComparisonCopy", () => {
  it("reports observed counts only — no predictions", () => {
    const copy = formatVariantComparisonCopy(demoVariantComparison());
    expect(copy).toBe(
      "Variant A got 2 responses; Variant B got 0 responses (48h window)"
    );
    expect(copy.toLowerCase()).not.toMatch(/will|predict|likely|%|score/);
  });

  it("notes unpublished variants without inventing outcomes", () => {
    const copy = formatVariantComparisonCopy({
      windowHours: 48,
      hasPublished: true,
      variants: [
        {
          label: "A",
          draftCount: 1,
          publishedCount: 1,
          respondedCount: 1,
          expiredCount: 0,
          noOrMinorEditCount: 1,
          editBucketKnownCount: 1,
        },
        {
          label: "B",
          draftCount: 1,
          publishedCount: 0,
          respondedCount: 0,
          expiredCount: 0,
          noOrMinorEditCount: 0,
          editBucketKnownCount: 0,
        },
      ],
    });
    expect(copy).toContain("Variant B not published yet");
  });
});
