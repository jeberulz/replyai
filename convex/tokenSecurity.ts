import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const TOKEN_CIPHER_PREFIX = "v1";
const TOKEN_KEY_ENV = "X_TOKEN_ENCRYPTION_KEY";

type XTokenRow = Doc<"xTokens">;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

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

async function tokenEncryptionKey(): Promise<CryptoKey> {
  const secret = process.env[TOKEN_KEY_ENV]?.trim();
  if (!secret) {
    // ConvexError keeps the code visible to the Next auth route in prod, where
    // plain Error messages are redacted to "Server Error".
    throw new ConvexError({
      code: "token_encryption_key_missing",
      message: `${TOKEN_KEY_ENV} is not configured.`,
    });
  }
  const material = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return await crypto.subtle.importKey("raw", material, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
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
  return {
    accessToken: tokenRow.encryptedAccessToken
      ? await decryptToken(tokenRow.encryptedAccessToken)
      : (tokenRow.accessToken ?? null),
    refreshToken: tokenRow.encryptedRefreshToken
      ? await decryptToken(tokenRow.encryptedRefreshToken)
      : (tokenRow.refreshToken ?? null),
  };
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
  const patch: {
    encryptedAccessToken: string;
    accessToken: undefined;
    encryptedRefreshToken?: string;
    refreshToken?: undefined;
  } = {
    encryptedAccessToken: await encryptToken(args.accessToken),
    accessToken: undefined,
  };

  if (args.refreshToken !== undefined) {
    patch.encryptedRefreshToken = await encryptToken(args.refreshToken);
    patch.refreshToken = undefined;
  } else if (!args.existingEncryptedRefreshToken && args.existingRefreshToken) {
    patch.encryptedRefreshToken = await encryptToken(args.existingRefreshToken);
    patch.refreshToken = undefined;
  }

  return patch;
}

export async function encryptedXTokenFields(args: {
  accessToken: string;
  refreshToken?: string;
}): Promise<{
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
}> {
  return {
    encryptedAccessToken: await encryptToken(args.accessToken),
    ...(args.refreshToken !== undefined
      ? { encryptedRefreshToken: await encryptToken(args.refreshToken) }
      : {}),
  };
}
