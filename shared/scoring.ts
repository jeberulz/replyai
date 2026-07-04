/**
 * Heuristic "worth replying" scoring, shared by the Next.js app (tweet
 * analysis) and Convex scheduled functions (feed scanner).
 *
 * Deliberately not an ML score: per the PRD, we show a 0-100 heuristic with a
 * plain-language reason instead of fake-precision engagement predictions.
 */

export type EngagementInput = {
  followers: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  /** Minutes since the tweet was posted. */
  ageMinutes: number;
  /** 0..1 how well the topic matches the user's interests. Defaults to 0.5 when omitted (manual analyze). */
  topicRelevance?: number;
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

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreConversation(input: EngagementInput): ConversationScore {
  const ageMinutes = Math.max(1, input.ageMinutes);
  const engagement =
    input.likes + input.retweets * 2 + input.replies * 3 + input.quotes * 2;

  // Reach: log scale, 10M followers ≈ 1.0.
  const audienceSize = clamp01(Math.log10(Math.max(1, input.followers)) / 7);

  // The best reply window on a viral tweet is usually under two hours.
  // Full credit inside 2h, decaying to zero by 8h.
  const replyTiming =
    ageMinutes <= 120 ? 1 : clamp01(1 - (ageMinutes - 120) / 360);

  // Engagement per minute; ~5/min saturates.
  const growthVelocity = clamp01(engagement / ageMinutes / 5);

  const topicRelevance = clamp01(input.topicRelevance ?? 0.5);

  const factors: ScoreFactors = {
    audienceSize,
    topicRelevance,
    replyTiming,
    growthVelocity,
  };

  // Relevance weighted highest — timing/velocity alone must not surface off-topic tweets.
  const value = Math.round(
    100 *
      (0.15 * audienceSize +
        0.25 * replyTiming +
        0.25 * growthVelocity +
        0.35 * topicRelevance)
  );

  return { value, reason: describeScore(factors, ageMinutes), factors };
}

function describeScore(factors: ScoreFactors, ageMinutes: number): string {
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
    parts.push("engagement is accelerating fast");
  } else if (factors.growthVelocity >= 0.25) {
    parts.push("engagement is growing steadily");
  }

  if (factors.audienceSize >= 0.7) {
    parts.push("the author has a large audience");
  } else if (factors.audienceSize >= 0.45) {
    parts.push("the author has a solid audience");
  }

  if (factors.topicRelevance >= 0.7) {
    parts.push("the topic closely matches your focus areas");
  } else if (factors.topicRelevance >= 0.4) {
    parts.push("the topic matches one of your focus areas");
  }

  const sentence = parts.join(", ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Short keywords use word boundaries so "ai" does not match "said". */
function keywordMatches(haystack: string, keyword: string): boolean {
  if (keyword.length <= 4) {
    const re = new RegExp(
      `(?:^|[^a-z0-9])${escapeRegExp(keyword)}(?:[^a-z0-9]|$)`,
      "i"
    );
    return re.test(haystack);
  }
  return haystack.includes(keyword);
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
  const hits = normalized.filter((k) => keywordMatches(haystack, k)).length;
  if (hits === 0) return 0;

  return Math.min(1, 0.4 + (hits / normalized.length) * 0.6);
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
