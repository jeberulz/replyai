export const FREE_PLAN = "free";
export const PRO_PLAN = "pro";

export type BillingPlan = typeof FREE_PLAN | typeof PRO_PLAN;
export type PaidFeature = "scanner" | "notifications" | "briefing";

const ACTIVE_PRO_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export function normalizePlan(plan: string | null | undefined): BillingPlan {
  return plan === PRO_PLAN ? PRO_PLAN : FREE_PLAN;
}

export function hasActiveBetaAccess(input: {
  betaAccessExpiresAt?: number | null;
  now?: number;
}): boolean {
  return typeof input.betaAccessExpiresAt === "number"
    ? input.betaAccessExpiresAt > (input.now ?? Date.now())
    : false;
}

export function hasProAccess(input: {
  plan?: string | null;
  isDemo?: boolean | null;
  betaAccessExpiresAt?: number | null;
}): boolean {
  return (
    Boolean(input.isDemo) ||
    normalizePlan(input.plan) === PRO_PLAN ||
    hasActiveBetaAccess(input)
  );
}

export function planFromStripeStatus(
  status: string | null | undefined
): BillingPlan {
  return status && ACTIVE_PRO_STATUSES.has(status) ? PRO_PLAN : FREE_PLAN;
}

export function paidFeatureLabel(feature: PaidFeature): string {
  switch (feature) {
    case "scanner":
      return "Feed scanner";
    case "notifications":
      return "Hot-window notifications";
    case "briefing":
      return "Daily briefing";
  }
}

export function paidFeatureGateMessage(feature: PaidFeature): string {
  return `${paidFeatureLabel(feature)} is available on the Pro plan.`;
}
