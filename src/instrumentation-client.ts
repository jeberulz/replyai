import * as Sentry from "@sentry/nextjs";
import { initAnalyticsClient } from "@/lib/analytics/client";

// Runs once in the browser, before hydration (Next.js instrumentation-client
// convention). Both calls are no-ops when their respective env vars are
// unset — see src/lib/analytics/client.ts and Sentry's own dsn-less no-op
// client behavior.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0,
});

initAnalyticsClient();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
