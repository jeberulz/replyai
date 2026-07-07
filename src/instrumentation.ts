import * as Sentry from "@sentry/nextjs";

/**
 * Server/edge Sentry init (docs/observability.md). Runs once per server
 * instance. `Sentry.init` is safe to call with an empty/undefined dsn — the
 * SDK becomes a no-op client, so this never breaks a deploy or dev run with
 * no SENTRY_DSN set (AGENTS.md: demo mode / missing keys must never break a
 * flow).
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN || undefined;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      // Error-only observability for now; no perf/tracing overhead.
      tracesSampleRate: 0,
    });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      tracesSampleRate: 0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
