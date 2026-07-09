/**
 * Engagement-window prediction from observed reply-back outcomes (WP35).
 *
 * Numbers are medians of measured delays only — never fake ML percentages.
 * Below MIN_SAMPLE_SIZE we refuse a prediction and return honest sparse copy.
 */

export const MIN_ENGAGEMENT_WINDOW_SAMPLE = 5;
/** Round displayed minutes to this step (5–15 min band). */
export const ENGAGEMENT_WINDOW_ROUND_MINUTES = 10;
export const ENGAGEMENT_WINDOW_SCAN_LIMIT = 400;
export const ENGAGEMENT_WINDOW_MAX_BUCKETS = 6;

export type AuthorSizeBand = "micro" | "small" | "medium" | "large";

export type EngagementWindowObservation = {
  /** Original target post timestamp (ms). Required for post-relative peak. */
  originalPostedAt?: number | null;
  /** When the user published their reply (ms). */
  publishedAt: number;
  /** When a response was observed (ms). Only responded rows contribute to curves. */
  respondedAt?: number | null;
  authorFollowers?: number | null;
  /** Optional niche/topic tag (analysis.topic or similar). */
  topicTag?: string | null;
};

export type EngagementWindowBucketKey = {
  authorBand: AuthorSizeBand;
  topicTag: string | null;
};

export type EngagementWindowCurve = {
  authorBand: AuthorSizeBand;
  authorBandLabel: string;
  topicTag: string | null;
  sampleSize: number;
  /** Median minutes from original post → response (rounded). Null if sparse. */
  medianPeakMinutes: number | null;
  minPeakMinutes: number | null;
  maxPeakMinutes: number | null;
  /** Median minutes from reply publish → response (rounded). */
  medianReplyBackMinutes: number | null;
  hasEnoughData: boolean;
};

export type EngagementWindowGuidance = {
  curve: EngagementWindowCurve;
  /** Remaining minutes until median peak, given post age. Null if sparse/expired. */
  closesInMinutes: number | null;
  headline: string;
  detail: string;
};

export type EngagementWindowSnapshot = {
  minSampleSize: number;
  scanLimit: number;
  totalResponded: number;
  buckets: EngagementWindowCurve[];
  /** Best-backed bucket for a quick card (largest sample, then tightest peak). */
  primary: EngagementWindowCurve | null;
  isDemo: boolean;
};

const AUTHOR_BAND_LABELS: Record<AuthorSizeBand, string> = {
  micro: "<1k followers",
  small: "1k–10k followers",
  medium: "10k–100k followers",
  large: "100k+ followers",
};

export function authorSizeBand(followers: number | null | undefined): AuthorSizeBand {
  const n = Math.max(0, Math.floor(followers ?? 0));
  if (n < 1_000) return "micro";
  if (n < 10_000) return "small";
  if (n < 100_000) return "medium";
  return "large";
}

export function authorSizeBandLabel(band: AuthorSizeBand): string {
  return AUTHOR_BAND_LABELS[band];
}

export function normalizeTopicTag(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  // Keep tags short for bucketing; drop ultra-long freeform summaries.
  if (normalized.length > 48) return normalized.slice(0, 48).trim();
  return normalized;
}

/** Round minutes to ENGAGEMENT_WINDOW_ROUND_MINUTES; never invent sub-step precision. */
export function roundEngagementMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) return 0;
  const step = ENGAGEMENT_WINDOW_ROUND_MINUTES;
  return Math.max(step, Math.round(minutes / step) * step);
}

export function formatEngagementMinutes(minutes: number): string {
  const rounded = roundEngagementMinutes(minutes);
  if (rounded < 60) return `~${rounded} min`;
  const hours = Math.round(rounded / 60);
  if (hours === 1) return "~1 hr";
  if (rounded % 60 === 0) return `~${hours} hr`;
  return `~${rounded} min`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function peakMinutesFromObservation(
  row: EngagementWindowObservation
): number | null {
  if (row.respondedAt == null) return null;
  if (row.originalPostedAt != null && row.originalPostedAt > 0) {
    const ms = row.respondedAt - row.originalPostedAt;
    if (ms < 0) return null;
    return ms / 60_000;
  }
  // Fallback: reply→response lag when original post time is unknown.
  const ms = row.respondedAt - row.publishedAt;
  if (ms < 0) return null;
  return ms / 60_000;
}

function replyBackMinutesFromObservation(
  row: EngagementWindowObservation
): number | null {
  if (row.respondedAt == null) return null;
  const ms = row.respondedAt - row.publishedAt;
  if (ms < 0) return null;
  return ms / 60_000;
}

function bucketKey(band: AuthorSizeBand, topicTag: string | null): string {
  return `${band}::${topicTag?.toLowerCase() ?? ""}`;
}

export function buildEngagementWindowCurves(args: {
  observations: EngagementWindowObservation[];
  minSampleSize?: number;
  maxBuckets?: number;
}): EngagementWindowCurve[] {
  const minSample = args.minSampleSize ?? MIN_ENGAGEMENT_WINDOW_SAMPLE;
  const maxBuckets = args.maxBuckets ?? ENGAGEMENT_WINDOW_MAX_BUCKETS;

  const groups = new Map<
    string,
    {
      authorBand: AuthorSizeBand;
      topicTag: string | null;
      peaks: number[];
      replyBacks: number[];
    }
  >();

  for (const row of args.observations) {
    if (row.respondedAt == null) continue;
    const peak = peakMinutesFromObservation(row);
    if (peak == null) continue;
    const band = authorSizeBand(row.authorFollowers);
    const topicTag = normalizeTopicTag(row.topicTag);
    const key = bucketKey(band, topicTag);
    const entry = groups.get(key) ?? {
      authorBand: band,
      topicTag,
      peaks: [],
      replyBacks: [],
    };
    entry.peaks.push(peak);
    const replyBack = replyBackMinutesFromObservation(row);
    if (replyBack != null) entry.replyBacks.push(replyBack);
    groups.set(key, entry);
  }

  // Also aggregate band-only (ignore topic) so sparse niches still get a curve.
  const bandOnly = new Map<
    AuthorSizeBand,
    { peaks: number[]; replyBacks: number[] }
  >();
  for (const row of args.observations) {
    if (row.respondedAt == null) continue;
    const peak = peakMinutesFromObservation(row);
    if (peak == null) continue;
    const band = authorSizeBand(row.authorFollowers);
    const entry = bandOnly.get(band) ?? { peaks: [], replyBacks: [] };
    entry.peaks.push(peak);
    const replyBack = replyBackMinutesFromObservation(row);
    if (replyBack != null) entry.replyBacks.push(replyBack);
    bandOnly.set(band, entry);
  }

  const curves: EngagementWindowCurve[] = [];

  for (const entry of groups.values()) {
    curves.push(curveFromSamples(entry, minSample));
  }

  for (const [band, samples] of bandOnly) {
    const key = bucketKey(band, null);
    if (groups.has(key)) continue;
    curves.push(
      curveFromSamples(
        { authorBand: band, topicTag: null, ...samples },
        minSample
      )
    );
  }

  return curves
    .sort(
      (a, b) =>
        Number(b.hasEnoughData) - Number(a.hasEnoughData) ||
        b.sampleSize - a.sampleSize ||
        (a.medianPeakMinutes ?? Number.POSITIVE_INFINITY) -
          (b.medianPeakMinutes ?? Number.POSITIVE_INFINITY) ||
        a.authorBand.localeCompare(b.authorBand)
    )
    .slice(0, maxBuckets);
}

function curveFromSamples(
  entry: {
    authorBand: AuthorSizeBand;
    topicTag: string | null;
    peaks: number[];
    replyBacks: number[];
  },
  minSample: number
): EngagementWindowCurve {
  const sampleSize = entry.peaks.length;
  const hasEnoughData = sampleSize >= minSample;
  const rawMedian = median(entry.peaks);
  const rawMin = sampleSize > 0 ? Math.min(...entry.peaks) : null;
  const rawMax = sampleSize > 0 ? Math.max(...entry.peaks) : null;
  const rawReplyBack = median(entry.replyBacks);

  return {
    authorBand: entry.authorBand,
    authorBandLabel: authorSizeBandLabel(entry.authorBand),
    topicTag: entry.topicTag,
    sampleSize,
    medianPeakMinutes:
      hasEnoughData && rawMedian != null
        ? roundEngagementMinutes(rawMedian)
        : null,
    minPeakMinutes:
      hasEnoughData && rawMin != null ? roundEngagementMinutes(rawMin) : null,
    maxPeakMinutes:
      hasEnoughData && rawMax != null ? roundEngagementMinutes(rawMax) : null,
    medianReplyBackMinutes:
      hasEnoughData && rawReplyBack != null
        ? roundEngagementMinutes(rawReplyBack)
        : null,
    hasEnoughData,
  };
}

export function pickPrimaryEngagementCurve(
  curves: EngagementWindowCurve[]
): EngagementWindowCurve | null {
  return curves.find((c) => c.hasEnoughData) ?? curves[0] ?? null;
}

export function buildEngagementWindowSnapshot(args: {
  observations: EngagementWindowObservation[];
  isDemo?: boolean;
  minSampleSize?: number;
  maxBuckets?: number;
  scanLimit?: number;
}): EngagementWindowSnapshot {
  const buckets = buildEngagementWindowCurves({
    observations: args.observations,
    minSampleSize: args.minSampleSize,
    maxBuckets: args.maxBuckets,
  });
  return {
    minSampleSize: args.minSampleSize ?? MIN_ENGAGEMENT_WINDOW_SAMPLE,
    scanLimit: args.scanLimit ?? ENGAGEMENT_WINDOW_SCAN_LIMIT,
    totalResponded: args.observations.filter((o) => o.respondedAt != null)
      .length,
    buckets,
    primary: pickPrimaryEngagementCurve(buckets),
    isDemo: Boolean(args.isDemo),
  };
}

/**
 * Remaining window for a live opportunity, given observed median peak.
 * Returns null when sparse, unknown age, or already past the median peak.
 */
export function closesInMinutes(args: {
  medianPeakMinutes: number | null;
  originalPostedAt: number;
  nowMs: number;
}): number | null {
  if (args.medianPeakMinutes == null) return null;
  const ageMinutes = (args.nowMs - args.originalPostedAt) / 60_000;
  if (!Number.isFinite(ageMinutes) || ageMinutes < 0) return null;
  const remaining = args.medianPeakMinutes - ageMinutes;
  if (remaining <= 0) return null;
  return roundEngagementMinutes(remaining);
}

export function formatEngagementWindowGuidance(args: {
  curve: EngagementWindowCurve;
  originalPostedAt?: number | null;
  nowMs?: number;
}): EngagementWindowGuidance {
  const { curve } = args;
  const closes =
    curve.medianPeakMinutes != null &&
    args.originalPostedAt != null &&
    args.nowMs != null
      ? closesInMinutes({
          medianPeakMinutes: curve.medianPeakMinutes,
          originalPostedAt: args.originalPostedAt,
          nowMs: args.nowMs,
        })
      : null;

  if (!curve.hasEnoughData || curve.medianPeakMinutes == null) {
    return {
      curve,
      closesInMinutes: null,
      headline: "Not enough data yet",
      detail: `Need at least ${MIN_ENGAGEMENT_WINDOW_SAMPLE} reply-backs in this author band before showing a timing window. Observed so far: ${curve.sampleSize}.`,
    };
  }

  const bandBit = curve.topicTag
    ? `${curve.authorBandLabel} · ${curve.topicTag}`
    : curve.authorBandLabel;
  const peakLabel = formatEngagementMinutes(curve.medianPeakMinutes);

  if (closes != null) {
    return {
      curve,
      closesInMinutes: closes,
      headline: `Window closes in ${formatEngagementMinutes(closes)}`,
      detail: `Based on your last ${curve.sampleSize} reply-backs in ${bandBit}, median peak was ${peakLabel} after the post.`,
    };
  }

  return {
    curve,
    closesInMinutes: null,
    headline: `Median peak ~${peakLabel.replace(/^~/, "")} after post`,
    detail: `Based on your last ${curve.sampleSize} reply-backs in ${bandBit}. Observed counts only — not a prediction score.`,
  };
}

/** Deterministic demo curves for zero-key / demo accounts. */
export function demoEngagementWindowObservations(): EngagementWindowObservation[] {
  const base = Date.parse("2026-07-01T12:00:00.000Z");
  const rows: EngagementWindowObservation[] = [];

  // medium / "AI agents" — enough for a ~40 min median peak (odd n → middle)
  const mediumPeaks = [25, 30, 40, 45, 55];
  for (let i = 0; i < mediumPeaks.length; i++) {
    const posted = base + i * 86_400_000;
    const peakMin = mediumPeaks[i]!;
    rows.push({
      originalPostedAt: posted,
      publishedAt: posted + 10 * 60_000,
      respondedAt: posted + peakMin * 60_000,
      authorFollowers: 25_000,
      topicTag: "AI agents",
    });
  }

  // small band — sparse (n=2)
  rows.push(
    {
      originalPostedAt: base,
      publishedAt: base + 5 * 60_000,
      respondedAt: base + 90 * 60_000,
      authorFollowers: 3_500,
      topicTag: "distribution",
    },
    {
      originalPostedAt: base + 86_400_000,
      publishedAt: base + 86_400_000 + 8 * 60_000,
      respondedAt: base + 86_400_000 + 120 * 60_000,
      authorFollowers: 4_200,
      topicTag: "distribution",
    }
  );

  return rows;
}

export function demoEngagementWindowSnapshot(): EngagementWindowSnapshot {
  return buildEngagementWindowSnapshot({
    observations: demoEngagementWindowObservations(),
    isDemo: true,
  });
}
