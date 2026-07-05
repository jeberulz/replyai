/**
 * Internal ranking feedback from opportunity funnel outcomes.
 * Multipliers are never shown in the UI — they only adjust scan ordering.
 */

import type { OpportunitySource } from "./scoring";

export type OpportunityOutcome =
  | "ignored"
  | "analyzed"
  | "sent"
  | "responded";

export type FollowerBand = "micro" | "small" | "medium" | "large";

export type RankingWeights = {
  updatedAt: number;
  sourceMultipliers: Partial<Record<OpportunitySource, number>>;
  followerBandMultipliers: Partial<Record<FollowerBand, number>>;
  /** Keys "0".."9" for score deciles. */
  scoreDecileMultipliers: Record<string, number>;
};

export type OpportunityFunnelRow = {
  source?: OpportunitySource;
  authorFollowers: number;
  score: number;
  scannedAt: number;
  status: "new" | "dismissed" | "analyzed";
  outcome?: OpportunityOutcome;
};

const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
const MIN_SAMPLE = 3;
const MIN_TOTAL = 8;
const MULT_MIN = 0.85;
const MULT_MAX = 1.15;

const SOURCES: OpportunitySource[] = [
  "following",
  "list",
  "watched",
  "search",
];

const FOLLOWER_BANDS: FollowerBand[] = [
  "micro",
  "small",
  "medium",
  "large",
];

export function followerBand(followers: number): FollowerBand {
  if (followers < 1_000) return "micro";
  if (followers < 10_000) return "small";
  if (followers < 100_000) return "medium";
  return "large";
}

export function scoreDecile(score: number): number {
  return Math.min(9, Math.max(0, Math.floor(score / 10)));
}

export function opportunityWasAnalyzed(row: OpportunityFunnelRow): boolean {
  if (
    row.outcome === "analyzed" ||
    row.outcome === "sent" ||
    row.outcome === "responded"
  ) {
    return true;
  }
  return row.status === "analyzed";
}

function bucketRate(
  rows: OpportunityFunnelRow[],
  match: (row: OpportunityFunnelRow) => boolean
): { rate: number; count: number } {
  const bucket = rows.filter(match);
  if (bucket.length === 0) return { rate: 0, count: 0 };
  const analyzed = bucket.filter(opportunityWasAnalyzed).length;
  return { rate: analyzed / bucket.length, count: bucket.length };
}

function multiplierFromRate(
  bucketRate: number,
  baselineRate: number,
  count: number
): number | undefined {
  if (count < MIN_SAMPLE) return undefined;
  const delta = bucketRate - baselineRate;
  const mult = 1 + delta * 0.75;
  return Math.round(Math.min(MULT_MAX, Math.max(MULT_MIN, mult)) * 1000) / 1000;
}

/** Compute per-user ranking weights from recent opportunity funnel data. */
export function computeRankingWeights(
  rows: OpportunityFunnelRow[],
  now: number
): RankingWeights | null {
  const recent = rows.filter((r) => r.scannedAt >= now - LOOKBACK_MS);
  if (recent.length < MIN_TOTAL) return null;

  const overall = bucketRate(recent, () => true);
  if (overall.count < MIN_TOTAL || overall.rate === 0) return null;
  const baseline = overall.rate;

  const sourceMultipliers: Partial<Record<OpportunitySource, number>> = {};
  for (const source of SOURCES) {
    const { rate, count } = bucketRate(recent, (r) => r.source === source);
    const mult = multiplierFromRate(rate, baseline, count);
    if (mult !== undefined) sourceMultipliers[source] = mult;
  }

  const followerBandMultipliers: Partial<Record<FollowerBand, number>> = {};
  for (const band of FOLLOWER_BANDS) {
    const { rate, count } = bucketRate(
      recent,
      (r) => followerBand(r.authorFollowers) === band
    );
    const mult = multiplierFromRate(rate, baseline, count);
    if (mult !== undefined) followerBandMultipliers[band] = mult;
  }

  const scoreDecileMultipliers: Record<string, number> = {};
  for (let d = 0; d <= 9; d++) {
    const { rate, count } = bucketRate(
      recent,
      (r) => scoreDecile(r.score) === d
    );
    const mult = multiplierFromRate(rate, baseline, count);
    if (mult !== undefined) scoreDecileMultipliers[String(d)] = mult;
  }

  return {
    updatedAt: now,
    sourceMultipliers,
    followerBandMultipliers,
    scoreDecileMultipliers,
  };
}

/** Normalize DB-stored weights for scoring helpers. */
export function normalizeRankingWeights(
  weights: {
    updatedAt: number;
    sourceMultipliers?: Partial<Record<OpportunitySource, number>>;
    followerBandMultipliers?: Partial<Record<FollowerBand, number>>;
    scoreDecileMultipliers?: Record<string, number>;
  } | null
): RankingWeights | null {
  if (!weights) return null;
  return {
    updatedAt: weights.updatedAt,
    sourceMultipliers: weights.sourceMultipliers ?? {},
    followerBandMultipliers: weights.followerBandMultipliers ?? {},
    scoreDecileMultipliers: weights.scoreDecileMultipliers ?? {},
  };
}

/** Apply learned multipliers to a heuristic score (internal only). */
export function applyRankingMultiplier(
  baseScore: number,
  input: {
    source?: OpportunitySource;
    authorFollowers: number;
  },
  weights?: RankingWeights | null
): number {
  if (!weights) return baseScore;

  let mult = 1;
  if (input.source && weights.sourceMultipliers[input.source]) {
    mult *= weights.sourceMultipliers[input.source]!;
  }
  const band = followerBand(input.authorFollowers);
  if (weights.followerBandMultipliers[band]) {
    mult *= weights.followerBandMultipliers[band]!;
  }
  const decile = String(scoreDecile(baseScore));
  if (weights.scoreDecileMultipliers[decile]) {
    mult *= weights.scoreDecileMultipliers[decile]!;
  }

  return Math.round(Math.min(100, Math.max(0, baseScore * mult)));
}

export function opportunityToAnalyzeRate(
  rows: OpportunityFunnelRow[]
): number | null {
  if (rows.length === 0) return null;
  const analyzed = rows.filter(opportunityWasAnalyzed).length;
  return Math.round((analyzed / rows.length) * 100);
}
