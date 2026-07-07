/**
 * Deterministic eval logic — the safety net that fails CI when a change
 * regresses the generation guardrails or the measured voice fidelity.
 *
 * Everything here is pure and key-free: it runs against checked-in fixtures
 * with no network and no ANTHROPIC_API_KEY, so the CI gate is meaningful in
 * demo mode (the project's founding constraint). The optional LLM-judged pass
 * lives behind a key check in the test layer; it never gates CI.
 *
 * Imported by both the test suite (`tests/evals*.test.ts`) and Convex
 * (`convex/evals.ts` internal eval-agent surface), so it stays free of
 * Next-only and Convex-only imports.
 */

import { z } from "zod";
import {
  QUOTE_CATEGORIES,
  REPLY_CATEGORIES,
} from "./onboarding";
import { buildVoiceStyleFromTweets, type VoiceStyle } from "./voice";

// ---------------------------------------------------------------------------
// Generation output contract (the shape the model must return)
// ---------------------------------------------------------------------------

export const GeneratedOptionSchema = z.object({
  category: z.string(),
  content: z.string(),
  reason: z.string(),
});

export const GeneratedOptionsSchema = z.object({
  options: z.array(GeneratedOptionSchema),
});

export type EvalOption = z.infer<typeof GeneratedOptionSchema>;

/** How many options a single generation request must return (PRD guardrail). */
export const GENERATION_OPTION_COUNT = 3;

/** X's weighted character budget for a single post. */
export const MAX_WEIGHTED_LENGTH = 280;

/** Minimum meaningful "reason" length — a reason must actually say something. */
const MIN_REASON_LENGTH = 8;

// ---------------------------------------------------------------------------
// Weighted length (X counts URLs as 23, and wide/emoji code points as 2)
// ---------------------------------------------------------------------------

const URL_RE = /https?:\/\/\S+/g;
const WIDE_CHAR_RE =
  /[\u{1100}-\u{115F}\u{2E80}-\u{303E}\u{3041}-\u{33FF}\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{A000}-\u{A4CF}\u{AC00}-\u{D7A3}\u{F900}-\u{FAFF}\u{FE30}-\u{FE4F}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

/**
 * Approximate X's weighted length: every URL counts as 23 regardless of its
 * real length, CJK/emoji code points count as 2, everything else as 1. This is
 * the length rule the generation pipeline must respect post-parse (WP16); here
 * it lets a fixture catch an option that is technically ≤280 chars but over
 * budget once weighted.
 */
export function weightedLength(text: string): number {
  let total = 0;
  const withoutUrls = text.replace(URL_RE, () => {
    total += 23;
    return "";
  });
  for (const char of withoutUrls) {
    total += WIDE_CHAR_RE.test(char) ? 2 : 1;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Guardrail phrase rules
// ---------------------------------------------------------------------------

/**
 * Engagement-bait / spam phrasing the product bans (PRD "no engagement-bait";
 * matches the generation system prompt's intent). Matched case-insensitively
 * as whole phrases inside option content.
 */
export const BANNED_PHRASES: readonly string[] = [
  "like and retweet",
  "retweet if",
  "rt if",
  "like if you agree",
  "follow me for",
  "follow for more",
  "drop a like",
  "smash that",
  "comment below",
  "tag someone who",
  "link in bio",
  "who else",
];

/**
 * Fake-precision "scores" the product forbids surfacing until real data backs
 * them (PRD: no "92% engagement"). Flags a number glued to an engagement /
 * reach / virality claim, in content OR reason.
 */
const FAKE_SCORE_RES: readonly RegExp[] = [
  /\b\d{1,3}(?:\.\d+)?\s*%\s*(?:engagement|virality|viral|reach|reply|response|impression|ctr|click)/i,
  /\b\d+(?:\.\d+)?\s*x\s*(?:engagement|virality|viral|reach|impression|more\s+engagement)/i,
  /\b(?:engagement|virality|viral|reach)\s*(?:score|rating|index)\s*[:=]?\s*\d/i,
  /\b\d{1,3}(?:\.\d+)?\s*%\s*(?:chance|likely|likelihood)\s+(?:to\s+)?(?:go\s+viral|viral)/i,
];

function hasFakeScore(text: string): boolean {
  return FAKE_SCORE_RES.some((re) => re.test(text));
}

function bannedPhraseIn(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Guardrail checks
// ---------------------------------------------------------------------------

export type GuardrailRule =
  | "output-shape"
  | "option-count"
  | "distinct-categories"
  | "valid-categories"
  | "reason-present"
  | "weighted-length"
  | "no-banned-phrases"
  | "no-fake-scores";

export type GuardrailFinding = {
  rule: GuardrailRule;
  ok: boolean;
  detail?: string;
};

export type GuardrailReport = {
  pass: boolean;
  findings: GuardrailFinding[];
};

export type GuardrailKind = "reply" | "quote";

function allowedCategories(kind: GuardrailKind): readonly string[] {
  return kind === "quote" ? QUOTE_CATEGORIES : REPLY_CATEGORIES;
}

/**
 * Run every deterministic guardrail against one generation result. `options`
 * is untyped-at-the-boundary on purpose: real callers may hand us a parsed
 * LLM payload, so the first rule is a zod shape check and the rest only run on
 * a well-formed set.
 */
export function runGuardrailChecks(
  options: unknown,
  opts: { kind: GuardrailKind; expectedCount?: number }
): GuardrailReport {
  const expectedCount = opts.expectedCount ?? GENERATION_OPTION_COUNT;
  const findings: GuardrailFinding[] = [];

  const parsed = GeneratedOptionsSchema.safeParse(
    Array.isArray(options) ? { options } : options
  );
  if (!parsed.success) {
    findings.push({
      rule: "output-shape",
      ok: false,
      detail: parsed.error.issues[0]?.message ?? "invalid options shape",
    });
    return { pass: false, findings };
  }
  findings.push({ rule: "output-shape", ok: true });

  const set = parsed.data.options;

  findings.push({
    rule: "option-count",
    ok: set.length === expectedCount,
    detail:
      set.length === expectedCount
        ? undefined
        : `expected ${expectedCount} options, got ${set.length}`,
  });

  const categoriesLower = set.map((o) => o.category.trim().toLowerCase());
  const duplicate = categoriesLower.find(
    (c, i) => categoriesLower.indexOf(c) !== i
  );
  findings.push({
    rule: "distinct-categories",
    ok: duplicate === undefined,
    detail: duplicate ? `duplicate category "${duplicate}"` : undefined,
  });

  const allowed = allowedCategories(opts.kind).map((c) => c.toLowerCase());
  const invalid = categoriesLower.find((c) => !allowed.includes(c));
  findings.push({
    rule: "valid-categories",
    ok: invalid === undefined,
    detail: invalid
      ? `"${invalid}" is not a ${opts.kind} category`
      : undefined,
  });

  const missingReason = set.find(
    (o) => o.reason.trim().length < MIN_REASON_LENGTH
  );
  findings.push({
    rule: "reason-present",
    ok: missingReason === undefined,
    detail: missingReason ? "an option is missing a real reason" : undefined,
  });

  const tooLong = set.find((o) => weightedLength(o.content) > MAX_WEIGHTED_LENGTH);
  findings.push({
    rule: "weighted-length",
    ok: tooLong === undefined,
    detail: tooLong
      ? `option exceeds ${MAX_WEIGHTED_LENGTH} weighted chars (${weightedLength(
          tooLong.content
        )})`
      : undefined,
  });

  let bannedHit: string | null = null;
  for (const o of set) {
    bannedHit = bannedPhraseIn(o.content);
    if (bannedHit) break;
  }
  findings.push({
    rule: "no-banned-phrases",
    ok: bannedHit === null,
    detail: bannedHit ? `banned phrase "${bannedHit}"` : undefined,
  });

  const fakeScore = set.find(
    (o) => hasFakeScore(o.content) || hasFakeScore(o.reason)
  );
  findings.push({
    rule: "no-fake-scores",
    ok: fakeScore === undefined,
    detail: fakeScore ? "fake-precision score surfaced" : undefined,
  });

  return { pass: findings.every((f) => f.ok), findings };
}

/** The rules that failed, for compact reporting. */
export function failedRules(report: GuardrailReport): GuardrailRule[] {
  return report.findings.filter((f) => !f.ok).map((f) => f.rule);
}

// ---------------------------------------------------------------------------
// Voice fidelity — deterministic, built on shared/voice.ts measurements
// ---------------------------------------------------------------------------

/** Below this, an output has drifted off the profile's measured voice. */
export const VOICE_FIDELITY_THRESHOLD = 0.5;

const COMPARE_DIMENSIONS: (keyof VoiceStyle)[] = [
  "sentenceLength",
  "emojiUse",
  "formatting",
  "readingLevel",
];

function punctuationOverlap(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : shared / union;
}

/**
 * How closely a candidate output matches a target voice profile, on the
 * deterministic style dimensions `shared/voice.ts` measures. 1 = every
 * comparable dimension matches; 0 = none. This is a regression signal: if the
 * voice-measurement code shifts, known-good fixtures drop below threshold and
 * CI fails.
 */
export function voiceFidelity(text: string, target: VoiceStyle): number {
  const measured = buildVoiceStyleFromTweets([text]);
  let score = 0;
  let weight = 0;
  for (const dim of COMPARE_DIMENSIONS) {
    weight += 1;
    if (measured[dim] === target[dim]) score += 1;
  }
  // Punctuation is a partial-overlap dimension, weighted like the others.
  weight += 1;
  score += punctuationOverlap(measured.punctuation, target.punctuation);
  return weight === 0 ? 0 : score / weight;
}

export type VoiceFidelityResult = {
  ok: boolean;
  score: number;
  threshold: number;
};

export function runVoiceFidelityCheck(
  text: string,
  target: VoiceStyle,
  threshold: number = VOICE_FIDELITY_THRESHOLD
): VoiceFidelityResult {
  const score = voiceFidelity(text, target);
  return { ok: score >= threshold, score, threshold };
}
