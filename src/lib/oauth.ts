import { ConvexError } from "convex/values";
import type { NextRequest } from "next/server";
import { authProvisioningSecret } from "./authProvisioning";
import { betaAccessConfigFromEnv } from "./betaAccess";
import { env } from "./env";

/** OAuth callback URL — must match X Developer Portal exactly. */
export function oauthCallbackUrl(request: NextRequest): string {
  const base = (env.appUrl || new URL(request.url).origin).replace(/\/$/, "");
  return `${base}/api/auth/callback`;
}

/** Convex v.optional() rejects null; strip empty optional fields. */
export function optionalString(
  value: string | null | undefined
): string | undefined {
  if (value == null || value === "") return undefined;
  return value;
}

export function formatAuthError(error: unknown): string {
  if (error instanceof Error) {
    const data = (error as { data?: unknown }).data;
    const parts = [error.message, data ? JSON.stringify(data) : ""].filter(
      Boolean
    );
    return parts.join(" ") || error.name;
  }
  return String(error);
}

/** ConvexHttpClient throws an empty Error when the deployment has no functions. */
export function isConvexDeploymentError(error: unknown): boolean {
  return error instanceof Error && !error.message;
}

/**
 * Deployment-config gaps that Convex reports as ConvexError codes (these
 * survive prod error redaction, unlike plain Error messages). Mapped to a
 * landing-page error slug so the operator sees which env var to fix instead
 * of a generic "sign-in failed".
 */
export function authConfigErrorSlug(
  error: unknown
): "provisioning" | "token_key" | null {
  if (!(error instanceof ConvexError)) return null;
  const data: unknown = error.data;
  const code =
    typeof data === "object" && data !== null
      ? (data as { code?: unknown }).code
      : undefined;
  if (code === "auth_provisioning_misconfigured") return "provisioning";
  if (code === "token_encryption_key_missing") return "token_key";
  return null;
}

/**
 * Server-config check for the real (non-demo) X sign-in path, run before
 * redirecting to X so a login that cannot possibly complete fails fast with
 * an actionable error instead of bouncing through X and back to a generic
 * failure. Convex rejects non-demo provisioning whenever the Next side has no
 * CONVEX_AUTH_PROVISION_SECRET, and allowlist mode with no valid handles
 * denies every identity, so both states are guaranteed dead ends.
 */
export function realSignInConfigError(): "provisioning" | "beta_config" | null {
  if (!authProvisioningSecret()) return "provisioning";
  if (betaAccessConfigFromEnv().configError) return "beta_config";
  return null;
}
