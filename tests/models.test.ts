import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_ID,
  estimateCostUsd,
  formatUsd,
  isKnownModel,
  MODELS,
  modelLabel,
} from "../shared/models";

describe("model catalog", () => {
  it("has a valid default model", () => {
    expect(isKnownModel(DEFAULT_MODEL_ID)).toBe(true);
  });

  it("rejects unknown model ids", () => {
    expect(isKnownModel("gpt-4")).toBe(false);
    expect(isKnownModel("")).toBe(false);
  });

  it("labels known models and falls back to the raw id", () => {
    expect(modelLabel("claude-sonnet-5")).toBe("Sonnet 5");
    expect(modelLabel("mystery-model")).toBe("mystery-model");
  });

  it("orders the catalog strongest-first with descending price", () => {
    const prices = MODELS.map((m) => m.outputPerMTok);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });
});

describe("estimateCostUsd", () => {
  it("computes cost from per-MTok pricing", () => {
    // Opus 4.8: $5 in / $25 out per MTok
    expect(estimateCostUsd("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(30);
    expect(estimateCostUsd("claude-opus-4-8", 2000, 500)).toBeCloseTo(
      0.0225,
      6
    );
  });

  it("returns 0 for unknown models and zero usage", () => {
    expect(estimateCostUsd("nope", 1000, 1000)).toBe(0);
    expect(estimateCostUsd("claude-haiku-4-5", 0, 0)).toBe(0);
  });
});

describe("formatUsd", () => {
  it("keeps precision for sub-cent amounts", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.0042)).toBe("$0.0042");
    expect(formatUsd(0.25)).toBe("$0.25");
  });
});
