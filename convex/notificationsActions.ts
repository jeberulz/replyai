"use node";

import webpush from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { trackConvexEvent } from "./lib/analytics";

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function configureWebPush(): boolean {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return true;
}

type DueAlert = {
  alertId: Id<"notificationAlerts">;
  endpoint: string;
  p256dh: string;
  authKey: string;
  title: string;
  body: string;
  deepLink: string;
  tier: "golden15" | "hot";
  opportunityId: Id<"opportunities">;
  score: number;
  source?: "following" | "list" | "watched" | "search";
};

async function deliverDueAlerts(
  ctx: ActionCtx,
  userId: Id<"users">,
  due: DueAlert[]
): Promise<{ attempted: number; delivered: number; suppressed: number }> {
  if (due.length === 0) {
    return { attempted: 0, delivered: 0, suppressed: 0 };
  }
  if (!configureWebPush()) {
    for (const alert of due) {
      await ctx.runMutation(internal.notifications.suppressAlert, {
        alertId: alert.alertId,
        reason: "vapid_not_configured",
      });
    }
    return { attempted: due.length, delivered: 0, suppressed: due.length };
  }

  let delivered = 0;
  let suppressed = 0;
  for (const alert of due) {
    try {
      await webpush.sendNotification(
        {
          endpoint: alert.endpoint,
          keys: { p256dh: alert.p256dh, auth: alert.authKey },
        },
        JSON.stringify({
          title: alert.title,
          body: alert.body,
          url: alert.deepLink,
          alertId: alert.alertId,
          opportunityId: alert.opportunityId,
        })
      );
      await ctx.runMutation(internal.notifications.markAlertDelivered, {
        userId,
        alertId: alert.alertId,
        channel: "push",
      });
      await trackConvexEvent("notification_alert_delivered", userId, {
        alertId: alert.alertId,
        opportunityId: alert.opportunityId,
        tier: alert.tier,
        channel: "push",
        score: alert.score,
        source: alert.source,
      });
      delivered += 1;
    } catch {
      await ctx.runMutation(internal.notifications.suppressAlert, {
        alertId: alert.alertId,
        reason: "push_delivery_failed",
      });
      suppressed += 1;
    }
  }

  return { attempted: due.length, delivered, suppressed };
}

type DeliveryStats = { attempted: number; delivered: number; suppressed: number };

export const deliverQueuedAlerts = internalAction({
  args: { userId: v.id("users") },
  returns: v.object({
    attempted: v.number(),
    delivered: v.number(),
    suppressed: v.number(),
  }),
  handler: async (ctx, { userId }): Promise<DeliveryStats> => {
    const due: DueAlert[] = await ctx.runQuery(internal.notifications.dueQueuedAlerts, {
      userId,
      limit: 3,
    });
    return await deliverDueAlerts(ctx, userId, due);
  },
});

export const deliverAllQueuedAlerts = internalAction({
  args: {},
  returns: v.object({
    users: v.number(),
    delivered: v.number(),
    suppressed: v.number(),
  }),
  handler: async (ctx): Promise<{ users: number; delivered: number; suppressed: number }> => {
    const userIds: Id<"users">[] = await ctx.runQuery(
      internal.notifications.usersWithQueuedAlerts,
      {}
    );
    let delivered = 0;
    let suppressed = 0;
    for (const userId of userIds) {
      const due: DueAlert[] = await ctx.runQuery(internal.notifications.dueQueuedAlerts, {
        userId,
        limit: 3,
      });
      const result = await deliverDueAlerts(ctx, userId, due);
      delivered += result.delivered;
      suppressed += result.suppressed;
    }
    return { users: userIds.length, delivered, suppressed };
  },
});

export const trackAlertOpened = internalAction({
  args: {
    userId: v.id("users"),
    alertId: v.id("notificationAlerts"),
    opportunityId: v.id("opportunities"),
    tier: v.union(v.literal("golden15"), v.literal("hot")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await trackConvexEvent("notification_alert_opened", args.userId, {
      alertId: args.alertId,
      opportunityId: args.opportunityId,
      tier: args.tier,
    });
    return null;
  },
});

export const trackAlertSent = internalAction({
  args: {
    userId: v.id("users"),
    alertId: v.id("notificationAlerts"),
    opportunityId: v.id("opportunities"),
    tier: v.union(v.literal("golden15"), v.literal("hot")),
    draftId: v.optional(v.id("savedDrafts")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await trackConvexEvent("notification_alert_sent", args.userId, {
      alertId: args.alertId,
      opportunityId: args.opportunityId,
      tier: args.tier,
      draftId: args.draftId,
    });
    return null;
  },
});

export const sendDailyDigests = internalAction({
  args: {},
  returns: v.object({
    users: v.number(),
    alerts: v.number(),
    sent: v.number(),
  }),
  handler: async (ctx): Promise<{ users: number; alerts: number; sent: number }> => {
    const candidates = await ctx.runQuery(internal.notifications.digestCandidates, {
      limit: 50,
    });
    if (candidates.length === 0) {
      return { users: 0, alerts: 0, sent: 0 };
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !from) {
      return { users: candidates.length, alerts: 0, sent: 0 };
    }

    let alertCount = 0;
    let sent = 0;
    for (const batch of candidates) {
      const lines = batch.alerts
        .map(
          (alert) =>
            `• ${alert.title}: ${alert.body}\n  ${alert.deepLink}`
        )
        .join("\n\n");
      alertCount += batch.alerts.length;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [batch.email],
          subject: "ReplyPilot hot-window digest",
          text: `Hot windows you may have missed:\n\n${lines}\n\nEvery reply still needs your explicit click to send.`,
        }),
      });

      if (!response.ok) continue;
      sent += 1;
      for (const alert of batch.alerts) {
        await ctx.runMutation(internal.notifications.markAlertDelivered, {
          userId: batch.userId,
          alertId: alert.alertId,
          channel: "digest",
        });
        await trackConvexEvent("notification_alert_delivered", batch.userId, {
          alertId: alert.alertId,
          opportunityId: alert.opportunityId,
          tier: alert.tier,
          channel: "digest",
          score: alert.score,
        });
      }
    }

    return { users: candidates.length, alerts: alertCount, sent };
  },
});
