/**
 * Deterministic plain-language ranking changelog sentence (WP32).
 * No LLM, no fake ML percentages — describes multiplier direction only.
 * Single source of truth; briefing (WP12) imports from here.
 */

import type { RankingWeights } from "./rankingWeights";

/** Default window: only describe weights recomputed within the last 7 days. */
export const RANKING_CHANGELOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const SOURCE_LABELS: Record<string, string> = {
  following: "accounts you follow",
  list: "list sources",
  watched: "watched handles",
  search: "keyword search",
};

const BAND_LABELS: Record<string, string> = {
  micro: "micro accounts",
  small: "small accounts",
  medium: "mid-size accounts",
  large: "large accounts",
};

/**
 * One plain-language sentence when ranking weights were recomputed recently.
 * Returns null when there is no data — never invents numbers or ML %.
 */
export function rankingChangelogSentence(
  weights: RankingWeights | null | undefined,
  nowMs: number,
  maxAgeMs: number = RANKING_CHANGELOG_MAX_AGE_MS
): string | null {
  if (!weights?.updatedAt) return null;
  if (nowMs - weights.updatedAt > maxAgeMs) return null;

  const sourceEntries = Object.entries(weights.sourceMultipliers ?? {}).filter(
    ([, mult]) => typeof mult === "number" && mult !== 1
  ) as [string, number][];
  sourceEntries.sort((a, b) => b[1] - a[1]);

  const bandEntries = Object.entries(
    weights.followerBandMultipliers ?? {}
  ).filter(([, mult]) => typeof mult === "number" && mult !== 1) as [
    string,
    number,
  ][];
  bandEntries.sort((a, b) => b[1] - a[1]);

  const topSource = sourceEntries[0];
  const topBand = bandEntries[0];

  if (topSource && topSource[1] > 1) {
    const label = SOURCE_LABELS[topSource[0]] ?? topSource[0];
    if (topBand && topBand[1] > 1) {
      const bandLabel = BAND_LABELS[topBand[0]] ?? topBand[0];
      return `Your feed ranking recently leaned toward ${label} and ${bandLabel} based on what you actually engage with.`;
    }
    return `Your feed ranking recently leaned toward ${label} based on what you actually engage with.`;
  }

  if (topBand && topBand[1] > 1) {
    const bandLabel = BAND_LABELS[topBand[0]] ?? topBand[0];
    return `Your feed ranking recently leaned toward ${bandLabel} based on what you actually engage with.`;
  }

  return "Your opportunity ranking was refreshed recently from your recent reply outcomes.";
}
