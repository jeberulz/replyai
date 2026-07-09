/**
 * Niche trend radar (WP37).
 *
 * Heuristic MVP: cluster recent scan opportunities by niche-keyword overlap
 * (and shared content tokens when keywords miss). No embeddings / LLM labeling
 * in v1 — document upgrade path when semantic labels are cheap enough.
 *
 * Surfaces counts only — never viral predictions or fake engagement %.
 */

import { DEMO_TWEETS } from "./demoData";
import { DEFAULT_KEYWORDS } from "./onboarding";

export const TREND_DEFAULTS = {
  /** Rolling window of scanned opportunities. */
  windowMs: 7 * 24 * 60 * 60 * 1000,
  /** Cap display at top N emerging topics. */
  maxTopics: 3,
  /** Minimum opportunities in a cluster to surface it. */
  minClusterSize: 2,
  /** Max opportunity ids kept per cluster for deep-links. */
  maxOpportunityIds: 8,
} as const;

export type TrendOpportunityInput = {
  id: string;
  text: string;
  scannedAt: number;
  /** Optional suggested angle — used as a soft label hint. */
  suggestedAngle?: string;
};

export type TrendTopic = {
  /** Stable slug for URL filters (`?topic=`). */
  slug: string;
  /** Human label for “conversations forming around X”. */
  label: string;
  /** Opportunity count in the cluster (observed, not predicted). */
  conversationCount: number;
  /** Opportunity ids in this cluster (bounded). */
  opportunityIds: string[];
  /** Niche keywords that matched (empty when token-fallback). */
  matchedKeywords: string[];
};

export type ClusterTrendsInput = {
  opportunities: TrendOpportunityInput[];
  /** User niche / scanner keywords. Falls back to DEFAULT_KEYWORDS. */
  nicheKeywords?: string[];
  nowMs?: number;
  windowMs?: number;
  maxTopics?: number;
  minClusterSize?: number;
};

export type ClusterTrendsResult = {
  topics: TrendTopic[];
  windowMs: number;
  corpusSize: number;
  demo: boolean;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "we",
  "you",
  "your",
  "i",
  "my",
  "me",
  "our",
  "not",
  "no",
  "yes",
  "with",
  "from",
  "as",
  "by",
  "about",
  "into",
  "over",
  "after",
  "before",
  "than",
  "then",
  "so",
  "just",
  "also",
  "more",
  "most",
  "some",
  "any",
  "all",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "which",
  "there",
  "here",
  "out",
  "up",
  "down",
  "very",
  "really",
  "like",
  "get",
  "got",
  "make",
  "made",
  "one",
  "two",
  "new",
  "old",
  "good",
  "bad",
  "great",
  "best",
  "don",
  "doesn",
  "isn",
  "aren",
  "wasn",
  "weren",
  "won",
  "wouldn",
  "couldn",
  "shouldn",
  "ain",
  "ll",
  "re",
  "ve",
  "t",
  "s",
  "d",
  "m",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

/** URL-safe slug from a topic label. */
export function topicSlug(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const ACRONYM_LABELS: Record<string, string> = {
  ai: "AI",
  llm: "LLM",
  llms: "LLMs",
  saas: "SaaS",
  api: "API",
  ml: "ML",
};

/** Title-case a keyword/token for display. */
export function formatTopicLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "untitled";
  const lower = trimmed.toLowerCase();
  if (ACRONYM_LABELS[lower]) return ACRONYM_LABELS[lower]!;
  return trimmed
    .split(" ")
    .map((w) => {
      const lw = w.toLowerCase();
      if (ACRONYM_LABELS[lw]) return ACRONYM_LABELS[lw]!;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeKeywords(keywords: string[] | undefined): string[] {
  const source =
    keywords && keywords.length > 0 ? keywords : [...DEFAULT_KEYWORDS];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of source) {
    const n = k.trim().toLowerCase();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  // Prefer longer phrases first so "indie hacker" wins over "indie".
  return out.sort((a, b) => b.length - a.length);
}

function extractContentTokens(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Pick the primary cluster key for an opportunity.
 * Prefer the first matching niche keyword; else the first strong content token.
 */
export function primaryClusterKey(
  text: string,
  nicheKeywords: string[]
): { key: string; kind: "keyword" | "token"; matchedKeywords: string[] } | null {
  const haystack = text.toLowerCase();
  const matched = nicheKeywords.filter((k) => keywordMatches(haystack, k));
  if (matched.length > 0) {
    const key = matched[0]!;
    return { key, kind: "keyword", matchedKeywords: matched };
  }
  const tokens = extractContentTokens(text);
  if (tokens.length === 0) return null;
  return { key: tokens[0]!, kind: "token", matchedKeywords: [] };
}

function inWindow(
  scannedAt: number,
  nowMs: number,
  windowMs: number
): boolean {
  return scannedAt >= nowMs - windowMs && scannedAt <= nowMs;
}

/**
 * Cluster opportunities into emerging niche topics.
 * Ranked by conversation count; capped at maxTopics.
 */
export function clusterTrends(
  input: ClusterTrendsInput
): ClusterTrendsResult {
  const nowMs = input.nowMs ?? Date.now();
  const windowMs = input.windowMs ?? TREND_DEFAULTS.windowMs;
  const maxTopics = input.maxTopics ?? TREND_DEFAULTS.maxTopics;
  const minClusterSize =
    input.minClusterSize ?? TREND_DEFAULTS.minClusterSize;
  const nicheKeywords = normalizeKeywords(input.nicheKeywords);

  const inWindowOpps = input.opportunities.filter((o) =>
    inWindow(o.scannedAt, nowMs, windowMs)
  );

  type Bucket = {
    key: string;
    kind: "keyword" | "token";
    matchedKeywords: Set<string>;
    opportunityIds: string[];
    conversationCount: number;
  };

  const buckets = new Map<string, Bucket>();

  for (const opp of inWindowOpps) {
    const text = [opp.text, opp.suggestedAngle ?? ""].join("\n");
    const primary = primaryClusterKey(text, nicheKeywords);
    if (!primary) continue;

    let bucket = buckets.get(primary.key);
    if (!bucket) {
      bucket = {
        key: primary.key,
        kind: primary.kind,
        matchedKeywords: new Set(),
        opportunityIds: [],
        conversationCount: 0,
      };
      buckets.set(primary.key, bucket);
    }
    for (const k of primary.matchedKeywords) bucket.matchedKeywords.add(k);
    bucket.conversationCount += 1;
    if (
      bucket.opportunityIds.length < TREND_DEFAULTS.maxOpportunityIds &&
      !bucket.opportunityIds.includes(opp.id)
    ) {
      bucket.opportunityIds.push(opp.id);
    }
  }

  const topics: TrendTopic[] = [...buckets.values()]
    .map((b) => {
      const label = formatTopicLabel(b.key);
      return {
        slug: topicSlug(label),
        label,
        conversationCount: b.conversationCount,
        opportunityIds: b.opportunityIds,
        matchedKeywords: [...b.matchedKeywords],
      };
    })
    .filter((t) => t.conversationCount >= minClusterSize)
    .sort((a, b) => {
      if (b.conversationCount !== a.conversationCount) {
        return b.conversationCount - a.conversationCount;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, maxTopics);

  return {
    topics,
    windowMs,
    corpusSize: inWindowOpps.length,
    demo: false,
  };
}

/** Deterministic fixture topics for demo mode (no live scan corpus). */
export function demoTrendTopics(nowMs = Date.now()): ClusterTrendsResult {
  const nicheKeywords = [...DEFAULT_KEYWORDS];
  const opportunities: TrendOpportunityInput[] = DEMO_TWEETS.map((t, i) => ({
    id: `demo-trend-${t.id}`,
    text: t.text,
    scannedAt: nowMs - i * 60 * 60 * 1000,
    suggestedAngle: undefined,
  }));

  // Seed extra overlapping copies so clusters clear minClusterSize.
  const seeded: TrendOpportunityInput[] = [];
  for (const opp of opportunities) {
    seeded.push(opp);
    seeded.push({
      ...opp,
      id: `${opp.id}-b`,
      scannedAt: opp.scannedAt - 30 * 60 * 1000,
    });
  }

  const clustered = clusterTrends({
    opportunities: seeded,
    nicheKeywords,
    nowMs,
    minClusterSize: 2,
    maxTopics: TREND_DEFAULTS.maxTopics,
  });

  // Guarantee stable demo labels even if keyword extraction drifts.
  if (clustered.topics.length === 0) {
    return {
      topics: [
        {
          slug: "ai",
          label: "AI",
          conversationCount: 4,
          opportunityIds: seeded.slice(0, 4).map((o) => o.id),
          matchedKeywords: ["ai"],
        },
        {
          slug: "startup",
          label: "Startup",
          conversationCount: 2,
          opportunityIds: seeded.slice(0, 2).map((o) => o.id),
          matchedKeywords: ["startup"],
        },
        {
          slug: "llm",
          label: "LLM",
          conversationCount: 2,
          opportunityIds: seeded.slice(2, 4).map((o) => o.id),
          matchedKeywords: ["llm"],
        },
      ].slice(0, TREND_DEFAULTS.maxTopics),
      windowMs: TREND_DEFAULTS.windowMs,
      corpusSize: seeded.length,
      demo: true,
    };
  }

  return { ...clustered, demo: true };
}

/** Copy helper for UI: “3 conversations forming around AI”. */
export function trendRadarSentence(topic: TrendTopic): string {
  const n = topic.conversationCount;
  const noun = n === 1 ? "conversation" : "conversations";
  return `${n} ${noun} forming around ${topic.label}`;
}
