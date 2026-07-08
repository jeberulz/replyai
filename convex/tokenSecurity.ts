import type { Doc } from "./_generated/dataModel";
import { bytesToHex } from "./helpers";
import { captureConvexException } from "./lib/sentry";

const TOKEN_CIPHER_PREFIX = "v1";
const TOKEN_KEY_ENV = "X_TOKEN_ENCRYPTION_KEY";

type XTokenRow = Doc<"xTokens">;

function hexToBytes(hex: string): Uint8Array {
  if (!/^[a-f0-9]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid encrypted token encoding.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Derived once per secret value and reused for the isolate's lifetime — the
// key material never changes between calls, so re-hashing and re-importing
// it on every single encrypt/decrypt (this runs on every scan, publish, and
// token refresh) would be pure waste. Keyed by the secret string itself so a
// rotated env var can't serve stale key material within a long-lived isolate.
let cachedKey: { secret: string; key: CryptoKey } | null = null;

// SHA-256 of an operator-generated, high-entropy secret (README/`.env.example`
// specify `openssl rand -base64 32`) is used directly as AES-256 key material
// rather than HKDF: there is no second derived key sharing this secret today,
// so HKDF's domain-separation benefit doesn't apply yet. If a future purpose
// needs a second key from the same secret, derive both via HKDF-Expand with
// distinct `info` labels instead of hashing this secret again ad hoc.
async function tokenEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env[TOKEN_KEY_ENV]?.trim();
  if (!secret) throw new Error(`${TOKEN_KEY_ENV} is not configured.`);
  if (cachedKey && cachedKey.secret === secret) return cachedKey.key;

  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  const key = await crypto.subtle.importKey("raw", material, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  cachedKey = { secret, key };
  return key;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await tokenEncryptionKey(),
    new TextEncoder().encode(plaintext)
  );
  return `${TOKEN_CIPHER_PREFIX}.${bytesToHex(iv)}.${bytesToHex(
    new Uint8Array(ciphertext)
  )}`;
}

export async function decryptToken(ciphertext: string): Promise<string> {
  const [version, ivHex, cipherHex] = ciphertext.split(".");
  if (version !== TOKEN_CIPHER_PREFIX || !ivHex || !cipherHex) {
    throw new Error("Unsupported encrypted token format.");
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(ivHex).buffer as ArrayBuffer },
    await tokenEncryptionKey(),
    hexToBytes(cipherHex).buffer as ArrayBuffer
  );
  return new TextDecoder().decode(plaintext);
}

export async function readStoredXTokens(
  tokenRow: XTokenRow | null
): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  if (!tokenRow) return { accessToken: null, refreshToken: null };
  try {
    const [accessToken, refreshToken] = await Promise.all([
      tokenRow.encryptedAccessToken
        ? decryptToken(tokenRow.encryptedAccessToken)
        : Promise.resolve(tokenRow.accessToken ?? null),
      tokenRow.encryptedRefreshToken
        ? decryptToken(tokenRow.encryptedRefreshToken)
        : Promise.resolve(tokenRow.refreshToken ?? null),
    ]);
    return { accessToken, refreshToken };
  } catch (error) {
    // A corrupted ciphertext, a rotated/misconfigured key, or an unsupported
    // format must not throw into callers that never expected a plain field
    // read to fail (the scan cron, publish, the server-token query) — treat
    // it as "no usable token" so the existing missing-token UX (reconnect
    // prompt, standalone-publish fallback) takes over, and capture the
    // failure so a systemic key problem stays operationally visible instead
    // of silently aborting a whole scan cycle or wedging a draft forever.
    await captureConvexException(error, {
      scope: "tokenSecurity.readStoredXTokens",
      xTokenRowId: tokenRow._id,
    });
    return { accessToken: null, refreshToken: null };
  }
}

export async function encryptedXTokenPatch(args: {
  accessToken: string;
  refreshToken?: string;
  existingRefreshToken?: string;
  existingEncryptedRefreshToken?: string;
}): Promise<{
  encryptedAccessToken: string;
  accessToken: undefined;
  encryptedRefreshToken?: string;
  refreshToken?: undefined;
}> {
  const refreshTokenToEncrypt =
    args.refreshToken !== undefined
      ? args.refreshToken
      : !args.existingEncryptedRefreshToken && args.existingRefreshToken
        ? args.existingRefreshToken
        : undefined;

  const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
    encryptToken(args.accessToken),
    refreshTokenToEncrypt !== undefined
      ? encryptToken(refreshTokenToEncrypt)
      : Promise.resolve(undefined),
  ]);

  return {
    encryptedAccessToken,
    accessToken: undefined,
    ...(encryptedRefreshToken !== undefined
      ? { encryptedRefreshToken, refreshToken: undefined }
      : {}),
  };
}

export async function encryptedXTokenFields(args: {
  accessToken: string;
  refreshToken?: string;
}): Promise<{
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
}> {
  const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
    encryptToken(args.accessToken),
    args.refreshToken !== undefined
      ? encryptToken(args.refreshToken)
      : Promise.resolve(undefined),
  ]);
  return {
    encryptedAccessToken,
    ...(encryptedRefreshToken !== undefined ? { encryptedRefreshToken } : {}),
  };
}
