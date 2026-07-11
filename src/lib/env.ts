/**
 * Central environment access. Every external integration is optional in
 * development: missing X credentials enable demo mode for auth/tweet data,
 * and a missing Anthropic key enables deterministic template generation, so
 * the whole product can be exercised end to end before keys are configured.
 */

export const env = {
  get convexUrl(): string {
    return process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  },
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get anthropicApiKey(): string {
    return process.env.ANTHROPIC_API_KEY ?? "";
  },
  get anthropicModel(): string {
    return process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
  },
  // Per-operation overrides. Analysis is reasoning-heavy (finding missing
  // angles), so it defaults to the strongest model (ANTHROPIC_MODEL).
  // Generation and rewrite are the high-volume, latency-sensitive path and the
  // dominant token-cost line, so they default to a faster/cheaper model
  // (Sonnet). An explicit ANTHROPIC_GENERATE_MODEL always wins; ANTHROPIC_MODEL
  // raises the floor for any operation lacking its own override.
  get anthropicAnalyzeModel(): string {
    return process.env.ANTHROPIC_ANALYZE_MODEL ?? this.anthropicModel;
  },
  get anthropicGenerateModel(): string {
    return (
      process.env.ANTHROPIC_GENERATE_MODEL ??
      process.env.ANTHROPIC_MODEL ??
      "claude-sonnet-5"
    );
  },
  get xaiApiKey(): string {
    return process.env.XAI_API_KEY ?? "";
  },
  get xaiBaseUrl(): string {
    return (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/+$/, "");
  },
  get xaiDiscoveryModel(): string {
    return process.env.XAI_DISCOVERY_MODEL ?? "grok-4.3";
  },
  get xaiDiscoveryReasoningEffort(): string {
    return process.env.XAI_DISCOVERY_REASONING_EFFORT ?? "low";
  },
  get xClientId(): string {
    return process.env.X_CLIENT_ID ?? "";
  },
  get xClientSecret(): string {
    return process.env.X_CLIENT_SECRET ?? "";
  },
  get authProvisionSecret(): string {
    return process.env.CONVEX_AUTH_PROVISION_SECRET ?? "";
  },
  get publicDemoEnabled(): boolean {
    if (process.env.ENABLE_PUBLIC_DEMO === "true") return true;
    if (process.env.NODE_ENV === "production") return false;
    return process.env.ENABLE_PUBLIC_DEMO !== "false";
  },
  get supportEmail(): string {
    return (
      process.env.REPLYPILOT_SUPPORT_EMAIL ??
      process.env.NEXT_PUBLIC_REPLYPILOT_SUPPORT_EMAIL ??
      ""
    ).trim();
  },
  get operatorName(): string {
    return (process.env.REPLYPILOT_OPERATOR_NAME ?? "").trim();
  },
};

export function hasXCredentials(): boolean {
  return Boolean(env.xClientId && env.xClientSecret);
}

export function hasAnthropicKey(): boolean {
  return Boolean(env.anthropicApiKey);
}

export function hasXaiKey(): boolean {
  return Boolean(env.xaiApiKey);
}

export function requireConvexUrl(): string {
  if (!env.convexUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Run `npx convex dev` and copy the URL into .env.local (see .env.example)."
    );
  }
  return env.convexUrl;
}
