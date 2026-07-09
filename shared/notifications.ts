export const NOTIFICATION_DEFAULTS = {
  dailyCap: 5,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  timezone: "UTC",
  scoreThreshold: 70,
  youngWindowHours: 2,
  golden15Minutes: 15,
} as const;

export const ALL_NOTIFICATION_SOURCES = [
  "following",
  "lists",
  "watched",
  "search",
] as const;

export type NotificationSettingsSource = (typeof ALL_NOTIFICATION_SOURCES)[number];
export type OpportunitySource = "following" | "list" | "watched" | "search";
export type NotificationTier = "golden15" | "hot";

export type NotificationSettingsSnapshot = {
  masterEnabled: boolean;
  pushEnabled: boolean;
  digestEnabled: boolean;
  scoreThreshold: number;
  dailyCap: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  youngWindowHours: number;
  enabledSources: NotificationSettingsSource[];
  permissionGrantedAt?: number | null;
};

export type OpportunityAlertCandidate = {
  score: number;
  postedAt: number;
  source?: OpportunitySource;
};

export type EnqueueDecision =
  | { action: "enqueue"; tier: NotificationTier }
  | { action: "skip"; reason: string };

function parseHm(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function localTimeParts(
  nowMs: number,
  timezone: string
): { hours: number; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(nowMs));
    const hours = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
    const minutes = Number(
      parts.find((part) => part.type === "minute")?.value ?? 0
    );
    return { hours, minutes };
  } catch {
    const date = new Date(nowMs);
    return { hours: date.getUTCHours(), minutes: date.getUTCMinutes() };
  }
}

export function dateKeyForTimezone(nowMs: number, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

export function isInQuietHours(
  nowMs: number,
  quietHoursStart: string,
  quietHoursEnd: string,
  timezone: string
): boolean {
  const { hours, minutes } = localTimeParts(nowMs, timezone);
  const current = hours * 60 + minutes;
  const start = parseHm(quietHoursStart);
  const end = parseHm(quietHoursEnd);
  if (start === end) return false;
  if (start < end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

export function opportunitySourceEnabled(
  source: OpportunitySource | undefined,
  enabledSources: NotificationSettingsSource[]
): boolean {
  if (!source) return true;
  if (source === "list") return enabledSources.includes("lists");
  return enabledSources.includes(source);
}

export function minutesSincePosted(postedAt: number, nowMs: number): number {
  return Math.max(0, (nowMs - postedAt) / 60_000);
}

export function classifyNotificationTier(
  opportunity: OpportunityAlertCandidate,
  settings: Pick<NotificationSettingsSnapshot, "scoreThreshold" | "youngWindowHours">,
  nowMs: number
): NotificationTier | null {
  if (opportunity.score < settings.scoreThreshold) return null;

  const ageMinutes = minutesSincePosted(opportunity.postedAt, nowMs);
  const youngLimitMinutes = settings.youngWindowHours * 60;
  if (ageMinutes > youngLimitMinutes) return null;

  if (
    (opportunity.source === "watched" || opportunity.source === "list") &&
    ageMinutes <= NOTIFICATION_DEFAULTS.golden15Minutes
  ) {
    return "golden15";
  }

  return "hot";
}

export function buildNotificationCopy(tier: NotificationTier): {
  title: string;
  body: string;
} {
  if (tier === "golden15") {
    return {
      title: "Golden-15 window",
      body: "Reply in the next ~15 min — window is still young.",
    };
  }
  return {
    title: "Hot conversation",
    body: "A high-scoring reply window is open — jump in before it cools.",
  };
}

export function buildNotificationDeepLink(
  appUrl: string,
  opportunityId: string,
  alertId: string
): string {
  const base = appUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    opportunity: opportunityId,
    alert: alertId,
  });
  return `${base}/feed?${params.toString()}`;
}

export function canDeliverPush(settings: NotificationSettingsSnapshot): boolean {
  return (
    settings.masterEnabled &&
    settings.pushEnabled &&
    Boolean(settings.permissionGrantedAt)
  );
}

export function evaluateNotificationEnqueue(args: {
  settings: NotificationSettingsSnapshot;
  opportunity: OpportunityAlertCandidate;
  nowMs: number;
  deliveredToday: number;
  existingAlertForOpportunity: boolean;
}): EnqueueDecision {
  const { settings, opportunity, nowMs, deliveredToday, existingAlertForOpportunity } =
    args;

  if (!settings.masterEnabled) {
    return { action: "skip", reason: "master_disabled" };
  }
  if (!settings.pushEnabled && !settings.digestEnabled) {
    return { action: "skip", reason: "channels_disabled" };
  }
  if (!opportunitySourceEnabled(opportunity.source, settings.enabledSources)) {
    return { action: "skip", reason: "source_disabled" };
  }
  if (existingAlertForOpportunity) {
    return { action: "skip", reason: "duplicate_opportunity" };
  }

  const tier = classifyNotificationTier(opportunity, settings, nowMs);
  if (!tier) {
    return { action: "skip", reason: "below_threshold_or_stale" };
  }

  if (
    settings.pushEnabled &&
    canDeliverPush(settings) &&
    !isInQuietHours(
      nowMs,
      settings.quietHoursStart,
      settings.quietHoursEnd,
      settings.timezone
    ) &&
    deliveredToday >= settings.dailyCap
  ) {
    if (!settings.digestEnabled) {
      return { action: "skip", reason: "daily_cap_reached" };
    }
  }

  return { action: "enqueue", tier };
}

export function defaultNotificationSettings(
  nowMs: number
): NotificationSettingsSnapshot & { updatedAt: number } {
  return {
    masterEnabled: false,
    pushEnabled: true,
    digestEnabled: true,
    scoreThreshold: NOTIFICATION_DEFAULTS.scoreThreshold,
    dailyCap: NOTIFICATION_DEFAULTS.dailyCap,
    quietHoursStart: NOTIFICATION_DEFAULTS.quietHoursStart,
    quietHoursEnd: NOTIFICATION_DEFAULTS.quietHoursEnd,
    timezone: NOTIFICATION_DEFAULTS.timezone,
    youngWindowHours: NOTIFICATION_DEFAULTS.youngWindowHours,
    enabledSources: [...ALL_NOTIFICATION_SOURCES],
    updatedAt: nowMs,
  };
}
