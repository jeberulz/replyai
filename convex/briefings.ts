import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { hasProAccess, paidFeatureGateMessage } from "../shared/billing";
import {
  BRIEFING_DEFAULTS,
  briefingSettingsDefaults,
  clampHourLocal,
  defaultBriefingSettings,
  localDayKey,
  shouldEnqueueBriefing,
  type BriefingSettingsSnapshot,
} from "../shared/briefings";
import { requireUser } from "./helpers";

const artifactValidator = v.object({
  opportunities: v.array(
    v.object({
      opportunityId: v.optional(v.string()),
      authorHandle: v.string(),
      textPreview: v.string(),
      angle: v.string(),
      reason: v.string(),
    })
  ),
  outcomes: v.object({
    analyzed: v.number(),
    sent: v.number(),
    responded: v.number(),
    summary: v.string(),
  }),
  coachingInsight: v.string(),
  generatedAt: v.number(),
  demo: v.boolean(),
});

const settingsReturnValidator = v.object({
  enabled: v.boolean(),
  hourLocal: v.number(),
  timezone: v.string(),
  emailOptIn: v.boolean(),
  optedInAt: v.optional(v.number()),
  briefingLocked: v.boolean(),
});

const runReturnValidator = v.object({
  _id: v.id("briefingRuns"),
  localDay: v.string(),
  status: v.union(
    v.literal("running"),
    v.literal("complete"),
    v.literal("failed")
  ),
  error: v.optional(v.string()),
  opportunityCount: v.number(),
  outcomeCount: v.number(),
  artifact: v.optional(artifactValidator),
  emailStatus: v.optional(
    v.union(v.literal("skipped"), v.literal("sent"), v.literal("failed"))
  ),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

async function getOrCreateSettings(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"briefingSettings">> {
  const existing = await ctx.db
    .query("briefingSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  const defaults = defaultBriefingSettings(now);

  // Prefer notification timezone when the user already configured one.
  const notificationSettings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  const timezone =
    notificationSettings?.timezone ?? defaults.timezone;

  const id = await ctx.db.insert("briefingSettings", {
    userId,
    enabled: defaults.enabled,
    hourLocal: defaults.hourLocal,
    timezone,
    emailOptIn: defaults.emailOptIn,
    updatedAt: defaults.updatedAt,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create briefing settings");
  return created;
}

function toSettingsSnapshot(
  row: Doc<"briefingSettings">
): BriefingSettingsSnapshot {
  return {
    enabled: row.enabled,
    hourLocal: row.hourLocal,
    timezone: row.timezone,
    emailOptIn: row.emailOptIn,
  };
}

function serializeRun(run: Doc<"briefingRuns">) {
  return {
    _id: run._id,
    localDay: run.localDay,
    status: run.status,
    error: run.error,
    opportunityCount: run.opportunityCount,
    outcomeCount: run.outcomeCount,
    artifact: run.artifact,
    emailStatus: run.emailStatus,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  };
}

export const settings = query({
  args: { sessionToken: v.string() },
  returns: settingsReturnValidator,
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const row = await ctx.db
      .query("briefingSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const locked = !hasProAccess(user);

    if (!row) {
      return {
        ...briefingSettingsDefaults(),
        optedInAt: undefined,
        briefingLocked: locked,
      };
    }

    return {
      enabled: row.enabled,
      hourLocal: row.hourLocal,
      timezone: row.timezone,
      emailOptIn: row.emailOptIn,
      optedInAt: row.optedInAt,
      briefingLocked: locked,
    };
  },
});

export const updateSettings = mutation({
  args: {
    sessionToken: v.string(),
    enabled: v.optional(v.boolean()),
    hourLocal: v.optional(v.number()),
    timezone: v.optional(v.string()),
    emailOptIn: v.optional(v.boolean()),
  },
  returns: settingsReturnValidator,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.sessionToken);
    if (!hasProAccess(user)) {
      throw new Error(paidFeatureGateMessage("briefing"));
    }

    const row = await getOrCreateSettings(ctx, user._id);
    const now = Date.now();
    const patch: Partial<Doc<"briefingSettings">> = { updatedAt: now };

    if (args.enabled !== undefined) {
      patch.enabled = args.enabled;
      if (args.enabled) patch.optedInAt = row.optedInAt ?? now;
    }
    if (args.hourLocal !== undefined) {
      patch.hourLocal = clampHourLocal(args.hourLocal);
    }
    if (args.timezone !== undefined) {
      const trimmed = args.timezone.trim();
      patch.timezone = trimmed.length > 0 ? trimmed : BRIEFING_DEFAULTS.timezone;
    }
    if (args.emailOptIn !== undefined) {
      patch.emailOptIn = args.emailOptIn;
    }

    await ctx.db.patch(row._id, patch);
    const updated = await ctx.db.get(row._id);
    if (!updated) throw new Error("Briefing settings missing after update");

    return {
      enabled: updated.enabled,
      hourLocal: updated.hourLocal,
      timezone: updated.timezone,
      emailOptIn: updated.emailOptIn,
      optedInAt: updated.optedInAt,
      briefingLocked: false,
    };
  },
});

export const latestRun = query({
  args: { sessionToken: v.string() },
  returns: v.union(runReturnValidator, v.null()),
  handler: async (ctx, { sessionToken }) => {
    const user = await requireUser(ctx, sessionToken);
    const runs = await ctx.db
      .query("briefingRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);
    const run = runs[0];
    return run ? serializeRun(run) : null;
  },
});

export const listRuns = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(runReturnValidator),
  handler: async (ctx, { sessionToken, limit }) => {
    const user = await requireUser(ctx, sessionToken);
    const take = Math.min(30, Math.max(1, limit ?? 10));
    const runs = await ctx.db
      .query("briefingRuns")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(take);
    return runs.map(serializeRun);
  },
});

export const getRun = query({
  args: {
    sessionToken: v.string(),
    runId: v.id("briefingRuns"),
  },
  returns: v.union(runReturnValidator, v.null()),
  handler: async (ctx, { sessionToken, runId }) => {
    const user = await requireUser(ctx, sessionToken);
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== user._id) return null;
    return serializeRun(run);
  },
});

/** Internal: settings snapshot for cron / actions. */
export const getSettingsForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      enabled: v.boolean(),
      hourLocal: v.number(),
      timezone: v.string(),
      emailOptIn: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("briefingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return null;
    return toSettingsSnapshot(row);
  },
});

export const hasRunForLocalDay = internalQuery({
  args: {
    userId: v.id("users"),
    localDay: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { userId, localDay }) => {
    const existing = await ctx.db
      .query("briefingRuns")
      .withIndex("by_user_local_day", (q) =>
        q.eq("userId", userId).eq("localDay", localDay)
      )
      .first();
    return Boolean(existing);
  },
});

export const startRun = internalMutation({
  args: {
    userId: v.id("users"),
    localDay: v.string(),
  },
  returns: v.union(v.id("briefingRuns"), v.null()),
  handler: async (ctx, { userId, localDay }) => {
    const existing = await ctx.db
      .query("briefingRuns")
      .withIndex("by_user_local_day", (q) =>
        q.eq("userId", userId).eq("localDay", localDay)
      )
      .first();
    if (existing) return null;

    const now = Date.now();
    const runId = await ctx.db.insert("briefingRuns", {
      userId,
      localDay,
      status: "running",
      opportunityCount: 0,
      outcomeCount: 0,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.briefingActions.generateBriefing, {
      runId,
      userId,
    });

    return runId;
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("briefingRuns"),
    opportunityCount: v.number(),
    outcomeCount: v.number(),
    artifact: artifactValidator,
    emailStatus: v.optional(
      v.union(v.literal("skipped"), v.literal("sent"), v.literal("failed"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "running") return null;
    await ctx.db.patch(args.runId, {
      status: "complete",
      opportunityCount: args.opportunityCount,
      outcomeCount: args.outcomeCount,
      artifact: args.artifact,
      emailStatus: args.emailStatus ?? "skipped",
      completedAt: Date.now(),
      error: undefined,
    });
    return null;
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("briefingRuns"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, error }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "running") return null;
    await ctx.db.patch(runId, {
      status: "failed",
      error,
      completedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Hourly cron entry: find enabled Pro/demo users whose local hour matches
 * and who lack a run for today's local day, then enqueue generate.
 */
export const dispatchDueBriefings = internalMutation({
  args: { nowMs: v.optional(v.number()) },
  returns: v.object({
    enqueued: v.number(),
    runIds: v.array(v.id("briefingRuns")),
  }),
  handler: async (ctx, { nowMs }) => {
    const now = nowMs ?? Date.now();
    const settingsRows = await ctx.db.query("briefingSettings").collect();
    const runIds: Id<"briefingRuns">[] = [];

    for (const settings of settingsRows) {
      if (!settings.enabled) continue;

      const user = await ctx.db.get(settings.userId);
      if (!user || !hasProAccess(user)) continue;

      const day = localDayKey(now, settings.timezone);
      const existing = await ctx.db
        .query("briefingRuns")
        .withIndex("by_user_local_day", (q) =>
          q.eq("userId", settings.userId).eq("localDay", day)
        )
        .first();

      if (
        !shouldEnqueueBriefing({
          nowMs: now,
          settings: toSettingsSnapshot(settings),
          hasRunForLocalDay: Boolean(existing),
        })
      ) {
        continue;
      }

      const runId = await ctx.db.insert("briefingRuns", {
        userId: settings.userId,
        localDay: day,
        status: "running",
        opportunityCount: 0,
        outcomeCount: 0,
        createdAt: now,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.briefingActions.generateBriefing,
        { runId, userId: settings.userId }
      );
      runIds.push(runId);
    }

    return { enqueued: runIds.length, runIds };
  },
});

/** Load overnight opportunities + yesterday outcomes for the action. */
export const loadBriefingContext = internalQuery({
  args: {
    userId: v.id("users"),
    nowMs: v.number(),
  },
  returns: v.object({
    timezone: v.string(),
    emailOptIn: v.boolean(),
    notificationEmail: v.optional(v.string()),
    username: v.optional(v.string()),
    opportunities: v.array(
      v.object({
        opportunityId: v.string(),
        authorHandle: v.string(),
        text: v.string(),
        suggestedAngle: v.string(),
        reason: v.string(),
        score: v.number(),
        scannedAt: v.number(),
        outcome: v.optional(
          v.union(
            v.literal("ignored"),
            v.literal("analyzed"),
            v.literal("sent"),
            v.literal("responded")
          )
        ),
      })
    ),
    yesterdayOutcomes: v.object({
      analyzed: v.number(),
      sent: v.number(),
      responded: v.number(),
    }),
    rankingWeights: v.union(
      v.object({
        updatedAt: v.number(),
        sourceMultipliers: v.optional(
          v.object({
            following: v.optional(v.number()),
            list: v.optional(v.number()),
            watched: v.optional(v.number()),
            search: v.optional(v.number()),
          })
        ),
        followerBandMultipliers: v.optional(
          v.object({
            micro: v.optional(v.number()),
            small: v.optional(v.number()),
            medium: v.optional(v.number()),
            large: v.optional(v.number()),
          })
        ),
        scoreDecileMultipliers: v.optional(v.record(v.string(), v.number())),
      }),
      v.null()
    ),
  }),
  handler: async (ctx, { userId, nowMs }) => {
    const settings = await ctx.db
      .query("briefingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const timezone = settings?.timezone ?? BRIEFING_DEFAULTS.timezone;
    const emailOptIn = settings?.emailOptIn ?? false;

    const user = await ctx.db.get(userId);
    const overnightMs = 18 * 60 * 60 * 1000;
    const since = nowMs - overnightMs;

    const recent = await ctx.db
      .query("opportunities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const overnight = recent
      .filter(
        (row) =>
          row.scannedAt >= since &&
          row.status !== "dismissed"
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map((row) => ({
        opportunityId: row._id,
        authorHandle: row.authorHandle,
        text: row.text,
        suggestedAngle: row.suggestedAngle,
        reason: row.reason,
        score: row.score,
        scannedAt: row.scannedAt,
        outcome: row.outcome,
      }));

    // Yesterday in user timezone: previous local calendar day window approx
    // via scannedAt / outcome timestamps in last 24–48h bucket.
    const dayMs = 24 * 60 * 60 * 1000;
    const yesterdayStart = nowMs - 2 * dayMs;
    const yesterdayEnd = nowMs - dayMs;
    const yesterdayRows = recent.filter((row) => {
      const ts = row.respondedAt ?? row.sentAt ?? row.analyzedAt ?? row.scannedAt;
      return ts >= yesterdayStart && ts < yesterdayEnd;
    });

    let analyzed = 0;
    let sent = 0;
    let responded = 0;
    for (const row of yesterdayRows) {
      if (
        row.outcome === "analyzed" ||
        row.outcome === "sent" ||
        row.outcome === "responded" ||
        row.status === "analyzed"
      ) {
        analyzed += 1;
      }
      if (row.outcome === "sent" || row.outcome === "responded") sent += 1;
      if (row.outcome === "responded") responded += 1;
    }

    const scannerSettings = await ctx.db
      .query("scannerSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      timezone,
      emailOptIn,
      notificationEmail: user?.notificationEmail,
      username: user?.username,
      opportunities: overnight,
      yesterdayOutcomes: { analyzed, sent, responded },
      rankingWeights: scannerSettings?.rankingWeights ?? null,
    };
  },
});
