/** Shared secret so only Next.js auth routes can create sessions (WP40). */
export function authProvisioningSecret(): string | undefined {
  const value = process.env.CONVEX_AUTH_PROVISION_SECRET?.trim();
  return value || undefined;
}
