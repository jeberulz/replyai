/**
 * Convex-side error capture. Implemented as a direct `fetch` against
 * Sentry's "store" ingestion endpoint rather than the `@sentry/node` SDK,
 * for the same reason as convex/lib/analytics.ts: the call sites already
 * have `fetch`, and this avoids adding a Node SDK whose behavior inside
 * Convex's action sandbox can't be verified without a live deployment.
 * This sends a minimal-but-valid event (message + exception type/value +
 * raw stack in `extra`) — it does not parse the stack into Sentry's
 * frame format, so Sentry's stack-trace UI won't render, but the error is
 * captured, grouped by type+message, and searchable. No-ops when
 * SENTRY_DSN isn't set via `npx convex env set SENTRY_DSN <dsn>`.
 */

function parseDsn(
  dsn: string
): { host: string; projectId: string; publicKey: string } | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    return { host: url.host, projectId, publicKey };
  } catch {
    return null;
  }
}

function randomEventId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function captureConvexException(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const message = error instanceof Error ? error.message : String(error);
  const type = error instanceof Error ? error.name : "Error";
  const stack = error instanceof Error ? error.stack : undefined;

  const body = {
    event_id: randomEventId(),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: "convex",
    message: { formatted: message },
    exception: { values: [{ type, value: message }] },
    extra: { ...context, stack },
  };

  try {
    await fetch(`https://${parsed.host}/api/${parsed.projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=replypilot-convex/1.0`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Error reporting must never itself throw or block the calling action.
  }
}
