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
  brandSafety: "safe" | "unsafe";
};

export function resolveManualTopicRelevance(
  keywordScore: number,
  semanticScore?: number | SemanticScore
): number {
  if (semanticScore === undefined) {
    return keywordScore > 0 ? keywordScore : 0.5;
  }
  return combineTopicRelevance(
    keywordScore,
    typeof semanticScore === "number"
      ? semanticScore
      : effectiveSemanticRelevance(semanticScore)
  );
}

export function effectiveSemanticRelevance(score?: SemanticScore): number {
  if (!score || score.brandSafety === "unsafe") return 0;
  return score.relevance;
}

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
  semantic: SemanticScore | number | undefined,
  source?: OpportunitySource
): boolean {
  if (typeof semantic !== "number" && semantic?.brandSafety === "unsafe") {
    return false;
  }
  if (source === "list" || source === "watched" || source === "search") {
    return true;
  }
  const semanticScore =
    typeof semantic === "number"
      ? semantic
      : effectiveSemanticRelevance(semantic);
  const combined = combineTopicRelevance(keywordScore, semanticScore);
  return combined >= FEED_SCANNER_MIN_RELEVANCE;
}

const TECH_POLICY_SIGNAL =
  /\b(ai act|policy|policies|regulat(?:ion|ory)|privacy|copyright|compliance|antitrust|open source|export controls?)\b/i;
const TRAGEDY_SIGNAL =
  /\b(tragedy|disaster|earthquake|flood|wildfire|hurricane|shooting|bombing|war|hostage|funeral|grief|mourning|victim|killed|died|death)\b/i;
const OUTRAGE_SIGNAL =
  /\b(boycott|cancel(?:ed|ling)?|dogpile|pile[- ]on|outrage|ratio(?:ed)?|scam(?:mer)?|fraud|exposed|call(?:ing)? out)\b/i;

function hasNichePolicyContext(
  haystack: string,
  nicheTerms: string[]
): boolean {
  if (!TECH_POLICY_SIGNAL.test(haystack)) return false;
  return nicheTerms.some((term) => {
    if (term.includes(" ")) return haystack.includes(term);
    return haystack.includes(term);
  });
}

function demoBrandSafetyVerdict(
  haystack: string,
  nicheTerms: string[]
): { brandSafety: "safe" | "unsafe"; reason: string } {
  if (TRAGEDY_SIGNAL.test(haystack)) {
    return {
      brandSafety: "unsafe",
      reason: "Tragedy or disaster context",
    };
  }
  if (OUTRAGE_SIGNAL.test(haystack)) {
    return {
      brandSafety: "unsafe",
      reason: "Outrage-bait or dogpile context",
    };
  }
  if (isPoliticalContent(haystack) && !hasNichePolicyContext(haystack, nicheTerms)) {
    return {
      brandSafety: "unsafe",
      reason: "Political or culture-war context",
    };
  }
  return { brandSafety: "safe", reason: "Brand-safe context" };
}

/** Deterministic demo classifier — no API key required. */
export function demoSemanticRelevance(
  text: string,
  niche: NicheContext
): SemanticScore {
  const haystack = text.toLowerCase();
  const nicheTerms = [
    ...niche.keywords,
    ...niche.voiceTopics,
    ...niche.recentTopics,
  ]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 1);
  const safety = demoBrandSafetyVerdict(haystack, nicheTerms);
  if (safety.brandSafety === "unsafe") {
    return {
      relevance: 0,
      reason: safety.reason,
      brandSafety: "unsafe",
    };
  }

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
    brandSafety: "safe",
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
    return true;
  }
  if (storedTopicRelevance !== undefined) {
    return storedTopicRelevance >= FEED_SCANNER_MIN_RELEVANCE;
  }
  return topicRelevanceForKeywords(text, keywords) >= FEED_SCANNER_MIN_RELEVANCE;
}
