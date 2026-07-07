import "server-only";
import { PostHog } from "posthog-node";
import * as Sentry from "@sentry/nextjs";
import type { AnalyticsEvent, AnalyticsEventProperties } from "./events";

/**
 * Server-side (Next.js Server Actions / route handlers) typed event + error
 * capture. No-ops cleanly when POSTHOG_KEY / a Sentry DSN aren't configured
 * — demo mode and any environment without third-party keys must keep
 * working exactly as before (AGENTS.md: "demo mode never breaks").
 */

type DebugSink = <E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  properties: AnalyticsEventProperties[E]
) => void;

let posthogClient: PostHog | null | undefined;
let debugSink: DebugSink | null = null;

function getClient(): PostHog | null {
  if (posthogClient !== undefined) return posthogClient;
  const key = process.env.POSTHOG_KEY;
  if (!key) {
    posthogClient = null;
    return posthogClient;
  }
  posthogClient = new PostHog(key, {
    host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    // Server actions run request-scoped; flush immediately rather than
    // relying on a background batch timer that may never fire again.
    flushAt: 1,
    flushInterval: 0,
  });
  return posthogClient;
}

/**
 * Test-only hook: observe every `trackServer` call without a live PostHog
 * key. This is the "debug/no-op sink" verification path — there is no live
 * dashboard to check in this environment, so this is how the events are
 * proven to fire with the right name and shape. Pass `null` to detach.
 */
export function __setAnalyticsDebugSink(sink: DebugSink | null): void {
  debugSink = sink;
}

export function trackServer<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  properties: AnalyticsEventProperties[E]
): void {
  debugSink?.(event, distinctId, properties);
  const client = getClient();
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
  } catch {
    // Analytics must never break a product flow.
  }
}

/**
 * Report an unexpected error to Sentry. Safe to call unconditionally —
 * Sentry.captureException is a no-op before Sentry.init() runs or when the
 * configured DSN is empty (src/instrumentation.ts only calls init() when
 * SENTRY_DSN is set).
 */
export function captureServerException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Error reporting must never itself throw.
  }
}
