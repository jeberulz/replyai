/**
 * Semantic niche-fit scoring for the feed scanner (Phase 3).
 * Keyword overlap is fast but misses paraphrases; a cheap classifier fills the gap.
 */

import {
  FEED_SCANNER_MIN_RELEVANCE,
  isPoliticalContent,
  type OpportunitySource,
  topicRelevanceForKeywords,
} from "./scoring";

export const SEMANTIC_CACHE_MS = 24 * 60 * 60 * 1000;
/** Max following-timeline tweets with zero keyword hit to send for semantic rescue per scan. */
export const SEMANTIC_RESCUE_LIMIT = 8;
/** Hard cap on tweets sent to the classifier per scan. */
export const SEMANTIC_BATCH_LIMIT = 25;

export const SEMANTIC_HAIKU_MODEL = "claude-haiku-4-5";

export type NicheContext = {
  keywords: string[];
  voiceTopics: string[];
  recentTopics: string[];
};

export type SemanticCandidateInput = {
  tweetId: string;
  text: string;
  source?: OpportunitySource;
  keywordScore: number;
  velocity: number;
};

export type SemanticScore = {
  relevance: number;
  reason: string;
};

/** Combined relevance: keyword wins unless semantic is stronger (scaled by 0.9). */
export function combineTopicRelevance(
  keywordScore: number,
  semanticScore: number
): number {
  return Math.max(keywordScore, Math.min(1, semanticScore * 0.9));
}

export function fingerprintText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/** Which candidates warrant a Haiku classification call this scan. */
export function selectSemanticClassificationTargets(
  candidates: SemanticCandidateInput[],
  maxRescue = SEMANTIC_RESCUE_LIMIT
): SemanticCandidateInput[] {
  const targets: SemanticCandidateInput[] = [];
  const rescuePool: SemanticCandidateInput[] = [];

  for (const c of candidates) {
    const passesKw = c.keywordScore >= FEED_SCANNER_MIN_RELEVANCE;
    if (
      c.source === "list" ||
      c.source === "watched" ||
      c.source === "search" ||
      passesKw ||
      c.keywordScore > 0
    ) {
      targets.push(c);
    } else if (c.source === "following" || !c.source) {
      rescuePool.push(c);
    }
  }

  rescuePool.sort((a, b) => b.velocity - a.velocity);
  targets.push(...rescuePool.slice(0, maxRescue));

  const seen = new Set<string>();
  const deduped: SemanticCandidateInput[] = [];
  for (const t of targets) {
    if (seen.has(t.tweetId)) continue;
    seen.add(t.tweetId);
    deduped.push(t);
  }
  return deduped.slice(0, SEMANTIC_BATCH_LIMIT);
}

/** Whether a following-timeline tweet should surface after semantic scoring. */
export function passesCombinedFeedFilter(
  text: string,
  keywords: string[],
  keywordScore: number,
  semanticScore: number,
  source?: OpportunitySource
): boolean {
  if (source === "list" || source === "watched" || source === "search") {
    return true;
  }
  if (isPoliticalContent(text)) return false;
  const combined = combineTopicRelevance(keywordScore, semanticScore);
  return combined >= FEED_SCANNER_MIN_RELEVANCE;
}

/** Deterministic demo classifier — no API key required. */
export function demoSemanticRelevance(
  text: string,
  niche: NicheContext
): SemanticScore {
  if (isPoliticalContent(text)) {
    return { relevance: 0, reason: "Political content excluded" };
  }

  const haystack = text.toLowerCase();
  const nicheTerms = [
    ...niche.keywords,
    ...niche.voiceTopics,
    ...niche.recentTopics,
  ]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1);

  let hits = 0;
  for (const term of nicheTerms) {
    if (term.includes(" ")) {
      if (haystack.includes(term)) hits += 2;
      continue;
    }
    if (haystack.includes(term)) hits += 1;
  }

  // Paraphrase rescue: "autonomous support bots" ↔ "ai agents" niche without exact keywords.
  if (
    (haystack.includes("autonomous") || haystack.includes("agent")) &&
    (haystack.includes("support") || haystack.includes("customer"))
  ) {
    hits += 3;
  }
  if (haystack.includes("language model") || haystack.includes("llm")) {
    hits += 2;
  }

  const relevance = Math.min(1, hits * 0.2);
  return {
    relevance,
    reason:
      relevance >= 0.5
        ? "Topic aligns with your niche (demo semantic match)"
        : "Weak niche overlap",
  };
}

export function augmentScoreReason(
  baseReason: string,
  keywordScore: number,
  semanticScore: number
): string {
  if (semanticScore * 0.9 > keywordScore + 0.05 && semanticScore >= 0.55) {
    return `${baseReason} Niche fit confirmed beyond exact keywords.`;
  }
  return baseReason;
}

/** Relevance check for cached opportunity rows in list/reconcile. */
export function opportunityStillRelevant(
  text: string,
  keywords: string[],
  source: OpportunitySource | undefined,
  storedTopicRelevance?: number
): boolean {
  if (source === "list" || source === "watched" || source === "search") {
    return !isPoliticalContent(text);
  }
  if (storedTopicRelevance !== undefined) {
    return (
      storedTopicRelevance >= FEED_SCANNER_MIN_RELEVANCE &&
      !isPoliticalContent(text)
    );
  }
  return topicRelevanceForKeywords(text, keywords) >= FEED_SCANNER_MIN_RELEVANCE;
}
