import { describe, expect, it } from "vitest";
import type { VoiceStyle } from "../shared/voice";
import {
  BANNED_PHRASES,
  failedRules,
  GENERATION_OPTION_COUNT,
  MAX_WEIGHTED_LENGTH,
  runGuardrailChecks,
  runVoiceFidelityCheck,
  voiceFidelity,
  VOICE_FIDELITY_THRESHOLD,
  weightedLength,
  type EvalOption,
  type GuardrailKind,
} from "../shared/evals";

// A clean, guardrail-passing reply set to mutate per test.
function goodReplyOptions(): EvalOption[] {
  return [
    { category: "short", content: "Same. Watched it fail first.", reason: "Terse agreement with a concrete point." },
    { category: "insightful", content: "Less code, less surface, fewer bugs.", reason: "Adds a second-order reason." },
    { category: "question", content: "What made you cut those lines?", reason: "A question invites a reply back." },
  ];
}

function check(options: unknown, kind: GuardrailKind = "reply") {
  return runGuardrailChecks(options, { kind });
}

describe("weightedLength", () => {
  it("counts plain ASCII as 1 each", () => {
    expect(weightedLength("hello")).toBe(5);
  });

  it("counts a URL as 23 regardless of real length", () => {
    // 6 chars "check " + one url worth 23
    expect(weightedLength("check https://example.com/a/very/long/path?q=1")).toBe(6 + 23);
  });

  it("counts emoji as 2", () => {
    expect(weightedLength("hi 🚀")).toBe(3 + 2); // "hi " = 3, rocket = 2
  });

  it("is deterministic and key-free", () => {
    const s = "a".repeat(281);
    expect(weightedLength(s)).toBe(281);
    expect(weightedLength(s) > MAX_WEIGHTED_LENGTH).toBe(true);
  });
});

describe("runGuardrailChecks — happy path", () => {
  it("passes a clean 3-option reply set", () => {
    const report = check(goodReplyOptions());
    expect(report.pass).toBe(true);
    expect(failedRules(report)).toEqual([]);
  });

  it("defaults expected count to the PRD guardrail (3)", () => {
    expect(GENERATION_OPTION_COUNT).toBe(3);
  });
});

describe("runGuardrailChecks — output shape", () => {
  it("fails and short-circuits on a malformed payload", () => {
    const report = check({ options: [{ category: "short" }] });
    expect(report.pass).toBe(false);
    expect(failedRules(report)).toEqual(["output-shape"]);
  });

  it("accepts a bare array as well as { options }", () => {
    expect(check(goodReplyOptions()).pass).toBe(true);
    expect(check({ options: goodReplyOptions() }).pass).toBe(true);
  });
});

describe("runGuardrailChecks — each rule in isolation", () => {
  it("option-count: too few", () => {
    const report = check(goodReplyOptions().slice(0, 2));
    expect(failedRules(report)).toEqual(["option-count"]);
  });

  it("option-count: too many", () => {
    const opts = goodReplyOptions();
    opts.push({ category: "friendly", content: "Nice one.", reason: "Warm, low-stakes agreement." });
    expect(failedRules(check(opts))).toEqual(["option-count"]);
  });

  it("distinct-categories: duplicate category", () => {
    const opts = goodReplyOptions();
    opts[1].category = "short";
    expect(failedRules(check(opts))).toEqual(["distinct-categories"]);
  });

  it("valid-categories: unknown category for kind", () => {
    const opts = goodReplyOptions();
    opts[1].category = "spicy-take";
    expect(failedRules(check(opts))).toEqual(["valid-categories"]);
  });

  it("valid-categories: a quote category is invalid for a reply", () => {
    const opts = goodReplyOptions();
    opts[1].category = "contrarian"; // valid quote category, not a reply one
    expect(failedRules(check(opts, "reply"))).toEqual(["valid-categories"]);
  });

  it("reason-present: empty / too-short reason", () => {
    const opts = goodReplyOptions();
    opts[2].reason = "ok";
    expect(failedRules(check(opts))).toEqual(["reason-present"]);
  });

  it("weighted-length: over budget", () => {
    const opts = goodReplyOptions();
    opts[1].content = "x".repeat(MAX_WEIGHTED_LENGTH + 1);
    expect(failedRules(check(opts))).toEqual(["weighted-length"]);
  });

  it("no-banned-phrases: engagement bait", () => {
    const opts = goodReplyOptions();
    opts[0].content = "Great — like and retweet if you agree.";
    expect(failedRules(check(opts))).toEqual(["no-banned-phrases"]);
  });

  it("no-fake-scores: percentage engagement claim in reason", () => {
    const opts = goodReplyOptions();
    opts[0].reason = "This gets 92% engagement.";
    expect(failedRules(check(opts))).toEqual(["no-fake-scores"]);
  });

  it("no-fake-scores: multiplier reach claim in content", () => {
    const opts = goodReplyOptions();
    opts[0].content = "This will get 5x reach, trust me.";
    expect(failedRules(check(opts))).toEqual(["no-fake-scores"]);
  });
});

describe("runGuardrailChecks — quote kind categories", () => {
  it("accepts valid quote categories", () => {
    const opts: EvalOption[] = [
      { category: "contrarian", content: "The opposite is closer to true.", reason: "Takes the unclaimed angle." },
      { category: "educational", content: "Here's the mechanism behind it.", reason: "Teaches the why." },
      { category: "prediction", content: "This becomes the norm by 2027.", reason: "Invites a debate." },
    ];
    expect(check(opts, "quote").pass).toBe(true);
  });
});

describe("BANNED_PHRASES", () => {
  it("each listed phrase is actually caught", () => {
    for (const phrase of BANNED_PHRASES) {
      const opts = goodReplyOptions();
      opts[0].content = `Prefix ${phrase} suffix`;
      expect(failedRules(check(opts)), phrase).toContain("no-banned-phrases");
    }
  });
});

describe("voiceFidelity", () => {
  const terse: VoiceStyle = {
    tone: "conversational and direct",
    sentenceLength: "short and punchy",
    formatting: "plain sentences",
    emojiUse: "none",
    punctuation: "no exclamation marks",
    readingLevel: "accessible",
    commonPhrases: [],
  };

  it("scores an on-voice line at or near 1", () => {
    expect(voiceFidelity("Ship it. Watch it fail first.", terse)).toBeGreaterThanOrEqual(
      VOICE_FIDELITY_THRESHOLD
    );
  });

  it("scores an off-voice line below threshold", () => {
    const off =
      "This is absolutely phenomenal and profoundly staggering 🚀🙌 the ramifications are genuinely incredible!!!";
    expect(voiceFidelity(off, terse)).toBeLessThan(VOICE_FIDELITY_THRESHOLD);
  });

  it("returns a value in [0, 1]", () => {
    const s = voiceFidelity("anything at all here", terse);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("runVoiceFidelityCheck reports ok against the threshold", () => {
    const res = runVoiceFidelityCheck("Ship it. Watch it fail first.", terse);
    expect(res.threshold).toBe(VOICE_FIDELITY_THRESHOLD);
    expect(res.ok).toBe(res.score >= res.threshold);
  });
});
