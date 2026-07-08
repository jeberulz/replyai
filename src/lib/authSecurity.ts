import { NextResponse, type NextRequest } from "next/server";
import { env } from "./env";

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX = 30;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const authRateLimits = new Map<string, RateLimitBucket>();

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
