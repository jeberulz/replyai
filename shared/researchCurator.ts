/**
 * Continuous research curator (WP33) — pure helpers shared by the Convex
 * curator action and its tests. No Convex imports so the logic stays unit
 * testable and deterministic in demo mode.
 *
 * The curator runs monthly per eligible user: it prunes quiet suggested
 * profiles and surfaces replacement candidates. A human still approves every
 * watch change — nothing here writes to `watchedHandles`.
 */

import { demoResearchProfiles } from "./demoData";

export const DAY_MS = 86_400_000;

/** Default staleness window: a suggested profile untouched for 30d is quiet. */
export const DEFAULT_QUIET_DAYS = 30;

/** Internal reason string stored on `researchProfiles.passedReason`. */
export const QUIET_REASON = "quiet_30d";

/** Max replacement candidates surfaced per curator run. */
export const MAX_REPLACEMENT_SUGGESTIONS = 5;

/** Prefix applied to a candidate's reason so the UI reads it as a swap. */
export const REPLACEMENT_REASON_PREFIX = "Suggested replacement — ";

/** Minimal shape the quiet check needs — a stored `researchProfiles` row. */
export type CuratorProfileSignal = {
  /** Last time discovery refreshed this row (ms epoch). */
  discoveredAt: number;
  /** Sample posts captured for the profile; empty means no live signal. */
  exampleTweets?: unknown[];
};

/**
 * A suggested profile is "quiet" when discovery has not refreshed it within
 * `quietDays`. A row that never captured example posts is treated as quiet the
 * moment it ages past the window (its last signal is only `discoveredAt`).
 */
export function isProfileQuiet(
  profile: CuratorProfileSignal,
  nowMs: number,
  quietDays: number = DEFAULT_QUIET_DAYS
): boolean {
  const quietMs = Math.max(0, quietDays) * DAY_MS;
  return nowMs - profile.discoveredAt > quietMs;
}

/** UTC calendar-month key, e.g. 1704067200000 -> "2024-01". */
export function curatorMonthKey(nowMs: number): string {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Wrap a plain "why follow" reason so it reads as a replacement suggestion. */
export function replacementReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.startsWith(REPLACEMENT_REASON_PREFIX)) return trimmed;
  return `${REPLACEMENT_REASON_PREFIX}${trimmed}`;
}

export type CuratorCandidate = {
  handle: string;
  displayName: string;
  bio?: string;
  xUserId?: string;
  followers: number;
  avgLikes: number;
  postFrequency?: string;
  topicTags: string[];
  score: number;
  reason: string;
  exampleTweets: { tweetId: string; text: string; likes: number }[];
};

/** Deterministic summary of a curator run for UI + tests. */
export type CuratorArtifact = {
  month: string;
  quietPrunedCount: number;
  newSuggestionCount: number;
  suggestions: { handle: string; reason: string }[];
  demo: boolean;
};

/**
 * Deterministic demo curator output — used when X/Anthropic keys are missing.
 * Returns the top replacement candidates (reasons prefixed) plus a summary
 * artifact so the run looks identical to a real one in demo mode.
 */
export function demoCuratorArtifact(
  nowMs: number,
  quietPrunedCount = 0
): { candidates: CuratorCandidate[]; artifact: CuratorArtifact } {
  const candidates: CuratorCandidate[] = demoResearchProfiles("monthly curator")
    .slice(0, MAX_REPLACEMENT_SUGGESTIONS)
    .map((p) => ({
      handle: p.handle,
      displayName: p.displayName,
      bio: p.bio,
      followers: p.followers,
      avgLikes: p.avgLikes,
      postFrequency: p.postFrequency,
      topicTags: p.topicTags,
      score: p.score,
      reason: replacementReason(p.reason),
      exampleTweets: p.exampleTweets,
    }));

  const month = curatorMonthKey(nowMs);
  const artifact: CuratorArtifact = {
    month,
    quietPrunedCount,
    newSuggestionCount: candidates.length,
    suggestions: candidates.map((c) => ({ handle: c.handle, reason: c.reason })),
    demo: true,
  };

  return { candidates, artifact };
}
