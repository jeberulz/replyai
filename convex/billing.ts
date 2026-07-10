import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  httpAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";
import {
  FREE_PLAN,
  hasProAccess,
  planFromStripeStatus,
} from "../shared/billing";

function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRO_PRICE_ID &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}

function replaceUserWithoutStripeSnapshot(
  user: Doc<"users">,
  updates: Partial<Doc<"users">>
): Doc<"users"> {
  const next = { ...user, ...updates } as Partial<Doc<"users">>;
  delete next.stripeSubscriptionId;
  delete next.stripePriceId;
  delete next.stripeCurrentPeriodEnd;
  delete next.stripeTrialEndsAt;
  return next as Doc<"users">;
}

export const status = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const proAccess = hasProAccess(user);
    return {
      plan: user.plan,
      isDemo: user.isDemo,
      betaAccessExpiresAt: user.betaAccessExpiresAt ?? null,
      hasBetaAccess:
        typeof user.betaAccessExpiresAt === "number" &&
        user.betaAccessExpiresAt > Date.now(),
      hasProAccess: proAccess,
      stripeConfigured: stripeConfigured(),
      canStartCheckout: stripeConfigured() && !user.isDemo && !proAccess,
      canManageBilling:
        stripeConfigured() && !user.isDemo && Boolean(user.stripeCustomerId),
      subscriptionStatus: user.stripeSubscriptionStatus ?? null,
      currentPeriodEnd: user.stripeCurrentPeriodEnd ?? null,
      trialEndsAt: user.stripeTrialEndsAt ?? null,
      featureGates: {
        scanner: !proAccess,
        notifications: !proAccess,
      },
    };
  },
});

export const viewerForSession = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    return {
      userId: user._id,
      displayName: user.displayName,
      isDemo: user.isDemo,
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
    };
  },
});

export const storeStripeCustomer = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch(userId, { stripeCustomerId });
  },
});

export const applySubscriptionSnapshot = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripeSubscriptionStatus: v.string(),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    stripeTrialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .unique();
    if (!user) return false;

    const next = replaceUserWithoutStripeSnapshot(user, {
      plan: planFromStripeStatus(args.stripeSubscriptionStatus),
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionStatus: args.stripeSubscriptionStatus,
    });
    next.stripeSubscriptionId = args.stripeSubscriptionId;
    if (args.stripePriceId) next.stripePriceId = args.stripePriceId;
    if (args.stripeCurrentPeriodEnd) {
      next.stripeCurrentPeriodEnd = args.stripeCurrentPeriodEnd;
    }
    if (args.stripeTrialEndsAt) next.stripeTrialEndsAt = args.stripeTrialEndsAt;
    await ctx.db.replace("users", user._id, next);
    return true;
  },
});

export const clearSubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, { stripeCustomerId, stripeSubscriptionId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId)
      )
      .unique();
    if (!user) return false;
    if (
      stripeSubscriptionId &&
      user.stripeSubscriptionId &&
      user.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      return false;
    }

    await ctx.db.replace(
      "users",
      user._id,
      replaceUserWithoutStripeSnapshot(user, {
      plan: FREE_PLAN,
      stripeSubscriptionStatus: "canceled",
      stripeCustomerId,
      })
    );
    return true;
  },
});

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function toMillis(timestamp: number | null | undefined): number | undefined {
  return typeof timestamp === "number" ? timestamp * 1000 : undefined;
}

function primaryPriceId(subscription: Stripe.Subscription): string | undefined {
  return subscription.items.data[0]?.price?.id;
}

function currentPeriodEnd(
  subscription: Stripe.Subscription
): number | undefined {
  const candidate = (
    subscription as Stripe.Subscription & { current_period_end?: number | null }
  ).current_period_end;
  return toMillis(candidate);
}

export const stripeWebhook = httpAction(async (ctx, request) => {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe webhook is not configured.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature.", { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook verification failed.";
    return new Response(message, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await ctx.runMutation(internal.billing.applySubscriptionSnapshot, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        stripePriceId: primaryPriceId(subscription),
        stripeCurrentPeriodEnd: currentPeriodEnd(subscription),
        stripeTrialEndsAt: toMillis(subscription.trial_end),
      });
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      await ctx.runMutation(internal.billing.clearSubscription, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
      });
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.mode === "subscription" &&
        typeof session.customer === "string" &&
        session.metadata?.convexUserId
      ) {
        await ctx.runMutation(internal.billing.storeStripeCustomer, {
          userId: session.metadata.convexUserId as Id<"users">,
          stripeCustomerId: session.customer,
        });
      }
      break;
    }
    default:
      break;
  }

  return new Response("ok");
});
