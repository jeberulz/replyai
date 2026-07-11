import { describe, expect, it } from "vitest";
import {
  ALL_MODELS,
  DEFAULT_MODEL_ID,
  DISCOVERY_MODELS,
  estimateCostUsd,
  formatUsd,
  isKnownCatalogModel,
  isKnownModel,
  MODELS,
  modelLabel,
  modelsForCapability,
  XAI_DISCOVERY_MODEL_ID,
} from "../shared/models";

describe("model catalog", () => {
  it("has a valid default model", () => {
    expect(isKnownModel(DEFAULT_MODEL_ID)).toBe(true);
  });

  it("rejects unknown model ids", () => {
    expect(isKnownModel("gpt-4")).toBe(false);
    expect(isKnownModel(XAI_DISCOVERY_MODEL_ID)).toBe(false);
    expect(isKnownModel("")).toBe(false);
  });

  it("keeps Grok discovery internal and out of generation pickers", () => {
    expect(isKnownCatalogModel(XAI_DISCOVERY_MODEL_ID)).toBe(true);
    expect(DISCOVERY_MODELS).toHaveLength(1);
    expect(MODELS.every((model) => model.providerId === "anthropic")).toBe(true);
    expect(ALL_MODELS.some((model) => model.providerId === "xai")).toBe(true);
    expect(modelsForCapability("x_search").map((model) => model.id)).toEqual([
      XAI_DISCOVERY_MODEL_ID,
    ]);
  });

  it("labels known models and falls back to the raw id", () => {
    expect(modelLabel("claude-sonnet-5")).toBe("Sonnet 5");
    expect(modelLabel(XAI_DISCOVERY_MODEL_ID)).toBe("Grok 4.3");
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
