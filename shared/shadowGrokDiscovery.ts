import { X_DISCOVERY_LIMITS, type XDiscoveryRequestInput } from "./xDiscovery";

export const SHADOW_GROK_DISCOVERY_VERSION = "wp49-shadow-grok-discovery-v1";

export const SHADOW_GROK_LIMITS = {
  maxSampleRatePercent: 100,
  defaultSampleRatePercent: 0,
  maxResults: 5,
  maxToolCalls: 2,
  maxQueryTerms: 4,
  maxAllowedHandles: 10,
  dateWindowDays: 2,
} as const;

export const SHADOW_GROK_MODES = ["off", "shadow"] as const;
export type ShadowGrokMode = (typeof SHADOW_GROK_MODES)[number];

export type ShadowGrokAvailability =
  | "off"
  | "not_sampled"
  | "no_query"
  | "spend_blocked"
  | "circuit_open"
  | "provider_unavailable"
  | "hydration_failed"
  | "succeeded"
  | "failed";

export type ShadowGrokSampleInput = {
  userId: string;
  scanStartedAt: number;
  keywords: readonly string[];
  searchKeywords: readonly string[];
  watchedHandles: readonly string[];
};

export function parseShadowGrokMode(value: string | null | undefined): ShadowGrokMode {
  return value === "shadow" ? "shadow" : "off";
}

export function parseShadowSampleRatePercent(
  value: string | number | null | undefined,
  fallback = SHADOW_GROK_LIMITS.defaultSampleRatePercent
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  const rate = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(
    SHADOW_GROK_LIMITS.maxSampleRatePercent,
    Math.max(0, Math.floor(rate))
  );
}

export function stableShadowSampleKey(input: ShadowGrokSampleInput): string {
  const bucket = Math.floor(input.scanStartedAt / (15 * 60_000));
  const normalized = [
    input.userId,
    String(bucket),
    ...normalizeTerms(input.searchKeywords),
    ...normalizeTerms(input.keywords),
    ...normalizeTerms(input.watchedHandles),
  ].join("|");
  return `shadow_${stableHash(normalized)}`;
}

export function shouldSampleShadowGrok(args: {
  mode: ShadowGrokMode;
  sampleRatePercent: number;
  sampleKey: string;
}): boolean {
  if (args.mode !== "shadow") return false;
  if (args.sampleRatePercent <= 0) return false;
  if (args.sampleRatePercent >= 100) return true;
  return stableHash(args.sampleKey) % 100 < args.sampleRatePercent;
}

export function buildShadowDiscoveryRequest(args: {
  nowMs: number;
  keywords: readonly string[];
  searchKeywords: readonly string[];
  watchedHandles: readonly string[];
  goal?: string | null;
}): XDiscoveryRequestInput | null {
  const terms = [
    ...normalizeTerms(args.searchKeywords),
    ...normalizeTerms(args.keywords),
  ].slice(0, SHADOW_GROK_LIMITS.maxQueryTerms);
  if (terms.length === 0) return null;

  const handles = normalizeTerms(args.watchedHandles)
    .filter((handle) => /^[A-Za-z0-9_]{1,15}$/.test(handle))
    .slice(0, SHADOW_GROK_LIMITS.maxAllowedHandles);
  const goalPhrase = args.goal ? ` for ${args.goal}` : "";
  const query = [
    `Find fresh X posts${goalPhrase} about: ${terms.join(", ")}`,
    "Prefer original posts with a clear, non-spammy reply opening.",
  ].join("\n").slice(0, X_DISCOVERY_LIMITS.maxQueryLength);

  return {
    query,
    fromDate: isoDateDaysAgo(args.nowMs, SHADOW_GROK_LIMITS.dateWindowDays - 1),
    toDate: isoDateDaysAgo(args.nowMs, 0),
    maxResults: SHADOW_GROK_LIMITS.maxResults,
    maxToolCalls: SHADOW_GROK_LIMITS.maxToolCalls,
    allowedHandles: handles.length > 0 ? handles : undefined,
    enableMediaUnderstanding: false,
  };
}

export function shadowNonInterferenceSignature<T extends {
  tweetId: string;
  score?: number;
  rankingScore?: number;
  source?: string;
}>(items: readonly T[]): string {
  return items
    .map((item) =>
      [
        item.tweetId,
        item.score ?? "",
        item.rankingScore ?? "",
        item.source ?? "",
      ].join(":")
    )
    .join("|");
}

function normalizeTerms(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = value.trim().replace(/^@/, "").toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function isoDateDaysAgo(nowMs: number, daysAgo: number): string {
  return new Date(nowMs - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
