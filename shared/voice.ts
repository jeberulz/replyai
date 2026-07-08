/**
 * Deterministic voice analysis: derive a style profile from a sample of a
 * user's tweets. Used as the base for voice training (the AI layer refines
 * the tone label, but these measurements are computed, not guessed).
 */

export type VoiceStyle = {
  tone: string;
  sentenceLength: string;
  formatting: string;
  emojiUse: string;
  punctuation: string;
  readingLevel: string;
  commonPhrases: string[];
};

export type VoiceNegativeConstraints = {
  bannedPhrases: string[];
  antiPatterns: string[];
};

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/u;
const WORD_RE = /[a-z0-9']+/g;

export const VOICE_PROMPT_EXAMPLES_MIN = 8;
export const VOICE_PROMPT_EXAMPLES_MAX = 10;

const STOCK_AI_OPENERS = [
  "Great point!",
  "Great point",
  "Love this",
  "This is huge",
  "Game changer",
  "Couldn't agree more",
];

const DEFAULT_EMOJI_BANS = ["🚀", "🔥", "💯", "🙌", "👏"];

export function buildVoiceStyleFromTweets(tweets: string[]): VoiceStyle {
  const cleaned = tweets.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleaned.length === 0) {
    return {
      tone: "conversational and direct",
      sentenceLength: "short",
      formatting: "plain sentences",
      emojiUse: "none",
      punctuation: "standard",
      readingLevel: "accessible",
      commonPhrases: [],
    };
  }

  const allText = cleaned.join(" ");
  const sentences = splitSentences(cleaned);
  const words = allText.split(/\s+/).filter(Boolean);
  const avgSentenceWords =
    sentences.length === 0 ? words.length : words.length / sentences.length;

  const emojiCount = (allText.match(EMOJI_RE) ?? []).length;
  const emojiPerTweet = emojiCount / cleaned.length;

  const exclamations = (allText.match(/!/g) ?? []).length;
  const questions = (allText.match(/\?/g) ?? []).length;
  const emDashes = (allText.match(/—|--/g) ?? []).length;
  const ellipses = (allText.match(/\.\.\./g) ?? []).length;

  const lineBreakTweets = cleaned.filter((t) => t.includes("\n")).length;
  const listTweets = cleaned.filter((t) => /^\s*(\d+[.)]|[-•])/m.test(t)).length;

  const avgWordLength =
    words.reduce((sum, w) => sum + w.replace(/[^A-Za-z]/g, "").length, 0) /
    Math.max(1, words.length);

  return {
    tone: inferTone(allText, exclamations, questions, cleaned.length),
    sentenceLength:
      avgSentenceWords < 9
        ? "short and punchy"
        : avgSentenceWords < 16
          ? "medium"
          : "long-form",
    formatting:
      listTweets / cleaned.length > 0.25
        ? "frequent lists and numbered points"
        : lineBreakTweets / cleaned.length > 0.4
          ? "line breaks between thoughts"
          : "plain sentences",
    emojiUse:
      emojiPerTweet === 0
        ? "none"
        : emojiPerTweet < 0.5
          ? "occasional"
          : "frequent",
    punctuation: describePunctuation(exclamations, emDashes, ellipses, cleaned.length),
    readingLevel: avgWordLength > 5.4 ? "technical" : "accessible",
    commonPhrases: topPhrases(cleaned),
  };
}

function splitSentences(texts: string[]): string[] {
  const sentences: string[] = [];
  for (const text of texts) {
    const parts = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0 && text.trim()) {
      sentences.push(text.trim());
    } else {
      sentences.push(...parts);
    }
  }
  return sentences;
}

function inferTone(
  text: string,
  exclamations: number,
  questions: number,
  tweetCount: number
): string {
  const lower = text.toLowerCase();
  const traits: string[] = [];
  if (/hot take|unpopular opinion|wrong|nobody|everyone is/.test(lower)) {
    traits.push("contrarian");
  }
  if (/\d+%|\$\d|\d+x\b|data|numbers/.test(lower)) traits.push("data-driven");
  if (questions / tweetCount > 0.5) traits.push("inquisitive");
  if (exclamations / tweetCount > 0.5) traits.push("enthusiastic");
  if (traits.length === 0) traits.push("conversational");
  return traits.slice(0, 2).join(", ") + " and direct";
}

function describePunctuation(
  exclamations: number,
  emDashes: number,
  ellipses: number,
  tweetCount: number
): string {
  const traits: string[] = [];
  if (emDashes / tweetCount > 0.2) traits.push("em dashes");
  if (ellipses / tweetCount > 0.2) traits.push("trailing ellipses");
  if (exclamations / tweetCount > 0.5) traits.push("exclamation-heavy");
  if (exclamations === 0) traits.push("no exclamation marks");
  return traits.length > 0 ? traits.join(", ") : "standard";
}

/** Most frequent 2-3 word phrases (very small n-gram counter). */
export function topPhrases(tweets: string[], max = 5): string[] {
  const counts = new Map<string, number>();
  for (const tweet of tweets) {
    const words = tweet
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const phrase = words.slice(i, i + n).join(" ");
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([phrase, count]) => count >= 3 && !isStopPhrase(phrase))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([phrase]) => phrase);
}

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "is", "it", "and", "or", "for",
  "at", "by", "be", "as", "this", "that", "was", "are", "with", "you", "your",
  "i", "my", "we", "our", "but", "not", "if", "so", "do", "did", "have", "has",
]);

function isStopPhrase(phrase: string): boolean {
  return phrase.split(" ").every((w) => STOP_WORDS.has(w));
}

/**
 * Fold a sent reply into a voice profile's example set. The text a user
 * actually approved and published is ground truth for their voice — newest
 * first, deduped (case/whitespace-insensitive), capped so the generation
 * prompt stays small and recent posts dominate.
 */
export const VOICE_EXAMPLES_CAP = 16;

export function mergeVoiceExamples(
  existing: string[],
  sentText: string,
  cap: number = VOICE_EXAMPLES_CAP
): string[] {
  const text = sentText.trim();
  if (text.length === 0) return existing.slice(0, cap);
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const seen = new Set([norm(text)]);
  const merged = [text];
  for (const example of existing) {
    const key = norm(example);
    if (example.trim().length === 0 || seen.has(key)) continue;
    seen.add(key);
    merged.push(example);
  }
  return merged.slice(0, cap);
}

export function selectVoiceExamplesForTarget(
  examples: string[],
  targetText: string,
  max: number = VOICE_PROMPT_EXAMPLES_MAX
): string[] {
  const cleaned = examples.map((e) => e.trim()).filter(Boolean);
  if (cleaned.length <= max) return cleaned;

  const scored = cleaned.map((example, index) => ({
    example,
    index,
    score: similarityScore(example, targetText),
  }));

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max)
    .map((entry) => entry.example);
}

function similarityScore(example: string, targetText: string): number {
  const exampleTokens = tokenizeForSimilarity(example);
  const targetTokens = tokenizeForSimilarity(targetText);
  if (exampleTokens.size === 0 || targetTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of exampleTokens) {
    if (targetTokens.has(token)) overlap++;
  }
  const union = new Set([...exampleTokens, ...targetTokens]).size;
  const jaccard = union === 0 ? 0 : overlap / union;

  const exampleLength = example.split(/\s+/).filter(Boolean).length;
  const targetLength = targetText.split(/\s+/).filter(Boolean).length;
  const lengthPenalty =
    Math.abs(exampleLength - targetLength) / Math.max(exampleLength, targetLength, 1);

  return jaccard * 2 + (1 - lengthPenalty) * 0.15;
}

function tokenizeForSimilarity(text: string): Set<string> {
  const words = text.toLowerCase().match(WORD_RE) ?? [];
  return new Set(
    words.filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

export function buildVoiceNegativeConstraints(
  examples: string[],
  style: VoiceStyle = buildVoiceStyleFromTweets(examples)
): VoiceNegativeConstraints {
  const allText = examples.join("\n");
  const lower = allText.toLowerCase();
  const bannedPhrases = STOCK_AI_OPENERS.filter(
    (phrase) => !lower.includes(phrase.toLowerCase())
  );
  if (style.emojiUse === "none") {
    bannedPhrases.push(...DEFAULT_EMOJI_BANS);
  }

  const antiPatterns: string[] = [];
  if (!HASHTAG_RE.test(allText)) {
    antiPatterns.push("Do not use hashtags.");
  }
  if (style.emojiUse === "none") {
    antiPatterns.push("Do not add emoji.");
  } else if (style.emojiUse === "occasional") {
    antiPatterns.push("Use emoji only if it feels natural; never stack emoji.");
  }
  if (!style.punctuation.includes("exclamation")) {
    antiPatterns.push("Do not add hype punctuation or multiple exclamation marks.");
  }
  antiPatterns.push(
    'Do not open with stock praise like "Great point" or "Love this" unless it appears in the examples.'
  );

  return normalizeNegativeConstraints({ bannedPhrases, antiPatterns });
}

export function normalizeNegativeConstraints(
  constraints: Partial<VoiceNegativeConstraints> | null | undefined
): VoiceNegativeConstraints {
  return {
    bannedPhrases: uniqueClean(constraints?.bannedPhrases ?? []),
    antiPatterns: uniqueClean(constraints?.antiPatterns ?? []),
  };
}

function uniqueClean(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = value.trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

export function applyVoiceLabelRefinement(
  measured: VoiceStyle,
  refinement: { tone?: string | null } | null | undefined
): VoiceStyle {
  const tone = refinement?.tone?.trim();
  if (!tone) return measured;
  return {
    ...measured,
    tone,
  };
}
