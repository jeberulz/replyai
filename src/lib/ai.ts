import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env, hasAnthropicKey } from "./env";
import type { TweetBundle } from "./x";
import type { VoiceStyle } from "../../shared/voice";
import {
  goalCategoryBias,
  goalGenerationLean,
  QUOTE_CATEGORIES,
  REPLY_CATEGORIES,
  type GoalId,
} from "../../shared/onboarding";

let anthropic: Anthropic | null = null;
function client(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
  return anthropic;
}

export type Usage = { tokensIn: number; tokensOut: number };

// Generation categories live in shared/onboarding.ts (goal biases are
// validated against them); re-exported here for existing importers.
export { QUOTE_CATEGORIES, REPLY_CATEGORIES };

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
    model: env.anthropicAnalyzeModel,
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
  /** The user's onboarding goal — leans tone and category choice. */
  goal?: GoalId | null;
  count?: number;
  avoidContents?: string[];
  /** Claude model override; falls back to ANTHROPIC_GENERATE_MODEL. */
  model?: string;
}): Promise<{ options: GeneratedOption[]; usage: Usage }> {
  const count = args.count ?? 3;
  if (!hasAnthropicKey()) {
    return {
      options: demoOptions(args.kind, args.bundle, args.analysis, count, args.voice, args.goal),
      usage: { tokensIn: 0, tokensOut: 0 },
    };
  }

  const categories = args.kind === "quote" ? QUOTE_CATEGORIES : REPLY_CATEGORIES;
  const lean = goalGenerationLean(args.goal);
  const bias = goalCategoryBias(args.goal, args.kind);
  const goalBlock = lean
    ? `\n${lean}${bias.length > 0 ? ` When they fit this conversation, prefer the ${bias.join(", ")} categories.` : ""}\n`
    : "";
  const avoid =
    args.avoidContents && args.avoidContents.length > 0
      ? `\nAlready generated (produce clearly different options):\n${args.avoidContents
          .map((c) => `- ${c}`)
          .join("\n")}`
      : "";

  const response = await client().messages.parse({
    model: args.model ?? env.anthropicGenerateModel,
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
${goalBlock}
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
  /** Claude model override; falls back to ANTHROPIC_GENERATE_MODEL. */
  model?: string;
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
    model: args.model ?? env.anthropicGenerateModel,
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
// Model eval judge
// ---------------------------------------------------------------------------

export type JudgeCandidate = {
  model: string;
  options: GeneratedOption[];
};

export type JudgeVerdict = {
  scores: { model: string; score: number; notes: string }[];
  winnerModel: string;
  summary: string;
};

const VerdictSchema = z.object({
  scores: z.array(
    z.object({
      model: z.string().describe("The candidate's model id, exactly as given"),
      score: z
        .number()
        .describe("0-100 overall quality of this candidate's option set"),
      notes: z
        .string()
        .describe("One or two sentences on strengths/weaknesses"),
    })
  ),
  winnerModel: z.string().describe("Model id of the best candidate set"),
  summary: z
    .string()
    .describe(
      "2-3 sentences comparing the sets and advising which model to use, weighing quality against cost tier"
    ),
});

/**
 * Judge N candidate option sets (one per model) against the same tweet and
 * voice. The judge runs on the analyze-tier model (strongest by default) and
 * scores voice match, specificity, and non-genericness — not engagement
 * predictions.
 */
export async function judgeModelEval(args: {
  bundle: TweetBundle;
  analysis: Analysis;
  voice: VoiceStyle | null;
  voiceExamples: string[];
  candidates: JudgeCandidate[];
}): Promise<{ verdict: JudgeVerdict; usage: Usage; judgeModel: string }> {
  const judgeModel = env.anthropicAnalyzeModel;
  if (!hasAnthropicKey()) {
    return {
      verdict: demoVerdict(args.candidates),
      usage: { tokensIn: 0, tokensOut: 0 },
      judgeModel: "demo",
    };
  }

  // Blind the judge: candidates are labeled A/B/C, model ids mapped back after.
  const labels = args.candidates.map(
    (c, i) => [String.fromCharCode(65 + i), c] as const
  );
  const candidateBlock = labels
    .map(
      ([label, c]) =>
        `CANDIDATE ${label}:\n${c.options
          .map((o, i) => `${i + 1}. [${o.category}] ${o.content}`)
          .join("\n")}`
    )
    .join("\n\n");

  const response = await client().messages.parse({
    model: judgeModel,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: ANALYST_SYSTEM },
      tweetContextBlock(args.bundle),
    ],
    messages: [
      {
        role: "user",
        content: `You are judging ${labels.length} candidate sets of replies to the tweet above. Each set was generated by a different (hidden) model against the same instructions.

${voiceInstructions(args.voice, args.voiceExamples)}

Missing angles the replies were asked to take: ${args.analysis.missingAngles.join(" | ")}

Score each candidate set 0-100 on: (1) voice match — does it sound like this specific person, (2) specificity — concrete, grounded in this conversation, not generic engagement-bait, (3) angle quality — does it take one of the missing angles or add something genuinely new. Use the candidate label (A, B, C…) as the "model" field.

${candidateBlock}`,
      },
    ],
    output_config: { format: zodOutputFormat(VerdictSchema) },
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Judge parsing failed");

  // Map blind labels back to model ids.
  const byLabel = new Map(labels.map(([label, c]) => [label, c.model]));
  const unblind = (label: string) => byLabel.get(label.trim().toUpperCase()) ?? label;
  const verdict: JudgeVerdict = {
    scores: parsed.scores.map((s) => ({ ...s, model: unblind(s.model) })),
    winnerModel: unblind(parsed.winnerModel),
    summary: parsed.summary,
  };
  return {
    verdict,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    },
    judgeModel,
  };
}

function demoVerdict(candidates: JudgeCandidate[]): JudgeVerdict {
  // Deterministic demo: rank by catalog order (first candidate = strongest).
  const scores = candidates.map((c, i) => ({
    model: c.model,
    score: 90 - i * 7,
    notes:
      i === 0
        ? "Sharpest angles and closest voice match in this comparison."
        : "Solid options; slightly more generic phrasing than the leader.",
  }));
  return {
    scores,
    winnerModel: candidates[0]?.model ?? "",
    summary:
      "Demo judge: with an ANTHROPIC_API_KEY set, a stronger model blind-scores each candidate set on voice match, specificity, and angle quality.",
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
  voice: VoiceStyle | null,
  goal?: GoalId | null
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
  // Deterministic goal bias: options in the goal's preferred categories
  // surface first, mirroring the real model's category preference.
  const bias = goalCategoryBias(goal, kind);
  const ordered =
    bias.length > 0
      ? [...all].sort(
          (a, b) => Number(bias.includes(b.category)) - Number(bias.includes(a.category))
        )
      : all;
  return ordered.slice(0, count);
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
