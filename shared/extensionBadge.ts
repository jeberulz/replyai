/**
 * Pure helpers for the browser-extension MVP (WP10).
 * Read-only scoring + deep-link construction — no DOM, no network.
 */

import {
  parseTweetUrl,
  scoreConversation,
  type ConversationScore,
  type EngagementInput,
} from "./scoring";

export type PageEngagementMetrics = {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  followers: number;
  /** Minutes since post; null when the page does not expose a usable timestamp. */
  ageMinutes: number | null;
};

export type ExtensionScoreInput = PageEngagementMetrics & {
  /** Override for tests; production badge uses neutral 0.5. */
  topicRelevance?: number;
};

const DEFAULT_APP_ORIGIN = "http://localhost:3000";

/** Extract a status tweet ID from a full page URL (x.com / twitter.com). */
export function tweetIdFromLocation(href: string): string | null {
  try {
    const url = new URL(href);
    if (!/(^|\.)(x|twitter)\.com$/i.test(url.hostname)) return null;
    return parseTweetUrl(url.href) ?? parseTweetUrl(`https://x.com${url.pathname}`);
  } catch {
    return null;
  }
}

/**
 * Score a conversation from metrics scraped off the status page.
 * Topic relevance defaults to neutral — the extension has no user keywords.
 * When age is unknown, assume mid-window (60m) so timing is not falsely zeroed.
 */
export function scoreFromPageMetrics(
  metrics: ExtensionScoreInput
): ConversationScore {
  const input: EngagementInput = {
    followers: Math.max(0, metrics.followers),
    likes: Math.max(0, metrics.likes),
    retweets: Math.max(0, metrics.retweets),
    replies: Math.max(0, metrics.replies),
    quotes: Math.max(0, metrics.quotes),
    ageMinutes: metrics.ageMinutes ?? 60,
    topicRelevance: metrics.topicRelevance ?? 0.5,
  };
  return scoreConversation(input);
}

export function normalizeAppOrigin(origin: string | undefined | null): string {
  const raw = (origin ?? DEFAULT_APP_ORIGIN).trim().replace(/\/+$/, "");
  if (!raw) return DEFAULT_APP_ORIGIN;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return DEFAULT_APP_ORIGIN;
    }
    return url.origin;
  } catch {
    return DEFAULT_APP_ORIGIN;
  }
}

/** Deep link that prefills + auto-starts analysis in the ReplyPilot app. */
export function buildWorkbenchDeepLink(opts: {
  appOrigin?: string | null;
  tweetUrl: string;
}): string | null {
  const tweetId = parseTweetUrl(opts.tweetUrl);
  if (!tweetId) return null;
  const origin = normalizeAppOrigin(opts.appOrigin);
  const params = new URLSearchParams({
    url: opts.tweetUrl,
    auto: "1",
  });
  return `${origin}/dashboard?${params.toString()}`;
}

export function parseCompactCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, "").toLowerCase();
  if (!cleaned) return 0;
  const match = cleaned.match(/^([\d.]+)\s*([kmb])?$/i);
  if (!match) {
    const digits = cleaned.replace(/[^\d]/g, "");
    return digits ? Number.parseInt(digits, 10) : 0;
  }
  const n = Number.parseFloat(match[1] ?? "0");
  if (!Number.isFinite(n)) return 0;
  const suffix = (match[2] ?? "").toLowerCase();
  const mult =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return Math.round(n * mult);
}

/** Age in minutes from an ISO datetime attribute, or null if unusable. */
export function ageMinutesFromIso(iso: string | null | undefined, nowMs = Date.now()): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const minutes = (nowMs - then) / 60_000;
  if (minutes < 0) return 0;
  return minutes;
}

export { DEFAULT_APP_ORIGIN };
