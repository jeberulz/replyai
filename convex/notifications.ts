import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { hasProAccess, paidFeatureGateMessage } from "../shared/billing";
import {
  buildNotificationCopy,
  buildNotificationDeepLink,
  canDeliverPush,
  dateKeyForTimezone,
  defaultNotificationSettings,
  evaluateNotificationEnqueue,
  isInQuietHours,
  type NotificationSettingsSnapshot,
} from "../shared/notifications";
import { requireUser } from "./helpers";

const enabledSourceValidator = v.union(
  v.literal("following"),
  v.literal("lists"),
  v.literal("watched"),
  v.literal("search")
);

const settingsReturnValidator = v.object({
  masterEnabled: v.boolean(),
  pushEnabled: v.boolean(),
  digestEnabled: v.boolean(),
  scoreThreshold: v.number(),
  dailyCap: v.number(),
  quietHoursStart: v.string(),
  quietHoursEnd: v.string(),
  timezone: v.string(),
  youngWindowHours: v.number(),
  enabledSources: v.array(enabledSourceValidator),
  optedInAt: v.optional(v.number()),
  permissionGrantedAt: v.optional(v.number()),
  notificationsLocked: v.boolean(),
  hasPushSubscription: v.boolean(),
  pushConfigured: v.boolean(),
  notificationEmail: v.optional(v.string()),
});

function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function getOrCreateSettings(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"notificationSettings">> {
  const existing = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  const defaults = defaultNotificationSettings(now);
  const id = await ctx.db.insert("notificationSettings", {
    userId,
    masterEnabled: defaults.masterEnabled,
    pushEnabled: defaults.pushEnabled,
    digestEnabled: defaults.digestEnabled,
    scoreThreshold: defaults.scoreThreshold,
    dailyCap: defaults.dailyCap,
    quietHoursStart: defaults.quietHoursStart,
    quietHoursEnd: defaults.quietHoursEnd,
    timezone: defaults.timezone,
    youngWindowHours: defaults.youngWindowHours,
    enabledSources: defaults.enabledSources,
    updatedAt: defaults.updatedAt,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create notification settings");
  return created;
}

async function settingsSnapshot(
  row: Doc<"notificationSettings">
): Promise<NotificationSettingsSnapshot> {
  return {
    masterEnabled: row.masterEnabled,
    pushEnabled: row.pushEnabled,
    digestEnabled: row.digestEnabled,
    scoreThreshold: row.scoreThreshold,
    dailyCap: row.dailyCap,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    timezone: row.timezone,
    youngWindowHours: row.youngWindowHours,
    enabledSources: row.enabledSources,
    permissionGrantedAt: row.permissionGrantedAt,
  };
}

async function deliveredCountForDay(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  nowMs: number,
  timezone: string
): Promise<number> {
  const dateKey = dateKeyForTimezone(nowMs, timezone);
  const row = await ctx.db
    .query("notificationDailyCounts")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
    .unique();
  return row?.deliveredCount ?? 0;
}

export const settings = query({
  args: { sessionToken: v.string() },
  returns: v.union(settingsReturnValidator, v.null()),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const subscriptions = row
      ? await ctx.db
          .query("pushSubscriptions")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first()
      : null;

    if (!row) {
      const defaults = defaultNotificationSettings(Date.now());
      return {
        ...defaults,
        optedInAt: undefined,
        permissionGrantedAt: undefined,
        notificationsLocked: !hasProAccess(user),
        hasPushSubscription: false,
        pushConfigured: pushConfigured(),
        notificationEmail: user.notificationEmail,
      };
    }

    return {
      masterEnabled: row.masterEnabled,
      pushEnabled: row.pushEnabled,
      digestEnabled: row.digestEnabled,
      scoreThreshold: row.scoreThreshold,
      dailyCap: row.dailyCap,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      timezone: row.timezone,
      youngWindowHours: row.youngWindowHours,
      enabledSources: row.enabledSources,
      optedInAt: row.optedInAt,
      permissionGrantedAt: row.permissionGrantedAt,
      notificationsLocked: !hasProAccess(user),
      hasPushSubscription: Boolean(subscriptions),
      pushConfigured: pushConfigured(),
      notificationEmail: user.notificationEmail,
    };
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    masterEnabled: v.optional(v.boolean()),
    pushEnabled: v.optional(v.boolean()),
    digestEnabled: v.optional(v.boolean()),
    scoreThreshold: v.optional(v.number()),
    dailyCap: v.optional(v.number()),
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
    timezone: v.optional(v.string()),
    youngWindowHours: v.optional(v.number()),
    enabledSources: v.optional(v.array(enabledSourceValidator)),
    notificationEmail: v.optional(v.string()),
  },
  returns: settingsReturnValidator,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    if (!hasProAccess(user)) {
      throw new Error(paidFeatureGateMessage("notifications"));
    }

    const row = await getOrCreateSettings(ctx, user._id);
    const now = Date.now();
    const patch: Partial<Doc<"notificationSettings">> = { updatedAt: now };

    if (args.masterEnabled !== undefined) {
      patch.masterEnabled = args.masterEnabled;
      if (args.masterEnabled) patch.optedInAt = row.optedInAt ?? now;
    }
    if (args.pushEnabled !== undefined) patch.pushEnabled = args.pushEnabled;
    if (args.digestEnabled !== undefined) {
      patch.digestEnabled = args.digestEnabled;
    }
    if (args.scoreThreshold !== undefined) {
      patch.scoreThreshold = Math.min(100, Math.max(0, args.scoreThreshold));
    }
    if (args.dailyCap !== undefined) {
      patch.dailyCap = Math.min(20, Math.max(1, args.dailyCap));
    }
    if (args.quietHoursStart !== undefined) {
      patch.quietHoursStart = args.quietHoursStart;
    }
    if (args.quietHoursEnd !== undefined) patch.quietHoursEnd = args.quietHoursEnd;
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (args.youngWindowHours !== undefined) {
      patch.youngWindowHours = Math.min(8, Math.max(1, args.youngWindowHours));
    }
    if (args.enabledSources !== undefined) {
      patch.enabledSources = args.enabledSources;
    }

    await ctx.db.patch(row._id, patch);

    if (args.notificationEmail !== undefined) {
      const trimmed = args.notificationEmail.trim();
      await ctx.db.patch(user._id, {
        notificationEmail: trimmed.length > 0 ? trimmed : undefined,
      });
    }

    const updated = await ctx.db.get(row._id);
    if (!updated) throw new Error("Settings missing after update");
    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const refreshedUser = await ctx.db.get(user._id);

    return {
      masterEnabled: updated.masterEnabled,
      pushEnabled: updated.pushEnabled,
      digestEnabled: updated.digestEnabled,
      scoreThreshold: updated.scoreThreshold,
      dailyCap: updated.dailyCap,
      quietHoursStart: updated.quietHoursStart,
      quietHoursEnd: updated.quietHoursEnd,
      timezone: updated.timezone,
      youngWindowHours: updated.youngWindowHours,
      enabledSources: updated.enabledSources,
      optedInAt: updated.optedInAt,
      permissionGrantedAt: updated.permissionGrantedAt,
      notificationsLocked: false,
      hasPushSubscription: Boolean(subscription),
      pushConfigured: pushConfigured(),
      notificationEmail: refreshedUser?.notificationEmail,
    };
  },
});

export const savePushSubscription = mutation({
  args: {
    sessionToken: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
  },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    if (!hasProAccess(user)) {
      throw new Error(paidFeatureGateMessage("notifications"));
    }

    const now = Date.now();
    const settingsRow = await getOrCreateSettings(ctx, user._id);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      if (existing.userId !== user._id) {
        throw new Error("Push subscription already registered to another user");
      }
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        authKey: args.authKey,
        userAgent: args.userAgent,
        lastUsedAt: now,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        userId: user._id,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        authKey: args.authKey,
        userAgent: args.userAgent,
        createdAt: now,
        lastUsedAt: now,
      });
    }

    await ctx.db.patch(settingsRow._id, {
      permissionGrantedAt: now,
      masterEnabled: true,
      optedInAt: settingsRow.optedInAt ?? now,
      updatedAt: now,
    });

    return { saved: true };
  },
});

export const removePushSubscription = mutation({
  args: { sessionToken: v.string() },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    const settingsRow = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (settingsRow) {
      await ctx.db.patch(settingsRow._id, {
        permissionGrantedAt: undefined,
        pushEnabled: false,
        updatedAt: Date.now(),
      });
    }
    return { removed: rows.length };
  },
});

export const markAlertOpened = mutation({
  args: {
    sessionToken: v.string(),
    alertId: v.id("notificationAlerts"),
  },
  returns: v.union(
    v.object({
      opened: v.literal(true),
      opportunityId: v.id("opportunities"),
      tier: v.union(v.literal("golden15"), v.literal("hot")),
    }),
    v.object({ opened: v.literal(false) })
  ),
  handler: async (ctx, { sessionToken, alertId }) => {
    const user = await requireUser(ctx, sessionToken);
    const alert = await ctx.db.get(alertId);
    if (!alert || alert.userId !== user._id) {
      return { opened: false as const };
    }
    if (alert.status === "opened" || alert.status === "sent") {
      return {
        opened: true as const,
        opportunityId: alert.opportunityId,
        tier: alert.tier,
      };
    }
    const now = Date.now();
    await ctx.db.patch(alertId, {
      status: "opened",
      openedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.notificationsActions.trackAlertOpened, {
      userId: user._id,
      alertId,
      opportunityId: alert.opportunityId,
      tier: alert.tier,
    });
    return {
      opened: true as const,
      opportunityId: alert.opportunityId,
      tier: alert.tier,
    };
  },
});

export const evaluateOpportunity = internalMutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
  },
  returns: v.union(v.id("notificationAlerts"), v.null()),
  handler: async (ctx, { userId, opportunityId }) => {
    const user = await ctx.db.get(userId);
    if (!user || !hasProAccess(user)) return null;

    const opportunity = await ctx.db.get(opportunityId);
    if (!opportunity || opportunity.userId !== userId || opportunity.status !== "new") {
      return null;
    }

    const settingsRow = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settingsRow) return null;

    const now = Date.now();
    const snapshot = await settingsSnapshot(settingsRow);
    const existing = await ctx.db
      .query("notificationAlerts")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunityId))
      .first();
    const deliveredToday = await deliveredCountForDay(
      ctx,
      userId,
      now,
      settingsRow.timezone
    );

    const decision = evaluateNotificationEnqueue({
      settings: snapshot,
      opportunity: {
        score: opportunity.score,
        postedAt: opportunity.postedAt,
        source: opportunity.source,
      },
      nowMs: now,
      deliveredToday,
      existingAlertForOpportunity: Boolean(existing),
    });
    if (decision.action === "skip") return null;

    const copy = buildNotificationCopy(decision.tier);
    const alertId = await ctx.db.insert("notificationAlerts", {
      userId,
      opportunityId,
      tier: decision.tier,
      channel: "push",
      status: "queued",
      title: copy.title,
      body: copy.body,
      deepLink: "",
      score: opportunity.score,
      source: opportunity.source,
      createdAt: now,
    });
    await ctx.db.patch(alertId, {
      deepLink: buildNotificationDeepLink(appUrl(), opportunityId, alertId),
    });

    await ctx.scheduler.runAfter(0, internal.notificationsActions.deliverQueuedAlerts, {
      userId,
    });
    return alertId;
  },
});

export const dueQueuedAlerts = internalQuery({
  args: { userId: v.id("users"), limit: v.number() },
  returns: v.array(
    v.object({
      alertId: v.id("notificationAlerts"),
      endpoint: v.string(),
      p256dh: v.string(),
      authKey: v.string(),
      title: v.string(),
      body: v.string(),
      deepLink: v.string(),
      tier: v.union(v.literal("golden15"), v.literal("hot")),
      opportunityId: v.id("opportunities"),
      score: v.number(),
      source: v.optional(
        v.union(
          v.literal("following"),
          v.literal("list"),
          v.literal("watched"),
          v.literal("search")
        )
      ),
    })
  ),
  handler: async (ctx, { userId, limit }) => {
    const settingsRow = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settingsRow) return [];

    const snapshot = await settingsSnapshot(settingsRow);
    const now = Date.now();
    const quiet = isInQuietHours(
      now,
      settingsRow.quietHoursStart,
      settingsRow.quietHoursEnd,
      settingsRow.timezone
    );
    const deliveredToday = await deliveredCountForDay(
      ctx,
      userId,
      now,
      settingsRow.timezone
    );
    const canPush =
      canDeliverPush(snapshot) &&
      !quiet &&
      deliveredToday < settingsRow.dailyCap &&
      pushConfigured();
    if (!canPush) return [];

    const subscription = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!subscription) return [];

    const queued = await ctx.db
      .query("notificationAlerts")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "queued"))
      .take(limit);

    return queued.map((alert) => ({
      alertId: alert._id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      authKey: subscription.authKey,
      title: alert.title,
      body: alert.body,
      deepLink: alert.deepLink,
      tier: alert.tier,
      opportunityId: alert.opportunityId,
      score: alert.score,
      source: alert.source,
    }));
  },
});

export const markAlertDelivered = internalMutation({
  args: {
    userId: v.id("users"),
    alertId: v.id("notificationAlerts"),
    channel: v.union(v.literal("push"), v.literal("digest")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, alertId, channel }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert || alert.userId !== userId) return null;
    const now = Date.now();
    await ctx.db.patch(alertId, {
      status: "delivered",
      channel,
      deliveredAt: now,
    });

    const settingsRow = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!settingsRow) return null;

    if (channel === "push") {
      const dateKey = dateKeyForTimezone(now, settingsRow.timezone);
      const countRow = await ctx.db
        .query("notificationDailyCounts")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
        .unique();
      if (countRow) {
        await ctx.db.patch(countRow._id, {
          deliveredCount: countRow.deliveredCount + 1,
        });
      } else {
        await ctx.db.insert("notificationDailyCounts", {
          userId,
          dateKey,
          deliveredCount: 1,
        });
      }
    }
    return null;
  },
});

export const suppressAlert = internalMutation({
  args: {
    alertId: v.id("notificationAlerts"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { alertId, reason }) => {
    const alert = await ctx.db.get(alertId);
    if (!alert || alert.status !== "queued") return null;
    await ctx.db.patch(alertId, {
      status: "suppressed",
      suppressedReason: reason,
    });
    return null;
  },
});

export const markAlertSent = internalMutation({
  args: {
    userId: v.id("users"),
    opportunityId: v.id("opportunities"),
    draftId: v.optional(v.id("savedDrafts")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, opportunityId, draftId }) => {
    const alerts = await ctx.db
      .query("notificationAlerts")
      .withIndex("by_opportunity", (q) => q.eq("opportunityId", opportunityId))
      .collect();
    const candidate = alerts
      .filter((row) => row.userId === userId)
      .sort((a, b) => (b.openedAt ?? b.deliveredAt ?? b.createdAt) - (a.openedAt ?? a.deliveredAt ?? a.createdAt))[0];
    if (!candidate || candidate.status === "sent") return null;
    if (candidate.status !== "opened" && candidate.status !== "delivered") {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch(candidate._id, { status: "sent", sentAt: now });
    await ctx.scheduler.runAfter(0, internal.notificationsActions.trackAlertSent, {
      userId,
      alertId: candidate._id,
      opportunityId,
      tier: candidate.tier,
      draftId,
    });
    return null;
  },
});

export const digestCandidates = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      email: v.string(),
      alerts: v.array(
        v.object({
          alertId: v.id("notificationAlerts"),
          opportunityId: v.id("opportunities"),
          title: v.string(),
          body: v.string(),
          deepLink: v.string(),
          tier: v.union(v.literal("golden15"), v.literal("hot")),
          score: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, { limit }) => {
    const settingsRows = await ctx.db.query("notificationSettings").take(500);
    const output: Array<{
      userId: Id<"users">;
      email: string;
      alerts: Array<{
        alertId: Id<"notificationAlerts">;
        opportunityId: Id<"opportunities">;
        title: string;
        body: string;
        deepLink: string;
        tier: "golden15" | "hot";
        score: number;
      }>;
    }> = [];

    for (const settingsRow of settingsRows) {
      if (!settingsRow.digestEnabled || !settingsRow.masterEnabled) continue;
      const user = await ctx.db.get(settingsRow.userId);
      if (!user || !hasProAccess(user)) continue;
      const email = user.notificationEmail?.trim();
      if (!email) continue;

      const queued = await ctx.db
        .query("notificationAlerts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", settingsRow.userId).eq("status", "queued")
        )
        .take(10);
      if (queued.length === 0) continue;

      output.push({
        userId: settingsRow.userId,
        email,
        alerts: queued.map((alert) => ({
          alertId: alert._id,
          opportunityId: alert.opportunityId,
          title: alert.title,
          body: alert.body,
          deepLink: alert.deepLink,
          tier: alert.tier,
          score: alert.score,
        })),
      });
      if (output.length >= limit) break;
    }

    return output;
  },
});

export const usersWithQueuedAlerts = internalQuery({
  args: {},
  returns: v.array(v.id("users")),
  handler: async (ctx) => {
    const rows = await ctx.db.query("notificationAlerts").collect();
    const userIds = new Set<Id<"users">>();
    for (const row of rows) {
      if (row.status === "queued") userIds.add(row.userId);
    }
    return [...userIds];
  },
});

export const expireStaleQueued = internalMutation({
  args: { olderThanMs: v.number() },
  returns: v.number(),
  handler: async (ctx, { olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;
    let expired = 0;
    const allQueued = await ctx.db.query("notificationAlerts").collect();
    for (const row of allQueued) {
      if (row.status === "queued" && row.createdAt < cutoff) {
        await ctx.db.patch(row._id, { status: "expired" });
        expired += 1;
      }
    }
    return expired;
  },
});
