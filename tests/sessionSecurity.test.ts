import { describe, expect, it, vi } from "vitest";
import {
  hashSessionToken,
  SESSION_ABSOLUTE_TTL_MS,
  SESSION_RENEW_WITHIN_MS,
  SESSION_SLIDING_TTL_MS,
  sessionByToken,
  userBySessionToken,
} from "../convex/helpers";

type SessionRow = {
  _id: string;
  _creationTime: number;
  userId: string;
  token?: string;
  tokenHash?: string;
  createdAt: number;
  lastSeenAt?: number;
  expiresAt: number;
  absoluteExpiresAt?: number;
};

type UserRow = {
  _id: string;
  _creationTime: number;
  xUserId: string;
  username: string;
  displayName: string;
  plan: string;
  isDemo: boolean;
  createdAt: number;
};

function fakeCtx(rows: { sessions: SessionRow[]; users: UserRow[] }) {
  const patches: Array<{ id: string; patch: Partial<SessionRow> }> = [];
  return {
    patches,
    db: {
      query() {
        return {
          withIndex(
            index: "by_token" | "by_token_hash",
            cb: (q: { eq: (field: string, value: string) => string }) => string
          ) {
            let value = "";
            cb({
              eq(_field, nextValue) {
                value = nextValue;
                return nextValue;
              },
            });
            return {
              async unique() {
                return (
                  rows.sessions.find((row) =>
                    index === "by_token"
                      ? row.token === value
                      : row.tokenHash === value
                  ) ?? null
                );
              },
            };
          },
        };
      },
      async get(id: string) {
        return rows.users.find((row) => row._id === id) ?? null;
      },
      async patch(id: string, patch: Partial<SessionRow>) {
        patches.push({ id, patch });
        const row = rows.sessions.find((session) => session._id === id);
        if (row) Object.assign(row, patch);
      },
    },
  };
}

describe("session token hashing", () => {
  it("hashes session tokens without storing the bearer value", async () => {
    const token = "rp_test_token";
    const hash = await hashSessionToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashSessionToken(token)).toBe(hash);
  });

  it("looks up hashed sessions before legacy plaintext sessions", async () => {
    const token = "rp_test_token";
    const tokenHash = await hashSessionToken(token);
    const ctx = fakeCtx({
      sessions: [
        {
          _id: "session1",
          _creationTime: 1,
          userId: "user1",
          tokenHash,
          createdAt: 1,
          expiresAt: Date.now() + SESSION_SLIDING_TTL_MS,
          absoluteExpiresAt: Date.now() + SESSION_ABSOLUTE_TTL_MS,
        },
      ],
      users: [],
    });

    await expect(sessionByToken(ctx as never, token)).resolves.toMatchObject({
      _id: "session1",
    });
  });

  it("keeps a migration fallback for legacy plaintext sessions", async () => {
    const ctx = fakeCtx({
      sessions: [
        {
          _id: "legacy",
          _creationTime: 1,
          userId: "user1",
          token: "legacy_token",
          createdAt: 1,
          expiresAt: Date.now() + SESSION_SLIDING_TTL_MS,
        },
      ],
      users: [],
    });

    await expect(sessionByToken(ctx as never, "legacy_token")).resolves.toMatchObject({
      _id: "legacy",
    });
  });

  it("rejects expired sessions", async () => {
    const now = Date.now();
    const token = "expired_token";
    const ctx = fakeCtx({
      sessions: [
        {
          _id: "session1",
          _creationTime: 1,
          userId: "user1",
          tokenHash: await hashSessionToken(token),
          createdAt: now - 10_000,
          expiresAt: now - 1,
          absoluteExpiresAt: now + SESSION_ABSOLUTE_TTL_MS,
        },
      ],
      users: [
        {
          _id: "user1",
          _creationTime: 1,
          xUserId: "x1",
          username: "demo",
          displayName: "Demo",
          plan: "free",
          isDemo: true,
          createdAt: now,
        },
      ],
    });

    await expect(userBySessionToken(ctx as never, token)).resolves.toBeNull();
  });

  it("renews near-expiry sessions without exceeding the absolute expiry", async () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const token = "renew_token";
    const absoluteExpiresAt = now + SESSION_RENEW_WITHIN_MS;
    const ctx = fakeCtx({
      sessions: [
        {
          _id: "session1",
          _creationTime: 1,
          userId: "user1",
          tokenHash: await hashSessionToken(token),
          createdAt: now - SESSION_SLIDING_TTL_MS,
          expiresAt: now + 1000,
          absoluteExpiresAt,
        },
      ],
      users: [
        {
          _id: "user1",
          _creationTime: 1,
          xUserId: "x1",
          username: "demo",
          displayName: "Demo",
          plan: "free",
          isDemo: true,
          createdAt: now,
        },
      ],
    });

    await expect(userBySessionToken(ctx as never, token)).resolves.toMatchObject({
      _id: "user1",
    });
    expect(ctx.patches).toHaveLength(1);
    expect(ctx.patches[0].patch.expiresAt).toBe(absoluteExpiresAt);
    expect(ctx.patches[0].patch.lastSeenAt).toBe(now);
    vi.useRealTimers();
  });

  it("backfills tokenHash for a legacy plaintext session on first mutation-context access, even far from expiry", async () => {
    // Without this, a user already logged in when hashing shipped keeps a
    // raw bearer token sitting in the sessions table — renewed indefinitely
    // via the by_token fallback — for up to the full absolute lifetime.
    const now = Date.now();
    vi.setSystemTime(now);
    const token = "legacy_active_token";
    const ctx = fakeCtx({
      sessions: [
        {
          _id: "legacy1",
          _creationTime: 1,
          userId: "user1",
          token,
          createdAt: now - 1000,
          expiresAt: now + SESSION_SLIDING_TTL_MS, // nowhere near expiry
        },
      ],
      users: [
        {
          _id: "user1",
          _creationTime: 1,
          xUserId: "x1",
          username: "demo",
          displayName: "Demo",
          plan: "free",
          isDemo: true,
          createdAt: now,
        },
      ],
    });

    await expect(userBySessionToken(ctx as never, token)).resolves.toMatchObject({
      _id: "user1",
    });

    expect(ctx.patches).toHaveLength(1);
    expect(ctx.patches[0].patch.tokenHash).toBe(await hashSessionToken(token));
    expect(ctx.patches[0].patch.token).toBeUndefined();
    vi.useRealTimers();
  });
});
