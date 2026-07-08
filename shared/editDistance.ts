export type ObservedEditBucket = "no_edit" | "minor_edit" | "major_edit";

export type ObservedEditMetrics = {
  normalizedEditDistance: number;
  bucket: ObservedEditBucket;
};

const NO_EDIT_MAX = 0.02;
const MINOR_EDIT_MAX = 0.15;

export function measureObservedEdit(
  baselineText: string,
  finalText: string
): ObservedEditMetrics {
  const baseline = baselineText.trim();
  const final = finalText.trim();
  const scale = Math.max(baseline.length, final.length, 1);
  const normalizedEditDistance = round4(
    levenshteinDistance(baseline, final) / scale
  );

  return {
    normalizedEditDistance,
    bucket: bucketObservedEdit(normalizedEditDistance),
  };
}

export function bucketObservedEdit(
  normalizedEditDistance: number
): ObservedEditBucket {
  if (normalizedEditDistance < NO_EDIT_MAX) return "no_edit";
  if (normalizedEditDistance < MINOR_EDIT_MAX) return "minor_edit";
  return "major_edit";
}

export function countObservedEditBuckets(
  buckets: Array<ObservedEditBucket | null | undefined>
) {
  const counts = {
    no_edit: 0,
    minor_edit: 0,
    major_edit: 0,
  };

  for (const bucket of buckets) {
    if (!bucket) continue;
    counts[bucket]++;
  }

  const total = counts.no_edit + counts.minor_edit + counts.major_edit;

  return {
    ...counts,
    total,
    noOrMinorRate:
      total === 0
        ? null
        : Math.round(((counts.no_edit + counts.minor_edit) / total) * 100),
  };
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }

  return previous[b.length];
}
