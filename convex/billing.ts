import Stripe from "stripe";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  env,
  httpAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireUser } from "./helpers";
import { captureConvexException } from "./lib/sentry";
import { getStripe, stripeConfigured } from "./lib/stripe";
import {
  FREE_PLAN,
  hasProAccess,
  planFromStripeStatus,
} from "../shared/billing";

export const status = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const proAccess = hasProAccess(user);
    const configured = stripeConfigured();
    return {
      plan: user.plan,
      isDemo: user.isDemo,
      hasProAccess: proAccess,
      stripeConfigured: configured,
      canStartCheckout: configured && !user.isDemo && !proAccess,
      canManageBilling:
        configured && !user.isDemo && Boolean(user.stripeCustomerId),
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
    if (!user) return "no_user";

    // Stripe does not guarantee webhook ordering and retries deliveries:
    // once this exact subscription has been processed as canceled, a late
    // "updated" event carrying an older active status must not resurrect it.
    if (
      user.stripeSubscriptionId === args.stripeSubscriptionId &&
      user.stripeSubscriptionStatus === "canceled"
    ) {
      return "stale";
    }

    // Explicit undefined clears a field (snapshot semantics): values the
    // incoming event doesn't carry must not survive from a prior state.
    await ctx.db.patch(user._id, {
      plan: planFromStripeStatus(args.stripeSubscriptionStatus),
      stripeSubscriptionStatus: args.stripeSubscriptionStatus,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      stripeCurrentPeriodEnd: args.stripeCurrentPeriodEnd,
      stripeTrialEndsAt: args.stripeTrialEndsAt,
    });
    return "applied";
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
    if (!user) return "no_user";
    if (
      stripeSubscriptionId &&
      user.stripeSubscriptionId &&
      user.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      // A delete for a subscription we no longer track (user re-subscribed
      // under a new subscription id) must not downgrade the current one.
      return "stale";
    }

    // stripeSubscriptionId is deliberately kept: applySubscriptionSnapshot's
    // out-of-order guard needs to recognize late events for this canceled id.
    await ctx.db.patch(user._id, {
      plan: FREE_PLAN,
      stripeSubscriptionStatus: "canceled",
      stripePriceId: undefined,
      stripeCurrentPeriodEnd: undefined,
      stripeTrialEndsAt: undefined,
    });
    return "applied";
  },
});

function toMillis(timestamp: number | null | undefined): number | undefined {
  return typeof timestamp === "number" ? timestamp * 1000 : undefined;
}

function primaryPriceId(subscription: Stripe.Subscription): string | undefined {
  return subscription.items.data[0]?.price?.id;
}

function currentPeriodEnd(
  subscription: Stripe.Subscription
): number | undefined {
  // Since Stripe API 2025-08-27 (pinned by the installed SDK),
  // current_period_end lives on each subscription item, not the
  // subscription. Our subscriptions have a single price; take the latest
  // item period end to be safe.
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((end): end is number => typeof end === "number");
  return ends.length > 0 ? toMillis(Math.max(...ends)) : undefined;
}

export const stripeWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!stripeConfigured() || !webhookSecret) {
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
      webhookSecret,
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
      const result = await ctx.runMutation(
        internal.billing.applySubscriptionSnapshot,
        {
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
          stripePriceId: primaryPriceId(subscription),
          stripeCurrentPeriodEnd: currentPeriodEnd(subscription),
          stripeTrialEndsAt: toMillis(subscription.trial_end),
        }
      );
      if (result === "no_user") {
        // A paying customer we can't map to a user is an incident, not a
        // silent no-op — without this signal "paid but still Free" is
        // undiagnosable.
        await captureConvexException(
          new Error("Stripe webhook: no user matched subscription event"),
          { eventType: event.type, stripeCustomerId, subscriptionId: subscription.id }
        );
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const result = await ctx.runMutation(internal.billing.clearSubscription, {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
      });
      if (result === "no_user") {
        await captureConvexException(
          new Error("Stripe webhook: no user matched subscription delete"),
          { eventType: event.type, stripeCustomerId, subscriptionId: subscription.id }
        );
      }
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
