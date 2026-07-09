/**
 * WP14 — A/B reply variant comparison (observed counts only).
 * Never invent predictions or fake engagement scores.
 */

export const VARIANT_LABELS = ["A", "B", "C"] as const;
export type VariantLabel = (typeof VARIANT_LABELS)[number];

export const MAX_VARIANTS_PER_GROUP = VARIANT_LABELS.length;

/** Default observation window for copy (matches stories default). */
export const VARIANT_COMPARE_WINDOW_HOURS = 48;

export type VariantTrackerStatus =
  | "active"
  | "responded"
  | "expired"
  | "failed";

export type VariantEditBucket = "no_edit" | "minor_edit" | "major_edit";

export type VariantDraftInput = {
  id: string;
  variantLabel: VariantLabel;
  status: "draft" | "scheduled" | "published" | "failed";
  publishedAt?: number;
  editBucket?: VariantEditBucket | null;
};

export type VariantTrackerInput = {
  draftId: string;
  status: VariantTrackerStatus;
};

export type VariantObservedStats = {
  label: VariantLabel;
  draftCount: number;
  publishedCount: number;
  respondedCount: number;
  /** Published drafts whose outcome window closed without a response. */
  expiredCount: number;
  /** no_edit + minor_edit among published drafts with an edit bucket. */
  noOrMinorEditCount: number;
  editBucketKnownCount: number;
};

export type VariantGroupComparison = {
  variants: VariantObservedStats[];
  windowHours: number;
  /** True when at least one variant has a published draft. */
  hasPublished: boolean;
};

export function isVariantLabel(value: string): value is VariantLabel {
  return (VARIANT_LABELS as readonly string[]).includes(value);
}

/** Next free label in A→B→C order, or null if the group is full. */
export function nextVariantLabel(
  used: ReadonlyArray<VariantLabel | string>
): VariantLabel | null {
  const taken = new Set(
    used.filter((label): label is VariantLabel => isVariantLabel(label))
  );
  for (const label of VARIANT_LABELS) {
    if (!taken.has(label)) return label;
  }
  return null;
}

export function emptyVariantStats(label: VariantLabel): VariantObservedStats {
  return {
    label,
    draftCount: 0,
    publishedCount: 0,
    respondedCount: 0,
    expiredCount: 0,
    noOrMinorEditCount: 0,
    editBucketKnownCount: 0,
  };
}

/**
 * Aggregate observed publish / response / edit-bucket counts per variant label.
 * Only counts real tracker rows — never invents rates or predictions.
 */
export function aggregateVariantComparison(args: {
  drafts: VariantDraftInput[];
  trackers: VariantTrackerInput[];
  windowHours?: number;
}): VariantGroupComparison {
  const windowHours = args.windowHours ?? VARIANT_COMPARE_WINDOW_HOURS;
  const byLabel = new Map<VariantLabel, VariantObservedStats>();

  for (const label of VARIANT_LABELS) {
    byLabel.set(label, emptyVariantStats(label));
  }

  const trackersByDraft = new Map<string, VariantTrackerInput[]>();
  for (const tracker of args.trackers) {
    const list = trackersByDraft.get(tracker.draftId) ?? [];
    list.push(tracker);
    trackersByDraft.set(tracker.draftId, list);
  }

  for (const draft of args.drafts) {
    if (!isVariantLabel(draft.variantLabel)) continue;
    const stats = byLabel.get(draft.variantLabel)!;
    stats.draftCount += 1;

    if (draft.status === "published") {
      stats.publishedCount += 1;
      if (draft.editBucket) {
        stats.editBucketKnownCount += 1;
        if (
          draft.editBucket === "no_edit" ||
          draft.editBucket === "minor_edit"
        ) {
          stats.noOrMinorEditCount += 1;
        }
      }

      const draftTrackers = trackersByDraft.get(draft.id) ?? [];
      for (const tracker of draftTrackers) {
        if (tracker.status === "responded") stats.respondedCount += 1;
        if (tracker.status === "expired") stats.expiredCount += 1;
      }
    }
  }

  const variants = VARIANT_LABELS.map((label) => byLabel.get(label)!).filter(
    (stats) => stats.draftCount > 0
  );

  return {
    variants,
    windowHours,
    hasPublished: variants.some((v) => v.publishedCount > 0),
  };
}

/**
 * Human copy for observed counts only — never "will perform" / predicted winners.
 * Example: "Variant A got 2 responses; variant B got 0 (48h window)"
 */
export function formatVariantComparisonCopy(
  comparison: VariantGroupComparison
): string {
  if (comparison.variants.length === 0) {
    return "No variants tracked yet.";
  }

  const parts = comparison.variants.map((v) => {
    const name = `Variant ${v.label}`;
    if (v.publishedCount === 0) {
      return `${name} not published yet`;
    }
    const responseWord = v.respondedCount === 1 ? "response" : "responses";
    return `${name} got ${v.respondedCount} ${responseWord}`;
  });

  return `${parts.join("; ")} (${comparison.windowHours}h window)`;
}

/** Deterministic demo fixture for UI / tests — fixed observed counts. */
export function demoVariantComparison(): VariantGroupComparison {
  return {
    windowHours: VARIANT_COMPARE_WINDOW_HOURS,
    hasPublished: true,
    variants: [
      {
        label: "A",
        draftCount: 1,
        publishedCount: 1,
        respondedCount: 2,
        expiredCount: 0,
        noOrMinorEditCount: 1,
        editBucketKnownCount: 1,
      },
      {
        label: "B",
        draftCount: 1,
        publishedCount: 1,
        respondedCount: 0,
        expiredCount: 1,
        noOrMinorEditCount: 1,
        editBucketKnownCount: 1,
      },
    ],
  };
}
