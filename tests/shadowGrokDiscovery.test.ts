import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildShadowDiscoveryRequest,
  parseShadowGrokMode,
  parseShadowSampleRatePercent,
  shadowNonInterferenceSignature,
  shouldSampleShadowGrok,
  stableShadowSampleKey,
  SHADOW_GROK_LIMITS,
} from "../shared/shadowGrokDiscovery";
import { evaluateAiSpendLimit } from "../shared/spendLimits";

describe("shadow Grok discovery sampling", () => {
  it("defaults to off with a zero sample rate", () => {
    const sampleKey = stableShadowSampleKey({
      userId: "user_123",
      scanStartedAt: Date.UTC(2026, 6, 11, 10),
      keywords: ["ai"],
      searchKeywords: ["founder workflows"],
      watchedHandles: ["sarahbuilds"],
    });

    expect(parseShadowGrokMode(undefined)).toBe("off");
    expect(parseShadowSampleRatePercent(undefined)).toBe(0);
    expect(
      shouldSampleShadowGrok({
        mode: "off",
        sampleRatePercent: 100,
        sampleKey,
      })
    ).toBe(false);
    expect(
      shouldSampleShadowGrok({
        mode: "shadow",
        sampleRatePercent: 0,
        sampleKey,
      })
    ).toBe(false);
  });

  it("samples deterministically from a stable key and capped request", () => {
    const input = {
      userId: "user_123",
      scanStartedAt: Date.UTC(2026, 6, 11, 10, 7),
      keywords: ["AI", "Startups"],
      searchKeywords: ["AI", "Workflow Automation", "SaaS", "Agents", "Extra"],
      watchedHandles: ["@SarahBuilds", "bad handle with spaces"],
    };

    expect(stableShadowSampleKey(input)).toBe(stableShadowSampleKey(input));
    expect(
      shouldSampleShadowGrok({
        mode: "shadow",
        sampleRatePercent: 100,
        sampleKey: stableShadowSampleKey(input),
      })
    ).toBe(true);

    const request = buildShadowDiscoveryRequest({
      nowMs: input.scanStartedAt,
      keywords: input.keywords,
      searchKeywords: input.searchKeywords,
      watchedHandles: input.watchedHandles,
      goal: "authority",
    });

    expect(request).not.toBeNull();
    expect(request?.maxResults).toBe(SHADOW_GROK_LIMITS.maxResults);
    expect(request?.maxToolCalls).toBe(SHADOW_GROK_LIMITS.maxToolCalls);
    expect(request?.fromDate).toBe("2026-07-10");
    expect(request?.toDate).toBe("2026-07-11");
    expect(request?.allowedHandles).toEqual(["sarahbuilds"]);
    expect(request?.query).toContain("workflow automation");
  });

  it("has a stable non-interference signature for surfaced opportunities", () => {
    const surfaced = [
      { tweetId: "1", score: 80, rankingScore: 88, source: "watched" },
      { tweetId: "2", score: 70, rankingScore: 72, source: "search" },
    ];
    const before = shadowNonInterferenceSignature(surfaced);
    const shadowOnly = [
      { tweetId: "grok-1", score: 99, rankingScore: 99, source: "grok" },
    ];

    expect(shadowNonInterferenceSignature(surfaced)).toBe(before);
    expect(shadowNonInterferenceSignature(shadowOnly)).not.toBe(before);
  });
});

describe("shadow Grok discovery integration guardrails", () => {
  it("keeps shadow work out of opportunity writes", () => {
    const source = readFileSync("convex/scannerActions.ts", "utf8");
    const opportunityWrite = source.indexOf("internal.opportunities.upsertMany");
    const shadowCall = source.indexOf("runShadowGrokDiscoverySample(ctx");
    const shadowFunction = source.slice(
      source.indexOf("async function runShadowGrokDiscoverySample")
    );

    expect(opportunityWrite).toBeGreaterThan(-1);
    expect(shadowCall).toBeGreaterThan(opportunityWrite);
    expect(shadowFunction).not.toContain("internal.opportunities.upsertMany");
    expect(shadowFunction).not.toContain("internal.notifications");
  });

  it("extends existing AI spend controls for discovery caps", () => {
    const decision = evaluateAiSpendLimit({
      kind: "discovery",
      usedThisHour: 2,
      hourlyLimit: 2,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.message).toContain("discovery");
  });

  it("declares provenance, hydration, cost, eval linkage, and circuit persistence", () => {
    const schema = readFileSync("convex/schema.ts", "utf8");
    const shadowModule = readFileSync("convex/shadowDiscovery.ts", "utf8");
    const events = readFileSync("src/lib/analytics/events.ts", "utf8");

    expect(schema).toContain("shadowGrokDiscoveryRuns");
    expect(schema).toContain("providerCircuitBreakers");
    expect(schema).toContain("citations: v.array(v.string())");
    expect(schema).toContain("hydrationFailures");
    expect(schema).toContain("costUsd");
    expect(schema).toContain("evalRunId");
    expect(shadowModule).toContain("latestPromotedShadowRun");
    expect(shadowModule).toContain("recordCircuitResult");
    expect(events).toContain("shadow_grok_discovery_sampled");
  });
});
