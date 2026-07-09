import { parseTweetUrl } from "../../shared/scoring";

/** Match an x.com / twitter.com status URL anywhere in free text. */
const TWEET_URL_IN_TEXT =
  /https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status(?:es)?\/(\d{4,25})(?:[^\s]*)?/i;

/**
 * Pull the first tweet status URL from command-palette input.
 * Accepts a bare URL or text that contains one (paste + noise).
 */
export function extractTweetUrlFromQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  if (parseTweetUrl(trimmed)) {
    // Strip trailing punctuation that paste sometimes adds
    return trimmed.replace(/[),.;]+$/g, "");
  }

  const match = trimmed.match(TWEET_URL_IN_TEXT);
  if (!match) return null;
  const candidate = match[0].replace(/[),.;]+$/g, "");
  return parseTweetUrl(candidate) ? candidate : null;
}

/** WP10 deep-link: open workbench and auto-start analysis. */
export function buildAnalyzeDeepLink(tweetUrl: string): string {
  return `/dashboard?url=${encodeURIComponent(tweetUrl)}&auto=1`;
}

export type PaletteOpportunity = {
  _id: string;
  authorHandle: string;
  text: string;
  score: number;
  effectiveScore?: number;
};

/** Client-side filter for palette Opportunities group (capped). */
export function filterOpportunitiesForPalette(
  opportunities: PaletteOpportunity[],
  query: string,
  limit = 8
): PaletteOpportunity[] {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  const ranked = [...opportunities].sort(
    (a, b) => (b.effectiveScore ?? b.score) - (a.effectiveScore ?? a.score)
  );
  if (!q) return ranked.slice(0, limit);

  return ranked
    .filter(
      (opp) =>
        opp.authorHandle.toLowerCase().includes(q) ||
        opp.text.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

/** Feed deep-link that selects an opportunity (feed-scanner reads `?opportunity=`). */
export function buildOpportunityDeepLink(opportunityId: string): string {
  return `/feed?opportunity=${encodeURIComponent(opportunityId)}`;
}
