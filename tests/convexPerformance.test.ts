import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Convex hot-path query plans", () => {
  it("keeps the trend radar indexed, windowed, ordered, and bounded", () => {
    const trends = source("convex/trends.ts");

    expect(trends).toContain('withIndex("by_user_and_status_and_scannedAt"');
    expect(trends).toContain('.gte("scannedAt", nowMs - windowMs)');
    expect(trends).toContain('.lte("scannedAt", nowMs)');
    expect(trends).toContain(".take(MAX_CORPUS)");
    expect(trends).not.toContain(
      '.withIndex("by_user", (q) => q.eq("userId", userId))\n    .collect()',
    );
  });

  it("reads only one voice profile and ten recent analyses for niche context", () => {
    const scannerSemantic = source("convex/scannerSemantic.ts");
    const nicheContext = scannerSemantic.slice(
      scannerSemantic.indexOf("export const nicheContext"),
      scannerSemantic.indexOf("export const semanticCacheByTweetIds"),
    );

    expect(nicheContext).toContain('withIndex("by_user_and_isDefault"');
    expect(nicheContext).toContain('withIndex("by_user_and_createdAt"');
    expect(nicheContext).toContain(".take(10)");
    expect(nicheContext).not.toContain(".collect()");
  });

  it("pushes monthly usage and pacing time filters into indexes", () => {
    const usage = source("convex/usage.ts");
    const stats = usage.slice(
      usage.indexOf("export const stats"),
      usage.indexOf("export const pacingCoach"),
    );
    const pacing = usage.slice(
      usage.indexOf("export const pacingCoach"),
      usage.indexOf("export const personalAnalytics"),
    );

    expect(stats).toContain('withIndex("by_user_and_scannedAt"');
    expect(stats).toContain('.gte("scannedAt", monthStart)');
    expect(stats).toContain('.lt("scannedAt", nextMonthStart)');
    expect(pacing).toContain('withIndex("by_user_and_scannedAt"');
    expect(pacing).toContain('.gte("scannedAt", todayStart)');
    expect(pacing).not.toContain("Date.now()");
  });

  it("uses a point-in-time read for the low-freshness chat stat strip", () => {
    const statStrip = source("src/components/app/chat/stat-strip.tsx");

    expect(statStrip).toContain("useConvex");
    expect(statStrip).toContain(".query(api.usage.stats");
    expect(statStrip).not.toContain("useQuery");
  });

  it("bounds recent analyses exactly and keeps authorization on both readers", () => {
    const analyses = source("convex/analyses.ts");
    const recent = analyses.slice(
      analyses.indexOf("export const listRecent"),
      analyses.indexOf("export const search"),
    );

    expect(recent.match(/requireUser\(ctx, sessionToken\)/g)).toHaveLength(2);
    expect(recent).toContain("RECENT_ANALYSES_MAX_LIMIT");
    expect(recent).toContain('withIndex("by_user_and_createdAt"');
    expect(recent).toContain('withIndex("by_user_and_project_and_createdAt"');
    expect(recent).not.toContain("takeCount * 2");
    expect(recent).not.toContain(".collect()");
  });
});

describe("scanner scheduling and finalization", () => {
  it("guards fan-out with the cadence check before scheduling", () => {
    const scannerActions = source("convex/scannerActions.ts");
    const scanAll = scannerActions.slice(
      scannerActions.indexOf("export const scanAll"),
      scannerActions.indexOf("export const scanUser"),
    );

    expect(scanAll.indexOf("shouldEnqueueScan")).toBeLessThan(
      scanAll.indexOf("ctx.scheduler.runAfter"),
    );
  });

  it("uses one success mutation for upsert, archive, and scan-result state", () => {
    const scannerActions = source("convex/scannerActions.ts");
    const successPath = scannerActions.slice(
      scannerActions.indexOf("internal.opportunities.upsertMany"),
      scannerActions.indexOf("await runShadowGrokDiscoverySample"),
    );
    const opportunities = source("convex/opportunities.ts");
    const upsert = opportunities.slice(
      opportunities.indexOf("export const upsertMany"),
      opportunities.indexOf("export const markSentByTweet"),
    );

    expect(successPath).not.toContain("reconcileIrrelevant");
    expect(successPath).not.toContain("pruneStale");
    expect(successPath).not.toContain("recordScanResult");
    expect(upsert).toContain("archiveExpiredForUserImpl(ctx, userId, now)");
    expect(upsert).toContain("lastScanCount: resultCount");
    expect(upsert).toContain("lastScanError: undefined");
  });
});
