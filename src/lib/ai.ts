import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env, hasAnthropicKey } from "./env";
import type { TweetBundle } from "./x";
import type { VoiceStyle } from "../../shared/voice";

let anthropic: Anthropic | null = null;
function client(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
  return anthropic;
}

export type Usage = { tokensIn: number; tokensOut: number };

export const QUOTE_CATEGORIES = [
  "contrarian",
  "educational",
  "story",
  "founder",
  "ux",
  "humorous",
  "prediction",
  "question",
  "data-driven",
] as const;

export const REPLY_CATEGORIES = [
  "short",
  "insightful",
  "debate",
  "friendly",
  "question",
  "agreement-plus",
] as const;

export const REWRITE_DIRECTIONS = [
  "shorter",
  "funnier",
  "more controversial",
  "more educational",
  "stronger hook",
  "simpler",
  "more human",
] as const;
export type RewriteDirection = (typeof REWRITE_DIRECTIONS)[number];

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

const ANALYST_SYSTEM = `You are ReplyPilot, an expert analyst of X (Twitter) conversations. You help founders and builders decide which conversations are worth joining and what angle no one else has taken. Be specific and concrete; never pad with generic observations.`;

/**
 * Shared tweet-context system block. Marked with cache_control so repeated
 * calls about the same tweet (analyze → generate replies → generate quotes →
 * rewrite) reuse the cached prefix.
 */
function tweetContextBlock(bundle: TweetBundle): Anthropic.TextBlockParam {
  const replies = bundle.topReplies
    .map((r) => `- @${r.authorHandle} (${r.likes} likes): ${r.text}`)
    .join("\n");
  return {
    type: "text",
    text: `TWEET UNDER ANALYSIS
Author: ${bundle.authorName} (@${bundle.authorHandle}) — ${bundle.authorFollowers.toLocaleString()} followers
Bio: ${bundle.authorBio ?? "n/a"}
Engagement: ${bundle.likes} likes, ${bundle.retweets} retweets, ${bundle.replies} replies, ${bundle.quotes} quotes${bundle.views ? `, ${bundle.views} views` : ""}

Tweet text:
"""
${bundle.text}
"""
${bundle.mediaText ? `\nText from attached images:\n${bundle.mediaText}\n` : ""}
Top existing replies:
${replies || "(none visible)"}`,
    cache_control: { type: "ephemeral" },
  };
}

function voiceInstructions(voice: VoiceStyle | null, examples: string[]): string {
  if (!voice) {
    return "Voice: natural, direct, conversational. No hashtags, no rocket emojis, no engagement-bait.";
  }
  const exampleBlock =
    examples.length > 0
      ? `\nExamples of how this person writes:\n${examples
          .slice(0, 5)
          .map((e) => `- ${e}`)
          .join("\n")}`
      : "";
  return `Write in this person's voice:
- Tone: ${voice.tone}
- Sentence length: ${voice.sentenceLength}
- Formatting: ${voice.formatting}
- Emoji use: ${voice.emojiUse}
- Punctuation habits: ${voice.punctuation}
- Reading level: ${voice.readingLevel}
${voice.commonPhrases.length > 0 ? `- Phrases they naturally use: ${voice.commonPhrases.join("; ")}` : ""}${exampleBlock}`;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

const AnalysisSchema = z.object({
  summary: z
    .string()
    .describe("2-3 sentences: what the tweet says and why it's getting traction"),
  topic: z.string().describe("The topic in a few words, e.g. 'AI startup moats'"),
  stance: z
    .string()
    .describe("The author's position or intent in one sentence"),
  existingOpinions: z
    .array(z.string())
    .describe("Distinct opinions already present in the replies, 2-5 items"),
  missingAngles: z
    .array(z.string())
    .describe(
      "3-5 specific angles nobody in the conversation has taken yet — these are the openings worth replying with"
    ),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export async function analyzeTweet(
  bundle: TweetBundle
): Promise<{ analysis: Analysis; usage: Usage }> {
  if (!hasAnthropicKey()) {
    return { analysis: demoAnalysis(bundle), usage: { tokensIn: 0, tokensOut: 0 } };
  }
  const response = await client().messages.parse({
    model: env.anthropicModel,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: ANALYST_SYSTEM },
      tweetContextBlock(bundle),
    ],
    messages: [
      {
        role: "user",
        content:
          "Analyze this conversation: summarize it, identify the author's stance, list the opinions already voiced in replies, and — most importantly — find the missing angles no one has taken.",
      },
    ],
    output_config: { format: zodOutputFormat(AnalysisSchema) },
  });
  const analysis = response.parsed_output;
  if (!analysis) throw new Error("Analysis parsing failed");
  return {
    analysis,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

const OptionsSchema = z.object({
  options: z.array(
    z.object({
      category: z.string().describe("One of the requested categories"),
      content: z
        .string()
        .describe("The reply/quote text, ready to post, under 280 characters"),
      reason: z
        .string()
        .describe(
          "One short sentence on why this option is worth sending — grounded in the conversation, no fake metrics"
        ),
    })
  ),
});

export type GeneratedOption = {
  category: string;
  content: string;
  reason: string;
};

export async function generateOptions(args: {
  kind: "reply" | "quote";
  bundle: TweetBundle;
  analysis: Analysis;
  voice: VoiceStyle | null;
  voiceExamples: string[];
  count?: number;
  avoidContents?: string[];
}): Promise<{ options: GeneratedOption[]; usage: Usage }> {
  const count = args.count ?? 3;
  if (!hasAnthropicKey()) {
    return {
      options: demoOptions(args.kind, args.bundle, args.analysis, count, args.voice),
      usage: { tokensIn: 0, tokensOut: 0 },
    };
  }

  const categories = args.kind === "quote" ? QUOTE_CATEGORIES : REPLY_CATEGORIES;
  const avoid =
    args.avoidContents && args.avoidContents.length > 0
      ? `\nAlready generated (produce clearly different options):\n${args.avoidContents
          .map((c) => `- ${c}`)
          .join("\n")}`
      : "";

  const response = await client().messages.parse({
    model: env.anthropicModel,
    max_tokens: 2048,
    system: [
      { type: "text", text: ANALYST_SYSTEM },
      tweetContextBlock(args.bundle),
    ],
    messages: [
      {
        role: "user",
        content: `Conversation analysis:
- Topic: ${args.analysis.topic}
- Author stance: ${args.analysis.stance}
- Missing angles: ${args.analysis.missingAngles.join(" | ")}

${voiceInstructions(args.voice, args.voiceExamples)}

Generate exactly ${count} ${args.kind === "quote" ? "quote tweets" : "replies"}, each from a different category (choose the ${count} best-fitting from: ${categories.join(", ")}). Each must take one of the missing angles or add something genuinely new — never restate what the top replies already said. Keep each under 280 characters. No hashtags unless this person's voice uses them.${avoid}`,
      },
    ],
    output_config: { format: zodOutputFormat(OptionsSchema) },
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Generation parsing failed");
  return {
    options: parsed.options.slice(0, count),
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------

export async function rewriteText(args: {
  text: string;
  direction: RewriteDirection;
  bundle: TweetBundle;
  voice: VoiceStyle | null;
}): Promise<{ text: string; usage: Usage }> {
  if (!hasAnthropicKey()) {
    return {
      text: demoRewrite(args.text, args.direction),
      usage: { tokensIn: 0, tokensOut: 0 },
    };
  }
  const RewriteSchema = z.object({
    text: z.string().describe("The rewritten reply, under 280 characters"),
  });
  const response = await client().messages.parse({
    model: env.anthropicModel,
    max_tokens: 1024,
    system: [
      { type: "text", text: ANALYST_SYSTEM },
      tweetContextBlock(args.bundle),
    ],
    messages: [
      {
        role: "user",
        content: `Rewrite this draft reply to be ${args.direction}, keeping the core point and the author's voice${
          args.voice ? ` (tone: ${args.voice.tone})` : ""
        }. Under 280 characters.\n\nDraft:\n"""${args.text}"""`,
      },
    ],
    output_config: { format: zodOutputFormat(RewriteSchema) },
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Rewrite parsing failed");
  return {
    text: parsed.text,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Demo-mode fallbacks (no ANTHROPIC_API_KEY). Deterministic templates so the
// full product flow is testable before keys are configured.
// ---------------------------------------------------------------------------

function demoAnalysis(bundle: TweetBundle): Analysis {
  const firstSentence = bundle.text.split(/(?<=[.!?])\s/)[0];
  return {
    summary: `${bundle.authorName} argues: "${firstSentence}" The tweet is drawing ${bundle.replies} replies because it states a strong position most people have an opinion on.`,
    topic: firstSentence.slice(0, 60),
    stance: `The author takes a confident, declarative position and expects pushback.`,
    existingOpinions: bundle.topReplies.map(
      (r) => `@${r.authorHandle}: ${r.text.slice(0, 80)}`
    ),
    missingAngles: [
      "A concrete first-person example that tests the claim against real numbers",
      "The second-order consequence nobody has raised yet",
      "The exception case: when the opposite of this claim is true",
      "A question that reframes the debate instead of picking a side",
    ],
  };
}

function demoOptions(
  kind: "reply" | "quote",
  bundle: TweetBundle,
  analysis: Analysis,
  count: number,
  voice: VoiceStyle | null
): GeneratedOption[] {
  const topic = analysis.topic.replace(/[."]+$/, "").toLowerCase();
  const emoji = voice?.emojiUse === "frequent" ? " 👇" : "";
  const all: GeneratedOption[] =
    kind === "reply"
      ? [
          {
            category: "insightful",
            content: `The overlooked part: this only holds until the constraint moves. We hit exactly this six months in — what changed everything was measuring it weekly instead of debating it.`,
            reason: "Adds a first-person data point to a thread that's mostly abstract takes.",
          },
          {
            category: "debate",
            content: `Mostly agree, but the exception matters: when distribution is already solved, the opposite is true. The teams winning right now are proof.`,
            reason: "A measured counterpoint — the obvious agreements are already taken.",
          },
          {
            category: "question",
            content: `Genuine question: at what point did you notice this flip? Everyone cites the end state, nobody talks about the transition${emoji}`,
            reason: "Questions to the author often get a reply back, which boosts visibility.",
          },
        ]
      : [
          {
            category: "contrarian",
            content: `Everyone's nodding along with this, but the uncomfortable version is: most teams claiming ${topic} are describing survivorship bias.`,
            reason: "Contrarian quote tweets stand out when the replies are uniform agreement.",
          },
          {
            category: "story",
            content: `We lived this. Took us two quarters and one painful rewrite to learn what this thread says in one tweet.`,
            reason: "A short story makes the abstract claim concrete and personal.",
          },
          {
            category: "prediction",
            content: `Bookmark this one. In 12 months this take goes from contrarian to consensus — the early signs are already visible.`,
            reason: "Predictions invite quote-tweet debates and age into proof-of-judgment.",
          },
        ];
  return all.slice(0, count);
}

function demoRewrite(text: string, direction: RewriteDirection): string {
  switch (direction) {
    case "shorter": {
      const sentences = text.split(/(?<=[.!?])\s/);
      return sentences.slice(0, Math.max(1, sentences.length - 1)).join(" ");
    }
    case "funnier":
      return `${text} (narrator: it was not, in fact, that simple)`;
    case "more controversial":
      return `Unpopular opinion: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    case "more educational":
      return `${text}\n\nThe mechanism: incentives drive behavior, and this changes the incentives.`;
    case "stronger hook":
      return `Nobody wants to hear this: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    case "simpler":
      return text.replace(/—/g, ",").replace(/;\s/g, ". ");
    case "more human":
      return `Honestly? ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }
}
