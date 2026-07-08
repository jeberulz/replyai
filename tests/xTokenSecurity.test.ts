import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptToken,
  encryptedXTokenFields,
  encryptedXTokenPatch,
  encryptToken,
  readStoredXTokens,
} from "../convex/tokenSecurity";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("X token encryption", () => {
  it("encrypts tokens without embedding the plaintext", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "test-key");

    const encrypted = await encryptToken("x-access-token");

    expect(encrypted).toMatch(/^v1\.[a-f0-9]{24}\.[a-f0-9]+$/);
    expect(encrypted).not.toContain("x-access-token");
    await expect(decryptToken(encrypted)).resolves.toBe("x-access-token");
  });

  it("requires the Convex encryption key for new encrypted writes", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "");

    await expect(encryptToken("x-access-token")).rejects.toThrow(
      "X_TOKEN_ENCRYPTION_KEY is not configured"
    );
  });

  it("keeps a legacy plaintext fallback for existing token rows", async () => {
    await expect(
      readStoredXTokens({
        _id: "token1",
        _creationTime: 1,
        userId: "user1",
        accessToken: "legacy-access",
        refreshToken: "legacy-refresh",
        expiresAt: Date.now() + 1000,
        scope: "tweet.read users.read",
      } as never)
    ).resolves.toEqual({
      accessToken: "legacy-access",
      refreshToken: "legacy-refresh",
    });
  });

  it("decrypts encrypted token rows", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "test-key");
    const encryptedAccessToken = await encryptToken("encrypted-access");
    const encryptedRefreshToken = await encryptToken("encrypted-refresh");

    await expect(
      readStoredXTokens({
        _id: "token1",
        _creationTime: 1,
        userId: "user1",
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresAt: Date.now() + 1000,
        scope: "tweet.read users.read",
      } as never)
    ).resolves.toEqual({
      accessToken: "encrypted-access",
      refreshToken: "encrypted-refresh",
    });
  });

  it("builds patches that remove plaintext fields and migrate legacy refresh tokens", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "test-key");

    const patch = await encryptedXTokenPatch({
      accessToken: "new-access",
      existingRefreshToken: "legacy-refresh",
    });

    expect(patch.accessToken).toBeUndefined();
    expect(patch.refreshToken).toBeUndefined();
    expect(patch.encryptedAccessToken).not.toContain("new-access");
    expect(patch.encryptedRefreshToken).not.toContain("legacy-refresh");
    await expect(decryptToken(patch.encryptedAccessToken)).resolves.toBe(
      "new-access"
    );
    await expect(decryptToken(patch.encryptedRefreshToken ?? "")).resolves.toBe(
      "legacy-refresh"
    );
  });

  it("builds insert fields without undefined plaintext token fields", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "test-key");

    const fields = await encryptedXTokenFields({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    expect(Object.hasOwn(fields, "accessToken")).toBe(false);
    expect(Object.hasOwn(fields, "refreshToken")).toBe(false);
    await expect(decryptToken(fields.encryptedAccessToken)).resolves.toBe(
      "new-access"
    );
    await expect(decryptToken(fields.encryptedRefreshToken ?? "")).resolves.toBe(
      "new-refresh"
    );
  });

  it("fails safe (never throws) when a stored ciphertext can't be decrypted", async () => {
    // Corrupted rows, a rotated/misconfigured key, or an unsupported format
    // must resolve to "no usable token" — a throw here would abort the scan
    // cron for every remaining user, wedge a scheduled publish forever, or
    // 500 a server action, instead of the graceful "reconnect X" UX every
    // other missing-token path already gives.
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "test-key");

    await expect(
      readStoredXTokens({
        _id: "token1",
        _creationTime: 1,
        userId: "user1",
        encryptedAccessToken: "not-a-valid-ciphertext",
        expiresAt: Date.now() + 1000,
        scope: "tweet.read users.read",
      } as never)
    ).resolves.toEqual({ accessToken: null, refreshToken: null });
  });

  it("fails safe when the encryption key is missing but a row has encrypted fields", async () => {
    vi.stubEnv("X_TOKEN_ENCRYPTION_KEY", "");

    await expect(
      readStoredXTokens({
        _id: "token1",
        _creationTime: 1,
        userId: "user1",
        encryptedAccessToken: "v1.deadbeefdeadbeefdeadbeef.deadbeef",
        expiresAt: Date.now() + 1000,
        scope: "tweet.read users.read",
      } as never)
    ).resolves.toEqual({ accessToken: null, refreshToken: null });
  });
});
