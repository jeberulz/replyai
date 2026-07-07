import posthog from "posthog-js";
import {
  DEFAULT_POSTHOG_HOST,
  type AnalyticsEvent,
  type AnalyticsEventProperties,
} from "./events";

/**
 * Browser-side typed event capture. No-ops cleanly when
 * NEXT_PUBLIC_POSTHOG_KEY isn't configured, and is safe to call before
 * `initAnalyticsClient()` has run (e.g. during a fast client navigation) —
 * every function guards on `initialized`.
 */

let initialized = false;

/** Called once from src/instrumentation-client.ts on app boot. */
export function initAnalyticsClient(): void {
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
    // Funnel events are captured explicitly at each product step; avoid
    // implicit autocapture/pageview noise diluting the north-star funnel.
    autocapture: false,
    capture_pageview: false,
    person_profiles: "identified_only",
  });
  initialized = true;
}

/** Called once per session after the user is known (see AnalyticsProvider). */
export function identifyClient(userId: string): void {
  if (!initialized) return;
  try {
    posthog.identify(userId);
  } catch {
    // Analytics must never break a product flow.
  }
}

export function trackClient<E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsEventProperties[E]
): void {
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never break a product flow.
  }
}
