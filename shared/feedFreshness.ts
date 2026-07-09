/**
 * Feed freshness/decay helpers — shared by the Convex opportunities list
 * query, the auto-archive cron, and the notification enqueue guard.
 *
 * The reply window and its decay curve mirror `shared/scoring.ts`
 * (`replyTiming`): full credit inside 2h, decaying to zero by 8h.
 */

export const REPLY_WINDOW_FULL_MINUTES = 120;
export const REPLY_WINDOW_DEAD_MINUTES = 480;

/** Age in minutes since the tweet was posted. */
export function opportunityAgeMinutes(postedAt: number, nowMs: number): number {
  return Math.max(0, (nowMs - postedAt) / (60 * 1000));
}

/**
 * Same decay curve as `scoreConversation`'s `replyTiming` factor: 1 inside
 * the full window, linearly decaying to 0 by the dead window.
 */
export function replyTimingFactor(ageMinutes: number): number {
  if (ageMinutes <= REPLY_WINDOW_FULL_MINUTES) return 1;
  const decayRange = REPLY_WINDOW_DEAD_MINUTES - REPLY_WINDOW_FULL_MINUTES;
  const decayed = 1 - (ageMinutes - REPLY_WINDOW_FULL_MINUTES) / decayRange;
  return Math.min(1, Math.max(0, decayed));
}

/** True once an opportunity has aged past the dead window. */
export function isOpportunityExpired(postedAt: number, nowMs: number): boolean {
  return opportunityAgeMinutes(postedAt, nowMs) >= REPLY_WINDOW_DEAD_MINUTES;
}

/**
 * Display-time score decay — multiplies the stored heuristic score by the
 * same timing factor used at scoring time, without rewriting stored rows.
 */
export function effectiveDisplayScore(
  storedScore: number,
  postedAt: number,
  nowMs: number
): number {
  const factor = replyTimingFactor(opportunityAgeMinutes(postedAt, nowMs));
  return Math.round(storedScore * factor);
}

/** Short plain-language freshness string, or null when still fully fresh. */
export function freshnessLabel(postedAt: number, nowMs: number): string | null {
  const ageMinutes = opportunityAgeMinutes(postedAt, nowMs);
  if (ageMinutes <= REPLY_WINDOW_FULL_MINUTES) return null;
  if (ageMinutes >= REPLY_WINDOW_DEAD_MINUTES) return "Window closed";
  return "Window closing";
}
