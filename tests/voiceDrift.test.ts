import { describe, expect, it } from "vitest";
import { buildVoiceStyleFromTweets } from "../shared/voice";
import {
  applyDriftSelection,
  compareVoiceStyles,
  DEMO_DRIFT_EXAMPLES,
  DEMO_STORED_STYLE,
  demoVoiceDriftSuggestion,
  measureVoiceDrift,
  severityFromChangedCount,
} from "../shared/voiceDrift";

describe("severityFromChangedCount", () => {
  it("maps 0 → none, 1–2 → minor, 3+ → major", () => {
    expect(severityFromChangedCount(0)).toBe("none");
    expect(severityFromChangedCount(1)).toBe("minor");
    expect(severityFromChangedCount(2)).toBe("minor");
    expect(severityFromChangedCount(3)).toBe("major");
  });
});

describe("compareVoiceStyles", () => {
  it("reports no drift when styles match", () => {
    const style = buildVoiceStyleFromTweets([
      "Ship fast. Learn faster.",
      "Talk to users. Build less.",
    ]);
    const result = compareVoiceStyles({
      storedStyle: style,
      measuredStyle: { ...style },
      exampleTexts: ["Ship fast. Learn faster."],
    });
    expect(result.severity).toBe("none");
    expect(result.changedFieldCount).toBe(0);
    expect(result.fields.every((f) => !f.changed)).toBe(true);
    expect(result.summary.toLowerCase()).toContain("no meaningful");
  });

  it("reports minor drift for one or two field changes", () => {
    const stored = { ...DEMO_STORED_STYLE };
    const measured = {
      ...DEMO_STORED_STYLE,
      emojiUse: "frequent",
      punctuation: "exclamation-heavy",
    };
    const result = compareVoiceStyles({ storedStyle: stored, measuredStyle: measured });
    expect(result.severity).toBe("minor");
    expect(result.changedFieldCount).toBe(2);
    const emoji = result.fields.find((f) => f.field === "emojiUse");
    expect(emoji?.changed).toBe(true);
    expect(emoji?.before).toBe("none");
    expect(emoji?.after).toBe("frequent");
  });

  it("reports major drift when many fields and phrases shift", () => {
    const stored = { ...DEMO_STORED_STYLE };
    const measured = buildVoiceStyleFromTweets(DEMO_DRIFT_EXAMPLES);
    const result = compareVoiceStyles({
      storedStyle: stored,
      measuredStyle: measured,
      exampleTexts: DEMO_DRIFT_EXAMPLES,
    });
    expect(result.severity).toBe("major");
    expect(result.changedFieldCount).toBeGreaterThanOrEqual(3);
    expect(result.fields.some((f) => f.changed)).toBe(true);
  });
});

describe("measureVoiceDrift + demo fixtures", () => {
  it("measures from examples and diffs against stored style", () => {
    const result = measureVoiceDrift({
      storedStyle: DEMO_STORED_STYLE,
      examples: DEMO_DRIFT_EXAMPLES,
    });
    expect(result.exampleTexts.length).toBe(DEMO_DRIFT_EXAMPLES.length);
    expect(result.demo).toBe(false);
    expect(["minor", "major"]).toContain(result.severity);
  });

  it("demoVoiceDriftSuggestion is deterministic and marked demo", () => {
    const a = demoVoiceDriftSuggestion();
    const b = demoVoiceDriftSuggestion();
    expect(a.demo).toBe(true);
    expect(a.severity).toBe(b.severity);
    expect(a.changedFieldCount).toBe(b.changedFieldCount);
    expect(a.measuredStyle).toEqual(b.measuredStyle);
    expect(a.summary).toBe(b.summary);
  });
});

describe("applyDriftSelection", () => {
  it("applies only selected style fields", () => {
    const suggestion = demoVoiceDriftSuggestion();
    const { style } = applyDriftSelection({
      currentStyle: DEMO_STORED_STYLE,
      suggestion,
      selectedFields: ["tone", "sentenceLength"],
    });
    expect(style.tone).toBe(suggestion.measuredStyle.tone);
    expect(style.sentenceLength).toBe(suggestion.measuredStyle.sentenceLength);
    expect(style.emojiUse).toBe(DEMO_STORED_STYLE.emojiUse);
    expect(style.commonPhrases).toEqual(DEMO_STORED_STYLE.commonPhrases);
  });

  it("can apply examples when selected", () => {
    const suggestion = demoVoiceDriftSuggestion();
    const { examples } = applyDriftSelection({
      currentStyle: DEMO_STORED_STYLE,
      suggestion,
      selectedFields: ["examples"],
      currentExamples: ["old example"],
    });
    expect(examples).toEqual(suggestion.exampleTexts);
  });
});
