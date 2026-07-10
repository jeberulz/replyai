export type AiSpendKind = "analysis" | "generation";

export type AiSpendLimitInput = {
  kind: AiSpendKind;
  usedThisHour: number;
  hourlyLimit?: number | null;
  killSwitch?: boolean;
  limitsRequired?: boolean;
};

export type AiSpendLimitDecision = {
  allowed: boolean;
  message?: string;
};

export function parseOptionalPositiveInt(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function evaluateAiSpendLimit(
  input: AiSpendLimitInput
): AiSpendLimitDecision {
  if (input.killSwitch) {
    return {
      allowed: false,
      message:
        "AI generation is temporarily paused while we protect the beta budget.",
    };
  }

  const limit =
    typeof input.hourlyLimit === "number" && input.hourlyLimit > 0
      ? input.hourlyLimit
      : null;
  if (limit === null) {
    if (input.limitsRequired) {
      return {
        allowed: false,
        message:
          "AI generation is temporarily unavailable until beta spend caps are configured.",
      };
    }
    return { allowed: true };
  }

  if (input.usedThisHour >= limit) {
    return {
      allowed: false,
      message:
        input.kind === "analysis"
          ? "Hourly analysis capacity is full. Try again in a little while."
          : "Hourly generation capacity is full. Try again in a little while.",
    };
  }

  return { allowed: true };
}

export function aiSpendHourKey(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 13);
}
