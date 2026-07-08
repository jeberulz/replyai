import { describe, expect, it } from "vitest";
import {
  applyVoiceLabelRefinement,
  buildVoiceNegativeConstraints,
  buildVoiceStyleFromTweets,
  mergeVoiceExamples,
  normalizeNegativeConstraints,
  selectVoiceExamplesForTarget,
  topPhrases,
  VOICE_EXAMPLES_CAP,
  VOICE_PROMPT_EXAMPLES_MAX,
} from "../shared/voice";

describe("buildVoiceStyleFromTweets", () => {
  it("returns sensible defaults for empty input", () => {
    const style = buildVoiceStyleFromTweets([]);
    expect(style.tone).toContain("conversational");
    expect(style.emojiUse).toBe("none");
    expect(style.commonPhrases).toEqual([]);
  });

  it("detects emoji-heavy writing", () => {
    const style = buildVoiceStyleFromTweets([
      "Shipped it 🚀🔥",
      "Big day 🎉",
      "Let's go 💪🚀",
    ]);
    expect(style.emojiUse).toBe("frequent");
  });

  it("detects short punchy sentences", () => {
    const style = buildVoiceStyleFromTweets([
      "Ship fast. Learn faster.",
      "Talk to users. Build less.",
    ]);
    expect(style.sentenceLength).toBe("short and punchy");
  });

  it("counts tweets without terminal punctuation as sentence boundaries", () => {
    const style = buildVoiceStyleFromTweets([
      "The first usable version starts by deleting everything users do not touch",
      "The second version adds the one workflow people repeat every morning",
      "The third version measures retention before the roadmap gets wider",
    ]);
    expect(style.sentenceLength).toBe("medium");
  });

  it("detects contrarian, data-driven tone", () => {
    const style = buildVoiceStyleFromTweets([
      "Hot take: everyone is wrong about this. The data says 73% churn.",
      "Unpopular opinion: your 10x metric is survivorship bias.",
    ]);
    expect(style.tone).toContain("contrarian");
  });

  it("surfaces repeated phrases", () => {
    const tweets = Array(4).fill("the real question is whether you shipped today");
    const style = buildVoiceStyleFromTweets(tweets);
    expect(style.commonPhrases.length).toBeGreaterThan(0);
  });
});

describe("selectVoiceExamplesForTarget", () => {
  it("selects the most relevant 10 examples by target similarity", () => {
    const examples = [
      "Pricing page copy is too clever again",
      "Billing emails need fewer words",
      "Support queue is quiet today",
      "Churn review moved to Friday",
      "Landing pages always rot without owners",
      "Invoices should explain themselves",
      "Scanner picked the right feed window today",
      "The feed scanner missed a high intent AI post",
      "Watch the reply window before writing anything",
      "High velocity reply windows decay fast after lunch",
      "The best reply angle is usually in the missing context",
      "Rank the author before drafting the reply",
      "Feed relevance beats generic generation",
      "Early reply windows compound when the author is still active",
      "Topic fit matters more than raw likes",
      "Conversation timing is the whole wedge",
    ];

    const selected = selectVoiceExamplesForTarget(
      examples,
      "The feed scanner should rank early reply windows by topic relevance and timing"
    );

    expect(selected).toHaveLength(VOICE_PROMPT_EXAMPLES_MAX);
    expect(selected).toContain("The feed scanner missed a high intent AI post");
    expect(selected).toContain("Scanner picked the right feed window today");
    expect(selected).toContain("Watch the reply window before writing anything");
    expect(selected).not.toContain("Pricing page copy is too clever again");
  });

  it("returns all examples when fewer than the prompt cap are available", () => {
    expect(selectVoiceExamplesForTarget(["one", "two"], "anything")).toEqual([
      "one",
      "two",
    ]);
  });
});

describe("voice negative constraints", () => {
  it("derives anti-patterns and banned phrases from measured voice", () => {
    const examples = [
      "Ship fast. Measure faster.",
      "Small launch today. No drama.",
    ];
    const constraints = buildVoiceNegativeConstraints(examples);

    expect(constraints.bannedPhrases).toContain("Great point!");
    expect(constraints.bannedPhrases).toContain("🚀");
    expect(constraints.antiPatterns).toContain("Do not use hashtags.");
    expect(constraints.antiPatterns).toContain("Do not add emoji.");
  });

  it("does not ban a stock phrase the user actually writes", () => {
    const constraints = buildVoiceNegativeConstraints([
      "Great point! The hard part is keeping the scanner focused.",
      "Great point! Discovery still beats generic drafting.",
    ]);
    expect(constraints.bannedPhrases).not.toContain("Great point!");
  });

  it("normalizes user-edited constraints", () => {
    expect(
      normalizeNegativeConstraints({
        bannedPhrases: ["Great point", " great point ", ""],
        antiPatterns: ["No hashtags", "no hashtags"],
      })
    ).toEqual({
      bannedPhrases: ["Great point"],
      antiPatterns: ["No hashtags"],
    });
  });
});

describe("applyVoiceLabelRefinement", () => {
  const measured = buildVoiceStyleFromTweets([
    "Ship the smallest useful version",
    "Then watch where it breaks",
  ]);

  it("keeps measured stats unchanged when no refined label exists", () => {
    expect(applyVoiceLabelRefinement(measured, null)).toEqual(measured);
  });

  it("updates only the tone label when refinement succeeds", () => {
    const refined = applyVoiceLabelRefinement(measured, {
      tone: "dry, pragmatic, and direct",
    });
    expect(refined).toEqual({
      ...measured,
      tone: "dry, pragmatic, and direct",
    });
  });
});

describe("topPhrases", () => {
  it("ignores pure stop-word phrases", () => {
    const phrases = topPhrases(Array(5).fill("this is the and of the"));
    expect(phrases).toEqual([]);
  });

  it("requires at least 3 occurrences", () => {
    const phrases = topPhrases(["ship fast daily", "ship fast daily"]);
    expect(phrases).toEqual([]);
  });
});

describe("mergeVoiceExamples", () => {
  it("prepends the sent text, newest first", () => {
    const merged = mergeVoiceExamples(["old one", "old two"], "fresh reply");
    expect(merged).toEqual(["fresh reply", "old one", "old two"]);
  });

  it("dedupes case- and whitespace-insensitively", () => {
    const merged = mergeVoiceExamples(
      ["Ship  it every  day", "another"],
      "ship it every day"
    );
    expect(merged).toEqual(["ship it every day", "another"]);
  });

  it("caps at VOICE_EXAMPLES_CAP, dropping the oldest", () => {
    const existing = Array.from({ length: 20 }, (_, i) => `post ${i}`);
    const merged = mergeVoiceExamples(existing, "newest");
    expect(merged).toHaveLength(VOICE_EXAMPLES_CAP);
    expect(merged[0]).toBe("newest");
    expect(merged).not.toContain("post 19");
  });

  it("ignores empty sent text but still applies the cap", () => {
    const existing = Array.from({ length: 20 }, (_, i) => `post ${i}`);
    expect(mergeVoiceExamples(existing, "   ")).toHaveLength(VOICE_EXAMPLES_CAP);
    expect(mergeVoiceExamples([], "")).toEqual([]);
  });
});
