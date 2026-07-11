export type XReadSource =
  | "manual_analysis"
  | "onboarding"
  | "scanner_following"
  | "scanner_list"
  | "scanner_watched"
  | "scanner_search"
  | "scanner_grok_shadow"
  | "research"
  | "voice_refresh"
  | "reply_back"
  | "owned_lists";

export type XReadPriority = "high" | "low";

export type XReadBudgetInput = {
  priority: XReadPriority;
  userRequestsToday: number;
  globalRequestsToday: number;
  userDailyLimit?: number | null;
  globalDailyLimit?: number | null;
  killSwitch?: boolean;
  limitsRequired?: boolean;
  /** Designated test account (users.unlimitedAccess) — bypasses caps, not the kill switch. */
  unlimitedAccess?: boolean;
};

export type XReadBudgetDecision = {
  allowed: boolean;
  reason?: "kill_switch" | "missing_caps" | "user_cap" | "global_cap";
  message?: string;
};

export function xReadDayKey(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function parseOptionalNonNegativeInt(
  value: string | undefined
): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function evaluateXReadBudget(
  input: XReadBudgetInput
): XReadBudgetDecision {
  if (input.killSwitch) {
    return {
      allowed: false,
      reason: "kill_switch",
      message:
        "X reads are temporarily paused. Stored drafts and saved analyses still work.",
    };
  }

  // A designated end-to-end test account exercises the real X pipeline without
  // the beta budget guardrails: it clears the missing-caps fail-closed and the
  // numeric daily caps. The operator kill switch above still stops it, so an
  // emergency pause is never overridden.
  if (input.unlimitedAccess) {
    return { allowed: true };
  }

  const userLimit =
    typeof input.userDailyLimit === "number" && input.userDailyLimit >= 0
      ? input.userDailyLimit
      : null;
  const globalLimit =
    typeof input.globalDailyLimit === "number" && input.globalDailyLimit >= 0
      ? input.globalDailyLimit
      : null;

  if ((userLimit === null || globalLimit === null) && input.limitsRequired) {
    return {
      allowed: false,
      reason: "missing_caps",
      message:
        "X reads are temporarily unavailable until beta read caps are configured.",
    };
  }

  if (input.priority === "low") {
    if (userLimit !== null && input.userRequestsToday >= userLimit) {
      return {
        allowed: false,
        reason: "user_cap",
        message:
          "Your daily X read budget is full. Stored drafts and saved analyses still work.",
      };
    }
    if (globalLimit !== null && input.globalRequestsToday >= globalLimit) {
      return {
        allowed: false,
        reason: "global_cap",
        message:
          "The beta X read budget is full for today. Stored drafts and saved analyses still work.",
      };
    }
  }

  return { allowed: true };
}
