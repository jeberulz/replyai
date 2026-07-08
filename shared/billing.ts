export const FREE_PLAN = "free";
export const PRO_PLAN = "pro";

export type BillingPlan = typeof FREE_PLAN | typeof PRO_PLAN;
export type PaidFeature = "scanner" | "notifications";

const ACTIVE_PRO_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export function normalizePlan(plan: string | null | undefined): BillingPlan {
  return plan === PRO_PLAN ? PRO_PLAN : FREE_PLAN;
}

export function hasProAccess(input: {
  plan?: string | null;
  isDemo?: boolean | null;
}): boolean {
  return Boolean(input.isDemo) || normalizePlan(input.plan) === PRO_PLAN;
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
  }
}

export function paidFeatureGateMessage(feature: PaidFeature): string {
  return `${paidFeatureLabel(feature)} is available on the Pro plan.`;
}
