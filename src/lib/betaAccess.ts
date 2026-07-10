export type BetaAccessMode = "open" | "allowlist" | "disabled";

export type BetaAccessConfig = {
  mode: BetaAccessMode;
  allowedHandles: Set<string>;
  accessDays: number;
  configError: string | null;
};

export type BetaAccessDecision = {
  allowed: boolean;
  normalizedHandle: string | null;
  message: string | null;
  betaAccessExpiresAt?: number;
};

const DEFAULT_BETA_ACCESS_DAYS = 45;
const HANDLE_PATTERN = /^[a-z0-9_]{1,15}$/;

export function normalizeXHandle(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim().replace(/^@+/, "").toLowerCase();
  if (!HANDLE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function parseAllowedHandles(value: string | null | undefined): Set<string> {
  const handles = new Set<string>();
  for (const part of (value ?? "").split(",")) {
    const normalized = normalizeXHandle(part);
    if (normalized) handles.add(normalized);
  }
  return handles;
}

export function parseBetaAccessConfig(input: {
  mode?: string | null;
  allowedHandles?: string | null;
  accessDays?: string | number | null;
  nodeEnv?: string | null;
}): BetaAccessConfig {
  const rawMode = (input.mode ?? "").trim().toLowerCase();
  const defaultMode = input.nodeEnv === "production" ? "allowlist" : "open";
  const mode: BetaAccessMode =
    rawMode === "open" || rawMode === "allowlist" || rawMode === "disabled"
      ? rawMode
      : defaultMode;
  const allowedHandles = parseAllowedHandles(input.allowedHandles);
  const numericDays =
    typeof input.accessDays === "number"
      ? input.accessDays
      : Number.parseInt(String(input.accessDays ?? ""), 10);
  const accessDays =
    Number.isFinite(numericDays) && numericDays > 0
      ? numericDays
      : DEFAULT_BETA_ACCESS_DAYS;

  return {
    mode,
    allowedHandles,
    accessDays,
    configError:
      mode === "allowlist" && allowedHandles.size === 0
        ? "Beta access allowlist is not configured."
        : null,
  };
}

export function decideBetaAccess(input: {
  handle: string | null | undefined;
  config: BetaAccessConfig;
  now?: number;
}): BetaAccessDecision {
  const normalizedHandle = normalizeXHandle(input.handle);
  if (!normalizedHandle) {
    return {
      allowed: false,
      normalizedHandle: null,
      message: "We could not read a valid X handle for this beta invite.",
    };
  }
  if (input.config.configError) {
    return {
      allowed: false,
      normalizedHandle,
      message:
        "ReplyPilot private beta access is not configured yet. Please contact the operator for an invite.",
    };
  }
  if (input.config.mode === "disabled") {
    return {
      allowed: false,
      normalizedHandle,
      message: "ReplyPilot private beta access is currently closed.",
    };
  }
  if (
    input.config.mode === "allowlist" &&
    !input.config.allowedHandles.has(normalizedHandle)
  ) {
    return {
      allowed: false,
      normalizedHandle,
      message:
        "ReplyPilot is in private beta. This X account is not on the invite list yet.",
    };
  }

  const now = input.now ?? Date.now();
  return {
    allowed: true,
    normalizedHandle,
    message: null,
    betaAccessExpiresAt:
      input.config.mode === "allowlist"
        ? now + input.config.accessDays * 24 * 60 * 60 * 1000
        : undefined,
  };
}

export function betaAccessConfigFromEnv(): BetaAccessConfig {
  return parseBetaAccessConfig({
    mode: process.env.BETA_ACCESS_MODE,
    allowedHandles: process.env.BETA_ALLOWED_X_HANDLES,
    accessDays: process.env.BETA_ACCESS_DAYS,
    nodeEnv: process.env.NODE_ENV,
  });
}

export function betaAccessDecisionFromEnv(handle: string): BetaAccessDecision {
  return decideBetaAccess({
    handle,
    config: betaAccessConfigFromEnv(),
  });
}
