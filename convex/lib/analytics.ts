import {
  DEFAULT_POSTHOG_HOST,
  type AnalyticsEvent,
  type AnalyticsEventProperties,
} from "../../src/lib/analytics/events";

/**
 * Convex-side funnel event capture (`opportunity_surfaced`, `published` —
 * the two funnel steps that originate inside Convex actions rather than
 * Next.js server actions). Implemented as a direct `fetch` against
 * PostHog's HTTP capture API rather than the `posthog-node` package: the
 * two call sites are already inside actions that have `fetch` available
 * regardless of runtime, and this avoids adding a second server SDK whose
 * bundling inside Convex's action sandbox can't be verified without a live
 * `npx convex dev` deployment in this environment (see
 * docs/wp/wp04-progress.md). No-ops when POSTHOG_KEY isn't set via
 * `npx convex env set POSTHOG_KEY <key>` — the scanner/publish actions must
 * keep working with zero keys configured.
 */
export async function trackConvexEvent<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  properties: AnalyticsEventProperties[E]
): Promise<void> {
  const key = process.env.POSTHOG_KEY;
  if (!key) return;
  const host = process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Analytics must never break a scan/publish action.
  }
}
