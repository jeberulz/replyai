"use node";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "./_generated/server";
import { captureConvexException } from "./lib/sentry";
import {
  demoSemanticRelevance,
  SEMANTIC_HAIKU_MODEL,
  type NicheContext,
  type SemanticScore,
} from "../shared/semanticRelevance";

const nicheContextValidator = v.object({
  keywords: v.array(v.string()),
  voiceTopics: v.array(v.string()),
  recentTopics: v.array(v.string()),
});

const ClassifyBatchSchema = z.object({
  results: z.array(
    z.object({
      tweetId: z.string(),
      relevance: z
        .number()
        .min(0)
        .max(1)
        .describe("0-1 niche fit for this user; 0 for politics/news tangents"),
      reason: z
        .string()
        .describe("One short internal phrase, not shown verbatim to user"),
    })
  ),
});

function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function buildClassifierPrompt(
  niche: NicheContext,
  tweets: { tweetId: string; text: string }[]
): string {
  const nicheBlock = [
    niche.keywords.length > 0
      ? `Focus keywords: ${niche.keywords.join(", ")}`
      : null,
    niche.recentTopics.length > 0
      ? `Recent analysis topics: ${niche.recentTopics.join("; ")}`
      : null,
    niche.voiceTopics.length > 0
      ? `Voice / interest signals: ${niche.voiceTopics.slice(0, 12).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const tweetBlock = tweets
    .map((t, i) => `[${i + 1}] id=${t.tweetId}\n"""${t.text}"""`)
    .join("\n\n");

  return `Score each tweet for niche relevance to this user's interests (0 = off-topic or political news, 1 = perfect fit). Catch paraphrases — exact keyword overlap is NOT required.

USER NICHE:
${nicheBlock || "(general tech/builder audience)"}

TWEETS:
${tweetBlock}

Return one result per tweet id. Political campaign content, partisan news, and culture-war posts must score 0.`;
}

async function classifyWithHaiku(
  niche: NicheContext,
  tweets: { tweetId: string; text: string }[]
): Promise<Record<string, SemanticScore>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = process.env.ANTHROPIC_SEMANTIC_MODEL ?? SEMANTIC_HAIKU_MODEL;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system:
      "You classify X posts for niche relevance. Output structured JSON only. Be conservative on politics.",
    messages: [{ role: "user", content: buildClassifierPrompt(niche, tweets) }],
    output_config: { format: zodOutputFormat(ClassifyBatchSchema) },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Empty classifier response");
  }

  const parsed = ClassifyBatchSchema.parse(JSON.parse(block.text));
  const out: Record<string, SemanticScore> = {};
  for (const row of parsed.results) {
    out[row.tweetId] = {
      relevance: row.relevance,
      reason: row.reason,
    };
  }
  return out;
}

/** Cheap Haiku batch classifier for feed-scanner niche fit. Demo when no API key. */
export const classifyBatch = internalAction({
  args: {
    isDemo: v.boolean(),
    nicheContext: nicheContextValidator,
    tweets: v.array(v.object({ tweetId: v.string(), text: v.string() })),
  },
  handler: async (_ctx, { isDemo, nicheContext, tweets }) => {
    if (tweets.length === 0) return {};

    if (isDemo || !hasAnthropicKey()) {
      const out: Record<string, SemanticScore> = {};
      for (const t of tweets) {
        out[t.tweetId] = demoSemanticRelevance(t.text, nicheContext);
      }
      return out;
    }

    try {
      return await classifyWithHaiku(nicheContext, tweets);
    } catch (error) {
      console.error("semantic classifyBatch failed, falling back to demo", error);
      await captureConvexException(error, {
        action: "semanticClassifyBatch",
        tweetCount: tweets.length,
      });
      const out: Record<string, SemanticScore> = {};
      for (const t of tweets) {
        out[t.tweetId] = demoSemanticRelevance(t.text, nicheContext);
      }
      return out;
    }
  },
});
