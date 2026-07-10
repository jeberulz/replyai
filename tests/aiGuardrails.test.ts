import { describe, expect, it } from "vitest";
import {
  buildRewritePrompt,
  buildVoiceInstructions,
  enforceGeneratedOptionGuardrails,
  refineVoiceStyleLabels,
  type GeneratedOption,
} from "../src/lib/ai";
import { MAX_WEIGHTED_LENGTH } from "../shared/evals";
import type { VoiceStyle } from "../shared/voice";
import type { TweetBundle } from "../src/lib/x";

function goodOptions(): GeneratedOption[] {
  return [
    {
      category: "short",
      content: "Ship it. Watch what breaks.",
      reason: "Direct and grounded in the thread.",
    },
    {
      category: "insightful",
      content: "The hidden cost is maintenance, not the first build.",
      reason: "Adds a concrete second-order angle.",
    },
    {
      category: "question",
      content: "Where did this start to fail in practice?",
      reason: "Invites the author into specifics.",
    },
  ];
}

describe("enforceGeneratedOptionGuardrails", () => {
  it("normalizes valid category casing and whitespace", () => {
    const opts = goodOptions();
    opts[0].category = " Short ";

    expect(
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })[0].category
    ).toBe("short");
  });

  it("rejects duplicate categories post-parse", () => {
    const opts = goodOptions();
    opts[1].category = "short";

    expect(() =>
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })
    ).toThrow(/repeats category/);
  });

  it("rejects categories outside the requested kind", () => {
    const opts = goodOptions();
    opts[1].category = "contrarian";

    expect(() =>
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })
    ).toThrow(/invalid category/);
  });

  it("rejects target-author identity confusion", () => {
    const opts = goodOptions();
    opts[0].content = "This is exactly what I meant in my own tweet.";

    expect(() =>
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })
    ).toThrow(/ownership/);
  });

  it("rejects reasons that confuse user voice with target-author voice", () => {
    const opts = goodOptions();
    opts[1].reason = "Matches the target author's voice perfectly.";

    expect(() =>
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })
    ).toThrow(/target author's voice/);
  });

  it("rejects content over X's weighted character budget", () => {
    const opts = goodOptions();
    opts[1].content = "x".repeat(MAX_WEIGHTED_LENGTH + 1);

    expect(() =>
      enforceGeneratedOptionGuardrails({
        kind: "reply",
        count: 3,
        options: opts,
      })
    ).toThrow(/weighted chars/);
  });
});

const terseVoice: VoiceStyle = {
  tone: "pragmatic and direct",
  sentenceLength: "short and punchy",
  formatting: "plain sentences",
  emojiUse: "none",
  punctuation: "no exclamation marks",
  readingLevel: "accessible",
  commonPhrases: ["ship it"],
};

const bundle: TweetBundle = {
  tweetId: "target-1",
  authorName: "Synthetic Founder",
  authorHandle: "founder",
  authorFollowers: 12000,
  authorBio: "building in public",
  text: "The feed scanner should rank early reply windows by topic relevance and timing.",
  postedAt: 0,
  likes: 12,
  retweets: 2,
  replies: 4,
  quotes: 1,
  topReplies: [],
  threadAncestors: [],
  isDemoData: true,
};

const examples = [
  "Billing copy should explain the invoice before the user asks",
  "Pricing pages rot when nobody owns the promise",
  "Feed relevance beats generic generation every time",
  "Watch the reply window before writing anything",
  "The best reply angle is usually in the missing context",
  "Rank the author before drafting the reply",
  "Scanner picked the right feed window today",
  "The feed scanner missed a high intent AI post",
  "High velocity reply windows decay fast after lunch",
  "Topic fit matters more than raw likes",
  "Early reply windows compound while the author is still active",
  "Conversation timing is the whole wedge",
];

describe("voice prompt building", () => {
  it("uses similarity-selected prompt examples and user negative constraints", () => {
    const prompt = buildVoiceInstructions({
      voice: terseVoice,
      examples,
      targetText: bundle.text,
      negativeConstraints: {
        bannedPhrases: ["Great point!", "🚀"],
        antiPatterns: ["Do not use hashtags.", "Do not add emoji."],
      },
    });

    const exampleBlock = prompt.split("Negative voice constraints:")[0] ?? "";
    const exampleLines = exampleBlock
      .split("\n")
      .filter((line) => line.startsWith("- ") && examples.some((e) => line.includes(e)));

    expect(exampleLines).toHaveLength(10);
    expect(prompt).toContain("The feed scanner missed a high intent AI post");
    expect(prompt).toContain("Watch the reply window before writing anything");
    expect(prompt).not.toContain("Billing copy should explain the invoice");
    expect(prompt).toContain("Great point!");
    expect(prompt).toContain("🚀");
    expect(prompt).toContain("Do not use hashtags.");
    expect(prompt).toContain("Do not add emoji.");
  });

  it("builds rewrite prompts from the full voice block", () => {
    const prompt = buildRewritePrompt({
      text: "Mostly agree, but timing changes the whole answer.",
      direction: "shorter",
      bundle,
      voice: terseVoice,
      voiceExamples: examples,
      voiceNegativeConstraints: {
        bannedPhrases: ["Great point!"],
        antiPatterns: ["Do not add emoji."],
      },
    });

    expect(prompt).toContain("Write in this person's voice:");
    expect(prompt).toContain("Examples of how this person writes:");
    expect(prompt).toContain("The feed scanner missed a high intent AI post");
    expect(prompt).toContain("Negative voice constraints:");
    expect(prompt).toContain("Great point!");
    expect(prompt).toContain("Do not add emoji.");
    expect(prompt).toContain("Rewrite this draft reply to be shorter");
  });
});

describe("refineVoiceStyleLabels", () => {
  it("falls back to measured stats without an Anthropic key", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await refineVoiceStyleLabels({
        style: terseVoice,
        examples: ["Ship it. Watch it break first."],
      });
      expect(result.style).toEqual(terseVoice);
      expect(result.usage).toEqual({ tokensIn: 0, tokensOut: 0 });
    } finally {
      if (originalKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });
});
