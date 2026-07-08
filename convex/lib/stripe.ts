import Stripe from "stripe";
import { env } from "../_generated/server";

/**
 * Shared Stripe plumbing for both Convex runtimes: `convex/billing.ts`
 * (V8 — webhook verification via SubtleCrypto) and `convex/billingNode.ts`
 * ("use node" — checkout/portal sessions). One definition of "configured"
 * and one client construction path so the two sides can't drift.
 */

export function stripeConfigured(): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID && env.STRIPE_WEBHOOK_SECRET
  );
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
