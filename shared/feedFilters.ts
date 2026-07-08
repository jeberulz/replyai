/**
 * Pre-score filters and ranking helpers for the feed scanner.
 * Shared by Convex scanner actions and unit tests.
 */

import type { OpportunitySource } from "./scoring";

export const SATURATED_REPLY_THRESHOLD = 150;
export const DISMISSED_AUTHOR_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_TWEETS_PER_AUTHOR = 2;
export const SURFACE_LIMIT = 12;
/** UI filter: opportunities posted within the last hour. */
export const FRESH_AGE_MS = 60 * 60 * 1000;
/** UI filter: engagement velocity per hour. */
export const HIGH_VELOCITY_THRESHOLD = 30;

export type DismissedAuthor = { handle: string; until: number };

export type CandidateTweet = {
  tweetId: string;
  authorHandle: string;
  text: string;
  replies: number;
  source?: OpportunitySource;
  isReply?: boolean;
};

export type FeedFilterContext = {
  repliedTweetIds: Set<string>;
  dismissedAuthors: DismissedAuthor[];
  now?: number;
};

export function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

export function isRetweetText(text: string): boolean {
  return /^RT @\w+:/i.test(text.trim());
}

export function isAuthorInCooldown(
  handle: string,
  dismissedAuthors: DismissedAuthor[],
  now = Date.now()
): boolean {
  const normalized = normalizeHandle(handle);
  return dismissedAuthors.some(
    (a) => normalizeHandle(a.handle) === normalized && a.until > now
  );
}

export function pruneExpiredDismissedAuthors(
  dismissedAuthors: DismissedAuthor[],
  now = Date.now()
): DismissedAuthor[] {
  return dismissedAuthors.filter((a) => a.until > now);
}

export function applySaturatedThreadPenalty(
  score: number,
  replyCount: number,
  source?: OpportunitySource
): number {
  if (source === "watched") return score;
  if (replyCount > SATURATED_REPLY_THRESHOLD) {
    return Math.round(score * 0.85);
  }
  return score;
}

/** Keep top-scored items with at most `maxPerAuthor` tweets per author. */
export function limitPerAuthor<T extends { authorHandle: string; score: number }>(
  items: T[],
  maxPerAuthor = MAX_TWEETS_PER_AUTHOR,
  limit = SURFACE_LIMIT
): T[] {
  const counts = new Map<string, number>();
  const result: T[] = [];
  for (const item of items) {
    const handle = normalizeHandle(item.authorHandle);
    const count = counts.get(handle) ?? 0;
    if (count >= maxPerAuthor) continue;
    result.push(item);
    counts.set(handle, count + 1);
    if (result.length >= limit) break;
  }
  return result;
}

export function shouldExcludeCandidate(
  tweet: CandidateTweet,
  ctx: FeedFilterContext
): boolean {
  const now = ctx.now ?? Date.now();
  if (ctx.repliedTweetIds.has(tweet.tweetId)) return true;
  if (isAuthorInCooldown(tweet.authorHandle, ctx.dismissedAuthors, now)) {
    return true;
  }
  if (tweet.isReply) return true;
  if (isRetweetText(tweet.text)) return true;
  return false;
}
