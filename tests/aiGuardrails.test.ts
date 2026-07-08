import { describe, expect, it } from "vitest";
import {
  enforceGeneratedOptionGuardrails,
  type GeneratedOption,
} from "../src/lib/ai";
import { MAX_WEIGHTED_LENGTH } from "../shared/evals";

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
