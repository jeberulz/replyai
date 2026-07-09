import { describe, expect, it } from "vitest";
import {
  assessDuplicateReplyRisk,
  normalizeReplyText,
  repliesAreNearDuplicate,
} from "../shared/duplicateReply";

describe("duplicateReply", () => {
  it("normalizes whitespace, case, and urls", () => {
    expect(normalizeReplyText("  Hello   WORLD https://x.com/a  ")).toBe(
      "hello world"
    );
  });

  it("detects near duplicates with minor edits", () => {
    expect(
      repliesAreNearDuplicate(
        "Totally agree — the hard part is shipping, not ideating.",
        "Totally agree, the hard part is shipping not ideating"
      )
    ).toBe(true);
  });

  it("ignores clearly different replies", () => {
    expect(
      repliesAreNearDuplicate(
        "The wedge is timing, not generation quality.",
        "I would focus on distribution before rewriting prompts."
      )
    ).toBe(false);
  });

  it("warns on a similar recent reply", () => {
    const now = Date.now();
    const assessment = assessDuplicateReplyRisk({
      candidateText: "Same take as before — ship the smallest useful loop.",
      nowMs: now,
      recentPublished: [
        {
          text: "Same take as before: ship the smallest useful loop.",
          publishedAt: now - 30 * 60 * 1000,
        },
      ],
    });
    expect(assessment.level).toBe("similar");
  });

  it("escalates when a pattern repeats", () => {
    const now = Date.now();
    const base = "Quick bump — this is the part most teams skip.";
    const assessment = assessDuplicateReplyRisk({
      candidateText: base,
      nowMs: now,
      recentPublished: [0, 1, 2].map((i) => ({
        text: `${base} (${i})`,
        publishedAt: now - (i + 1) * 20 * 60 * 1000,
      })),
    });
    expect(assessment.level).toBe("pattern");
    expect(assessment.similarCount).toBeGreaterThanOrEqual(3);
  });
});
