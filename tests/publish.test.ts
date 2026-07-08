import { describe, expect, it } from "vitest";
import {
  composeWeightedQuotePostText,
  isRetryablePublishStatus,
  publishRetryDelayMs,
} from "../convex/publish";
import { MAX_WEIGHTED_LENGTH, weightedLength } from "../shared/evals";

describe("publish retry helpers", () => {
  it("retries only rate limits and server errors", () => {
    expect(isRetryablePublishStatus(429)).toBe(true);
    expect(isRetryablePublishStatus(500)).toBe(true);
    expect(isRetryablePublishStatus(503)).toBe(true);

    expect(isRetryablePublishStatus(400)).toBe(false);
    expect(isRetryablePublishStatus(401)).toBe(false);
    expect(isRetryablePublishStatus(403)).toBe(false);
    expect(isRetryablePublishStatus(404)).toBe(false);
  });

  it("adds deterministic jitter on top of exponential retry delay", () => {
    expect(publishRetryDelayMs(0, () => 0)).toBe(60_000);
    expect(publishRetryDelayMs(1, () => 0.5)).toBe(135_000);
  });
});

describe("composeWeightedQuotePostText", () => {
  it("keeps URL quote posts within X's weighted limit", () => {
    const text = `${"x".repeat(270)} 🚀🚀🚀`;
    const permalink = "https://x.com/sarahbuilds/status/1800000000000000001";
    const composed = composeWeightedQuotePostText(text, permalink);

    expect(weightedLength(composed)).toBeLessThanOrEqual(MAX_WEIGHTED_LENGTH);
    expect(composed).toContain(permalink);
  });
});
