/**
 * WP39 — Onboarding concierge proposal shape + demo fixtures.
 * Pure data / validation — no I/O. Static goal keyword lists in
 * `shared/onboarding.ts` remain the fallback when X/AI unavailable.
 */

import { z } from "zod";
import { DEMO_TWEETS } from "./demoData";
import {
  GOALS,
  isGoalId,
  suggestedKeywordsForGoal,
  type GoalId,
} from "./onboarding";

export const ONBOARDING_CONCIERGE_KEYWORD_MIN = 5;
export const ONBOARDING_CONCIERGE_KEYWORD_MAX = 12;
export const ONBOARDING_CONCIERGE_WATCH_MIN = 3;
export const ONBOARDING_CONCIERGE_WATCH_MAX = 5;
export const ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX = 5;

export type OnboardingWatchCandidate = {
  handle: string;
  displayName: string;
  reason: string;
};

export type OnboardingConciergeProposal = {
  goalId: GoalId;
  goalReason: string;
  keywords: string[];
  watches: OnboardingWatchCandidate[];
  /** Short voice examples for review — not a full trained profile until confirm. */
  voiceExamples: string[];
  source: "llm" | "heuristic" | "demo";
};

const goalIdSchema = z.enum(["audience", "leads", "authority"]);

export const onboardingWatchCandidateSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(40)
    .transform((h) => h.replace(/^@/, "").trim().toLowerCase()),
  displayName: z.string().min(1).max(80),
  reason: z
    .string()
    .min(1)
    .max(280)
    .describe("Plain-language why this account is worth watching — no fake scores"),
});

/** Zod schema for LLM / stored proposal JSON. */
export const onboardingConciergeProposalSchema = z.object({
  goalId: goalIdSchema,
  goalReason: z
    .string()
    .min(1)
    .max(280)
    .describe("Plain-language why this goal fits — no fake engagement scores"),
  keywords: z
    .array(z.string().min(1).max(48))
    .min(ONBOARDING_CONCIERGE_KEYWORD_MIN)
    .max(ONBOARDING_CONCIERGE_KEYWORD_MAX),
  watches: z
    .array(onboardingWatchCandidateSchema)
    .min(ONBOARDING_CONCIERGE_WATCH_MIN)
    .max(ONBOARDING_CONCIERGE_WATCH_MAX),
  voiceExamples: z
    .array(z.string().min(1).max(500))
    .max(ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX),
  source: z.enum(["llm", "heuristic", "demo"]),
});

export type OnboardingConciergeInput = {
  bio?: string;
  recentTweets?: string[];
  displayName?: string;
  username?: string;
};

function normalizeKeyword(raw: string): string {
  return raw.trim().toLowerCase().replace(/^#/, "");
}

function uniqueKeywords(list: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const k = normalizeKeyword(raw);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

const BIO_GOAL_HINTS: Array<{ goal: GoalId; patterns: RegExp[] }> = [
  {
    goal: "leads",
    patterns: [
      /\b(agency|freelance|consultant|clients?|b2b|sales|leads?|hiring)\b/i,
      /\bmrr\b/i,
    ],
  },
  {
    goal: "authority",
    patterns: [
      /\b(researcher|professor|author|newsletter|writing about|ml |ai research)\b/i,
      /\b(thought leader|expert)\b/i,
    ],
  },
  {
    goal: "audience",
    patterns: [
      /\b(build in public|indie|creator|growth|audience|followers)\b/i,
      /\b(shipped|shipping)\b/i,
    ],
  },
];

/** Infer a goal from bio + tweets; defaults to audience. */
export function inferGoalFromText(input: OnboardingConciergeInput): GoalId {
  const blob = [input.bio ?? "", ...(input.recentTweets ?? [])]
    .join("\n")
    .toLowerCase();
  if (!blob.trim()) return "audience";
  for (const { goal, patterns } of BIO_GOAL_HINTS) {
    if (patterns.some((p) => p.test(blob))) return goal;
  }
  return "audience";
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "have",
  "just",
  "about",
  "into",
  "they",
  "them",
  "what",
  "when",
  "were",
  "been",
  "will",
  "would",
  "could",
  "should",
  "their",
  "there",
  "which",
  "while",
  "where",
  "http",
  "https",
  "www",
]);

/** Pull niche-ish tokens from bio/tweets; pad with static goal seeds. */
export function extractKeywordsFromText(
  input: OnboardingConciergeInput,
  goal: GoalId
): string[] {
  const blob = [input.bio ?? "", ...(input.recentTweets ?? [])].join(" ");
  const tokens = blob
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .match(/[a-z][a-z0-9+#-]{2,}/g) ?? [];
  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (STOP.has(t) || t.length > 24) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k]) => k);

  const seeds = suggestedKeywordsForGoal(goal);
  return uniqueKeywords([...ranked, ...seeds], ONBOARDING_CONCIERGE_KEYWORD_MAX);
}

function padKeywords(keywords: string[], goal: GoalId): string[] {
  return uniqueKeywords(
    [...keywords, ...suggestedKeywordsForGoal(goal)],
    ONBOARDING_CONCIERGE_KEYWORD_MAX
  );
}

function ensureKeywordFloor(keywords: string[], goal: GoalId): string[] {
  const padded = padKeywords(keywords, goal);
  if (padded.length >= ONBOARDING_CONCIERGE_KEYWORD_MIN) return padded;
  return uniqueKeywords(
    [...padded, ...suggestedKeywordsForGoal(goal), "ai", "startup", "saas"],
    ONBOARDING_CONCIERGE_KEYWORD_MAX
  );
}

const DEMO_WATCH_POOL: OnboardingWatchCandidate[] = [
  {
    handle: "sarahbuilds",
    displayName: "Sarah Chen",
    reason: "AI product builder with high-signal threads in your niche",
  },
  {
    handle: "priyaml",
    displayName: "Dr. Priya Nair",
    reason: "ML researcher — authority conversations worth joining early",
  },
  {
    handle: "marcusship",
    displayName: "Marcus Rivera",
    reason: "Indie hacker shipping publicly — good audience-growth threads",
  },
  {
    handle: "lenacodes",
    displayName: "Lena Ortiz",
    reason: "Devtools founder — practical product and UX debates",
  },
  {
    handle: "alexvc",
    displayName: "Alex Kim",
    reason: "Investor takes that open lead-friendly founder threads",
  },
];

/**
 * Deterministic demo proposal. Empty / missing X input still returns a
 * valid shape so onboarding never breaks without keys.
 */
export function demoOnboardingProposal(
  input: OnboardingConciergeInput = {}
): OnboardingConciergeProposal {
  const goalId = inferGoalFromText(input);
  const goalMeta = GOALS.find((g) => g.id === goalId)!;
  const keywords = ensureKeywordFloor(
    extractKeywordsFromText(input, goalId),
    goalId
  );

  const voiceFromInput = (input.recentTweets ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX);

  const voiceExamples =
    voiceFromInput.length > 0
      ? voiceFromInput
      : DEMO_TWEETS.slice(0, ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX).map(
          (t) => t.text
        );

  const watches = DEMO_WATCH_POOL.slice(0, ONBOARDING_CONCIERGE_WATCH_MAX);

  return {
    goalId,
    goalReason: input.bio?.trim()
      ? `Based on your bio, "${goalMeta.label}" looks like the best fit to start.`
      : `Demo mode: we suggest "${goalMeta.label}" — confirm or switch anytime.`,
    keywords: keywords.slice(
      0,
      Math.max(ONBOARDING_CONCIERGE_KEYWORD_MIN, Math.min(keywords.length, 8))
    ),
    watches,
    voiceExamples,
    source: "demo",
  };
}

/**
 * Heuristic proposal when Anthropic is unavailable but we have bio/tweets.
 * Falls back to demo shape when input is empty.
 */
export function heuristicOnboardingProposal(
  input: OnboardingConciergeInput
): OnboardingConciergeProposal {
  const hasSignal =
    Boolean(input.bio?.trim()) ||
    (input.recentTweets ?? []).some((t) => t.trim().length > 0);
  if (!hasSignal) {
    return demoOnboardingProposal(input);
  }

  const goalId = inferGoalFromText(input);
  const goalMeta = GOALS.find((g) => g.id === goalId)!;
  const keywords = ensureKeywordFloor(
    extractKeywordsFromText(input, goalId),
    goalId
  );
  const voiceExamples = (input.recentTweets ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX);

  return {
    goalId,
    goalReason: `From your recent posts and bio, "${goalMeta.label}" is the strongest starting goal.`,
    keywords: keywords.slice(0, 8),
    watches: DEMO_WATCH_POOL.slice(0, ONBOARDING_CONCIERGE_WATCH_MAX),
    voiceExamples:
      voiceExamples.length > 0
        ? voiceExamples
        : DEMO_TWEETS.slice(0, 3).map((t) => t.text),
    source: "heuristic",
  };
}

/** Parse + clamp LLM / stored JSON into a valid proposal (or null). */
export function parseOnboardingConciergeProposal(
  raw: unknown
): OnboardingConciergeProposal | null {
  const parsed = onboardingConciergeProposalSchema.safeParse(raw);
  if (!parsed.success) return null;
  const data = parsed.data;
  if (!isGoalId(data.goalId)) return null;
  return {
    ...data,
    keywords: uniqueKeywords(data.keywords, ONBOARDING_CONCIERGE_KEYWORD_MAX),
    watches: data.watches.map((w) => ({
      ...w,
      handle: w.handle.replace(/^@/, "").toLowerCase(),
    })),
    voiceExamples: data.voiceExamples
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, ONBOARDING_CONCIERGE_VOICE_SNIPPET_MAX),
  };
}
