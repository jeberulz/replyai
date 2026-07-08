/**
 * Heuristic "worth replying" scoring, shared by the Next.js app (tweet
 * analysis) and Convex scheduled functions (feed scanner).
 *
 * Deliberately not an ML score: per the PRD, we show a 0-100 heuristic with a
 * plain-language reason instead of fake-precision engagement predictions.
 */

import type { GoalId } from "./onboarding";

export type OpportunitySource = "following" | "list" | "watched" | "search";

export type EngagementInput = {
  followers: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  /** Minutes since the tweet was posted. */
  ageMinutes: number;
  /** 0..1 how well the topic matches the user's interests. */
  topicRelevance?: number;
  /** Where this conversation was discovered. Used for internal ranking only. */
  source?: OpportunitySource;
  /** Onboarding goal — shifts factor weights (relevance stays weighted highest). */
  goal?: GoalId;
  /** Optional brand-safety verdict from the semantic classifier. */
  brandSafety?: "safe" | "unsafe";
};

export type ScoreFactors = {
  audienceSize: number;
  topicRelevance: number;
  replyTiming: number;
  growthVelocity: number;
};

export type ConversationScore = {
  value: number;
  reason: string;
  factors: ScoreFactors;
};

type VelocityFollowerBand = "micro" | "small" | "medium" | "large";

const VELOCITY_SATURATION_PER_MINUTE: Record<VelocityFollowerBand, number> = {
  micro: 0.4,
  small: 1.2,
  medium: 4,
  large: 12,
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function velocityFollowerBand(followers: number): VelocityFollowerBand {
  if (followers < 1_000) return "micro";
  if (followers < 10_000) return "small";
  if (followers < 100_000) return "medium";
  return "large";
}

function normalizedGrowthVelocity(input: {
  followers: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  ageMinutes: number;
}): number {
  const engagement =
    input.likes + input.retweets * 2 + input.replies * 3 + input.quotes * 2;
  const perMinute = engagement / Math.max(1, input.ageMinutes);
  const saturation =
    VELOCITY_SATURATION_PER_MINUTE[velocityFollowerBand(input.followers)];
  return clamp01(perMinute / saturation);
}

/**
 * Factor weights per onboarding goal. Every set keeps topicRelevance
 * weighted highest (timing/velocity alone must never surface off-topic
 * tweets), but the goal shifts the rest:
 * - audience: reach and momentum matter more — visibility comes from being
 *   early in threads that are blowing up under big accounts.
 * - leads: topic fit dominates and author size matters least — a perfect-fit
 *   conversation with a 900-follower buyer beats a viral off-topic thread.
 * - authority: topic fit and being early in the conversation — authority is
 *   built by being the reference reply in your niche, not by chasing reach.
 * Weights sum to 1 (tested).
 */
export const SCORE_WEIGHTS: Record<
  GoalId | "default",
  ScoreFactors
> = {
  default: {
    audienceSize: 0.15,
    replyTiming: 0.25,
    growthVelocity: 0.25,
    topicRelevance: 0.35,
  },
  audience: {
    audienceSize: 0.22,
    replyTiming: 0.22,
    growthVelocity: 0.26,
    topicRelevance: 0.3,
  },
  leads: {
    audienceSize: 0.08,
    replyTiming: 0.25,
    growthVelocity: 0.22,
    topicRelevance: 0.45,
  },
  authority: {
    audienceSize: 0.1,
    replyTiming: 0.3,
    growthVelocity: 0.18,
    topicRelevance: 0.42,
  },
};

export function scoreConversation(input: EngagementInput): ConversationScore {
  const ageMinutes = Math.max(1, input.ageMinutes);

  // Reach: log scale, 10M followers ≈ 1.0.
  const audienceSize = clamp01(Math.log10(Math.max(1, input.followers)) / 7);

  // The best reply window on a viral tweet is usually under two hours.
  // Full credit inside 2h, decaying to zero by 8h.
  const replyTiming =
    ageMinutes <= 120 ? 1 : clamp01(1 - (ageMinutes - 120) / 360);

  // Engagement per minute, normalized by author follower band so small
  // accounts can still show meaningful momentum.
  const growthVelocity = normalizedGrowthVelocity({
    followers: input.followers,
    likes: input.likes,
    retweets: input.retweets,
    replies: input.replies,
    quotes: input.quotes,
    ageMinutes,
  });

  const topicRelevance = clamp01(input.topicRelevance ?? 0.5);

  const factors: ScoreFactors = {
    audienceSize,
    topicRelevance,
    replyTiming,
    growthVelocity,
  };

  const weights = SCORE_WEIGHTS[input.goal ?? "default"];
  const value =
    100 *
    (weights.audienceSize * audienceSize +
      weights.replyTiming * replyTiming +
      weights.growthVelocity * growthVelocity +
      weights.topicRelevance * topicRelevance);

  return {
    value: Math.round(Math.min(100, value)),
    reason: describeScore(factors, ageMinutes, input.brandSafety),
    factors,
  };
}

function describeScore(
  factors: ScoreFactors,
  ageMinutes: number,
  brandSafety?: "safe" | "unsafe"
): string {
  const parts: string[] = [];

  if (factors.replyTiming >= 0.9) {
    parts.push(
      `posted ${formatAge(ageMinutes)} ago, still inside the prime reply window`
    );
  } else if (factors.replyTiming > 0.4) {
    parts.push(`the reply window is closing (posted ${formatAge(ageMinutes)} ago)`);
  } else {
    parts.push(`the conversation is ${formatAge(ageMinutes)} old and cooling off`);
  }

  if (factors.growthVelocity >= 0.6) {
    parts.push("engagement is moving fast for this audience size");
  } else if (factors.growthVelocity >= 0.25) {
    parts.push("engagement is growing steadily for this audience size");
  }

  if (factors.audienceSize >= 0.7) {
    parts.push("the author has a large audience");
  } else if (factors.audienceSize >= 0.45) {
    parts.push("the author has a solid audience");
  }

  if (brandSafety === "unsafe") {
    parts.push("the conversation looks risky for your brand right now");
  } else if (factors.topicRelevance >= 0.7) {
    parts.push("the topic closely matches your focus areas");
  } else if (factors.topicRelevance >= 0.4) {
    parts.push("the topic matches one of your focus areas");
  } else {
    parts.push("the topic looks off-niche for your focus areas");
  }

  const sentence = parts.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

/** Minimum relevance for the feed scanner to surface a tweet. */
export const FEED_SCANNER_MIN_RELEVANCE = 0.5;

/** Broad keywords that appear constantly in politics/news — need a second hit. */
const GENERIC_KEYWORDS = new Set([
  "build",
  "building",
  "product",
  "products",
  "founder",
  "founders",
  "design",
  "tech",
  "technology",
  "business",
  "economy",
  "market",
  "growth",
]);

const POLITICAL_SIGNAL =
  /\b(trump|biden|harris|obama|congress|senate|gop|democrat|republican|maga|election|president|presidential|white house|politic(?:al|s)?|impeach|ballot|primary|caucus|governor|senator|congress(?:man|woman)|culture war|executive order|immigration|deportation|left wing|right wing|partisan|legislat(?:e|ion|ive))\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isPoliticalContent(text: string): boolean {
  return POLITICAL_SIGNAL.test(text);
}

/** Word-boundary match for single tokens; phrase match for multi-word keywords. */
function keywordMatches(haystack: string, keyword: string): boolean {
  if (keyword.includes(" ")) {
    return haystack.includes(keyword);
  }
  const re = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(keyword)}s?(?:[^a-z0-9]|$)`,
    "i"
  );
  return re.test(haystack);
}

/** 0..1 keyword overlap between a tweet's text and the user's keywords. */
export function topicRelevanceForKeywords(
  text: string,
  keywords: string[]
): number {
  const normalized = keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);
  if (normalized.length === 0) return 0;

  const haystack = text.toLowerCase();
  const hits = normalized.filter((k) => keywordMatches(haystack, k));
  if (hits.length === 0) return 0;

  const strongHits = hits.filter((k) => !GENERIC_KEYWORDS.has(k));
  // One generic word alone (e.g. "build" in a political rant) is not enough.
  if (strongHits.length === 0 && hits.length < 2) return 0;

  // One specific keyword hit is enough; don't penalize long keyword lists.
  if (strongHits.length >= 1) {
    return Math.min(
      1,
      0.5 + strongHits.length * 0.15 + (hits.length - strongHits.length) * 0.05
    );
  }

  return Math.min(1, 0.45 + hits.length * 0.2);
}

/** Whether a tweet should appear in feed scanner results for these keywords. */
export function passesFeedScannerFilter(
  text: string,
  keywords: string[]
): boolean {
  return (
    topicRelevanceForKeywords(text, keywords) >= FEED_SCANNER_MIN_RELEVANCE
  );
}

/** Relevance gate for surfacing opportunities — curated sources skip keyword matching. */
export function passesOpportunityRelevance(
  text: string,
  keywords: string[],
  source?: OpportunitySource
): boolean {
  if (source === "list" || source === "watched" || source === "search") return true;
  return passesFeedScannerFilter(text, keywords);
}

/** Engagement events per hour since posting. */
export function velocityPerHour(input: {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  ageMinutes: number;
}): number {
  const engagement =
    input.likes + input.retweets + input.replies + input.quotes;
  return Math.round((engagement / Math.max(1, input.ageMinutes)) * 60);
}

/** Extract a tweet ID from an x.com / twitter.com URL, or null. */
export function parseTweetUrl(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(
    /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status(?:es)?\/(\d{4,25})/
  );
  return match ? match[1] : null;
}
