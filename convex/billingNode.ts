"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import Stripe from "stripe";
import { hasProAccess } from "../shared/billing";

type BillingViewer = {
  userId: Id<"users">;
  displayName: string;
  isDemo: boolean;
  plan: string;
  stripeCustomerId?: string;
};

let stripeClient: Stripe | null = null;

function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRO_PRICE_ID &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function billingReturnUrl(returnUrl: string, suffix: string): string {
  return `${returnUrl.replace(/\/$/, "")}${suffix}`;
}

export const createCheckoutSession = action({
  args: {
    sessionToken: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, { sessionToken, returnUrl }) => {
    const viewer: BillingViewer = await ctx.runQuery(
      internal.billing.viewerForSession,
      { sessionToken }
    );

    if (viewer.isDemo) {
      throw new Error("Demo accounts already include Pro access.");
    }
    if (hasProAccess(viewer)) {
      throw new Error("Your account already has Pro access.");
    }
    if (!stripeConfigured() || !process.env.STRIPE_PRO_PRICE_ID) {
      throw new Error("Stripe billing is not configured.");
    }

    const stripe = getStripe();
    let customerId = viewer.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: viewer.displayName,
        metadata: { convexUserId: viewer.userId },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.billing.storeStripeCustomer, {
        userId: viewer.userId,
        stripeCustomerId: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { convexUserId: viewer.userId },
      },
      success_url: billingReturnUrl(returnUrl, "/settings?billing=success"),
      cancel_url: billingReturnUrl(returnUrl, "/settings?billing=canceled"),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return { url: session.url };
  },
});

export const createPortalSession = action({
  args: {
    sessionToken: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, { sessionToken, returnUrl }) => {
    const viewer: BillingViewer = await ctx.runQuery(
      internal.billing.viewerForSession,
      { sessionToken }
    );

    if (viewer.isDemo) {
      throw new Error("Demo accounts do not use Stripe billing.");
    }
    if (!stripeConfigured()) {
      throw new Error("Stripe billing is not configured.");
    }
    if (!viewer.stripeCustomerId) {
      throw new Error("No Stripe customer is attached to this account yet.");
    }

    const portal = await getStripe().billingPortal.sessions.create({
      customer: viewer.stripeCustomerId,
      return_url: billingReturnUrl(returnUrl, "/settings"),
    });

    return { url: portal.url };
  },
});
