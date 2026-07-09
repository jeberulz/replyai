import { hasProAccess, type BillingPlan } from "./billing";

export const FREE_DAILY_ANALYSIS_LIMIT = 3;
export const PRO_MONTHLY_ANALYSIS_LIMIT = 600;
export const PRO_MONTHLY_GENERATION_LIMIT = 2400;

export type FairUseAction = "start_analysis" | "run_analysis" | "generate";

export type FairUseBlockReason =
  | "free_daily_analyses"
  | "pro_monthly_analyses"
  | "pro_monthly_generations";

export type FairUseMeter = {
  analysesToday: number;
  analysesThisMonth: number;
  generationsThisMonth: number;
};

export type FairUseLimits = {
  dailyAnalyses: number | null;
  monthlyAnalyses: number | null;
  monthlyGenerations: number | null;
};

export type FairUseStatus = {
  plan: BillingPlan;
  isDemo: boolean;
  unlimited: boolean;
  blocked: boolean;
  blockReason: FairUseBlockReason | null;
  message: string | null;
  limits: FairUseLimits;
  usage: FairUseMeter;
  remaining: {
    analysesToday: number | null;
    analysesThisMonth: number | null;
    generationsThisMonth: number | null;
  };
};

export function utcDayStartMs(nowMs: number): number {
  const date = new Date(nowMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function fairUseLimitsForPlan(input: {
  plan?: string | null;
  isDemo?: boolean | null;
}): FairUseLimits {
  if (hasProAccess(input)) {
    return {
      dailyAnalyses: null,
      monthlyAnalyses: PRO_MONTHLY_ANALYSIS_LIMIT,
      monthlyGenerations: PRO_MONTHLY_GENERATION_LIMIT,
    };
  }
  return {
    dailyAnalyses: FREE_DAILY_ANALYSIS_LIMIT,
    monthlyAnalyses: null,
    monthlyGenerations: null,
  };
}

export function evaluateFairUse(input: {
  plan?: string | null;
  isDemo?: boolean | null;
  usage: FairUseMeter;
  action: FairUseAction;
}): FairUseStatus {
  const plan = hasProAccess(input) ? "pro" : "free";
  const limits = fairUseLimitsForPlan(input);
  const remaining = {
    analysesToday:
      limits.dailyAnalyses === null
        ? null
        : Math.max(0, limits.dailyAnalyses - input.usage.analysesToday),
    analysesThisMonth:
      limits.monthlyAnalyses === null
        ? null
        : Math.max(0, limits.monthlyAnalyses - input.usage.analysesThisMonth),
    generationsThisMonth:
      limits.monthlyGenerations === null
        ? null
        : Math.max(
            0,
            limits.monthlyGenerations - input.usage.generationsThisMonth
          ),
  };

  if (input.isDemo) {
    return {
      plan,
      isDemo: true,
      unlimited: true,
      blocked: false,
      blockReason: null,
      message: null,
      limits,
      usage: input.usage,
      remaining,
    };
  }

  if (!hasProAccess(input)) {
    if (
      (input.action === "start_analysis" || input.action === "run_analysis") &&
      input.usage.analysesToday >= FREE_DAILY_ANALYSIS_LIMIT
    ) {
      return {
        plan,
        isDemo: false,
        unlimited: false,
        blocked: true,
        blockReason: "free_daily_analyses",
        message: freeDailyLimitMessage(input.usage.analysesToday),
        limits,
        usage: input.usage,
        remaining,
      };
    }
    return {
      plan,
      isDemo: false,
      unlimited: false,
      blocked: false,
      blockReason: null,
      message: null,
      limits,
      usage: input.usage,
      remaining,
    };
  }

  if (
    (input.action === "start_analysis" || input.action === "run_analysis") &&
    input.usage.analysesThisMonth >= PRO_MONTHLY_ANALYSIS_LIMIT
  ) {
    return {
      plan,
      isDemo: false,
      unlimited: false,
      blocked: true,
      blockReason: "pro_monthly_analyses",
      message: proMonthlyAnalysisLimitMessage(),
      limits,
      usage: input.usage,
      remaining,
    };
  }

  if (
    input.action === "generate" &&
    input.usage.generationsThisMonth >= PRO_MONTHLY_GENERATION_LIMIT
  ) {
    return {
      plan,
      isDemo: false,
      unlimited: false,
      blocked: true,
      blockReason: "pro_monthly_generations",
      message: proMonthlyGenerationLimitMessage(),
      limits,
      usage: input.usage,
      remaining,
    };
  }

  return {
    plan,
    isDemo: false,
    unlimited: false,
    blocked: false,
    blockReason: null,
    message: null,
    limits,
    usage: input.usage,
    remaining,
  };
}

export function fairUseUserMessage(reason: FairUseBlockReason): string {
  switch (reason) {
    case "free_daily_analyses":
      return freeDailyLimitMessage(FREE_DAILY_ANALYSIS_LIMIT);
    case "pro_monthly_analyses":
      return proMonthlyAnalysisLimitMessage();
    case "pro_monthly_generations":
      return proMonthlyGenerationLimitMessage();
  }
}

function freeDailyLimitMessage(used: number): string {
  return `You've used ${used}/${FREE_DAILY_ANALYSIS_LIMIT} analyses today on the Free plan. Upgrade to Pro for unlimited analyses under fair use, or try again tomorrow.`;
}

function proMonthlyAnalysisLimitMessage(): string {
  return `You've reached this month's fair-use analysis limit (${PRO_MONTHLY_ANALYSIS_LIMIT}). Contact support if you need a higher cap — most accounts never hit this.`;
}

function proMonthlyGenerationLimitMessage(): string {
  return `You've reached this month's fair-use generation limit (${PRO_MONTHLY_GENERATION_LIMIT}). Contact support if you need a higher cap.`;
}
