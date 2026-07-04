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

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

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
  const sentences = allText
    .split(/[.!?]+\s/)
    .map((s) => s.trim())
    .filter(Boolean);
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
