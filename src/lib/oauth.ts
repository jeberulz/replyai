import type { NextRequest } from "next/server";
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
