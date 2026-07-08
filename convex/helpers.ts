import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const SESSION_SLIDING_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_ABSOLUTE_TTL_MS = 1000 * 60 * 60 * 24 * 90;
export const SESSION_RENEW_WITHIN_MS = 1000 * 60 * 60 * 24 * 7;

type SessionDoc = Doc<"sessions">;
type SessionCtx = QueryCtx | MutationCtx;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return bytesToHex(new Uint8Array(digest));
}

function absoluteExpiry(session: SessionDoc): number {
  return session.absoluteExpiresAt ?? session.createdAt + SESSION_ABSOLUTE_TTL_MS;
}

function canPatchSession(ctx: SessionCtx): ctx is MutationCtx {
  return "patch" in ctx.db;
}

async function maybeRenewSession(
  ctx: SessionCtx,
  session: SessionDoc,
  now: number,
  token: string
) {
  if (!canPatchSession(ctx)) return;
  const absoluteExpiresAt = absoluteExpiry(session);

  // Opportunistically upgrade a legacy plaintext-bearer session the moment
  // it's seen in a writable context, regardless of TTL — an already-logged-in
  // user would otherwise keep a raw token sitting in the table (and being
  // renewed indefinitely via the by_token fallback) for up to the full
  // absolute lifetime after this hardening deploys.
  const needsHashBackfill = !session.tokenHash;

  const currentExpiresAt = Math.min(session.expiresAt, absoluteExpiresAt);
  const needsRenewal = currentExpiresAt - now <= SESSION_RENEW_WITHIN_MS;
  if (!needsHashBackfill && !needsRenewal) return;

  const expiresAt = needsRenewal
    ? Math.min(now + SESSION_SLIDING_TTL_MS, absoluteExpiresAt)
    : session.expiresAt;
  if (
    !needsHashBackfill &&
    expiresAt <= session.expiresAt &&
    session.absoluteExpiresAt
  ) {
    return;
  }

  await ctx.db.patch(session._id, {
    expiresAt,
    absoluteExpiresAt,
    lastSeenAt: now,
    ...(needsHashBackfill
      ? { tokenHash: await hashSessionToken(token), token: undefined }
      : {}),
  });
}

export async function sessionByToken(
  ctx: SessionCtx,
  token: string
): Promise<SessionDoc | null> {
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const hashedSession = await ctx.db
    .query("sessions")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (hashedSession) return hashedSession;

  // Migration fallback for sessions created before token hashing shipped.
  return await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
}

export async function userBySessionToken(
  ctx: SessionCtx,
  token: string
): Promise<Doc<"users"> | null> {
  const session = await sessionByToken(ctx, token);
  const now = Date.now();
  if (!session) return null;
  if (session.expiresAt < now || absoluteExpiry(session) < now) return null;
  await maybeRenewSession(ctx, session, now, token);
  return await ctx.db.get(session.userId);
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"users">> {
  const user = await userBySessionToken(ctx, token);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export function currentMonth(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 7);
}
