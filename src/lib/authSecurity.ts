import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX = 30;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const authRateLimits = new Map<string, RateLimitBucket>();

// A bucket is only ever overwritten (same key hit again) or mutated in
// place — never deleted — so distinct keys accumulate forever. Since the
// key includes the caller-reported IP, an attacker varying that value on
// every request (see authClientIp's caveat below) grows this map without
// bound. Sweep expired entries once the map gets large rather than on every
// call, so the common case stays cheap.
const AUTH_RATE_LIMIT_SWEEP_THRESHOLD = 5_000;

function sweepExpiredBuckets(now: number) {
  if (authRateLimits.size < AUTH_RATE_LIMIT_SWEEP_THRESHOLD) return;
  for (const [key, bucket] of authRateLimits) {
    if (bucket.resetAt <= now) authRateLimits.delete(key);
  }
}

function expectedOrigin(request: NextRequest): string {
  return new URL(env.appUrl || request.url).origin;
}

export function hasAllowedOrigin(
  request: NextRequest,
  options: { requireOrigin?: boolean } = {}
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return !options.requireOrigin;
  return origin === expectedOrigin(request);
}

export function forbiddenOriginResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Best-effort client IP for rate-limit bucketing. Caveat: `X-Forwarded-For`
 * is caller-supplied unless a trusted proxy in front of this deployment
 * overwrites/appends to it — on some platforms the leftmost entry is the
 * proxy-verified value, on others (multi-hop, self-hosted, no proxy) it is
 * fully attacker-controlled, letting a client rotate a fake value per
 * request to evade the per-IP cap. This makes the limiter a best-effort
 * abuse deterrent under the deployment's actual proxy trust model, not a
 * hardened guarantee — treat it accordingly.
 */
export function authClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function consumeAuthRateLimit(
  request: NextRequest,
  bucket: string,
  options: {
    now?: number;
    limit?: number;
    windowMs?: number;
  } = {}
): { allowed: boolean; retryAfterSeconds: number } {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? AUTH_RATE_LIMIT_MAX;
  const windowMs = options.windowMs ?? AUTH_RATE_LIMIT_WINDOW_MS;
  sweepExpiredBuckets(now);
  const key = `${bucket}:${authClientIp(request)}`;
  const existing = authRateLimits.get(key);

  if (!existing || existing.resetAt <= now) {
    authRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count <= limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many auth attempts" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

export function guardAuthRoute(
  request: NextRequest,
  bucket: string,
  options: { requireOrigin?: boolean } = {}
) {
  if (!hasAllowedOrigin(request, options)) return forbiddenOriginResponse();
  const rateLimit = consumeAuthRateLimit(request, bucket);
  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfterSeconds);
  }
  return null;
}

export function resetAuthRateLimitsForTests() {
  authRateLimits.clear();
}

export function authRateLimitMapSizeForTests(): number {
  return authRateLimits.size;
}
