export const DAILY_REPLY_TARGET_MIN = 15;
export const DAILY_REPLY_TARGET_MAX = 20;
export const DAILY_REPLY_WATCH_THRESHOLD = 35;
export const DAILY_REPLY_WARNING_THRESHOLD = 45;
export const DAILY_REPLY_LIMIT_THRESHOLD = 50;
const HISTORY_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_HOURS = [9, 12, 16] as const;

export type ReplyEditBucket =
  | "no_edit"
  | "minor_edit"
  | "major_edit"
  | null
  | undefined;

export type PublishedReplyPoint = {
  publishedAt: number;
  editBucket?: ReplyEditBucket;
};

export type PacingDraftInput = {
  id: string;
  kind: string;
  status: "draft" | "scheduled" | "published" | "failed";
  publishedAt?: number;
  scheduledFor?: number;
  editBucket?: ReplyEditBucket;
};

/** Kinds that consume daily X publish volume for account-health pacing. */
export function isPacingPublishKind(kind: string): boolean {
  return kind === "reply" || kind === "quote" || kind === "standalone";
}

/**
 * Build observed publish points for pacing from saved drafts.
 * Includes in-flight scheduled publishes once their send time is due.
 */
export function collectPacingPublishPoints(
  drafts: PacingDraftInput[],
  nowMs: number
): PublishedReplyPoint[] {
  const points: PublishedReplyPoint[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (!isPacingPublishKind(draft.kind)) continue;

    if (draft.status === "published" && draft.publishedAt != null) {
      if (seen.has(draft.id)) continue;
      seen.add(draft.id);
      points.push({
        publishedAt: draft.publishedAt,
        editBucket: draft.editBucket,
      });
      continue;
    }

    if (
      draft.status === "scheduled" &&
      draft.scheduledFor != null &&
      draft.scheduledFor <= nowMs
    ) {
      if (seen.has(draft.id)) continue;
      seen.add(draft.id);
      points.push({
        publishedAt: draft.scheduledFor,
        editBucket: draft.editBucket,
      });
    }
  }

  return points;
}

export type LiveOpportunityPoint = {
  postedAt: number;
  scannedAt: number;
  score: number;
  status: "new" | "dismissed" | "analyzed" | "archived";
};

export type ReplyPacingWarningLevel = "none" | "watch" | "warning" | "limit";
export type ReplyPacingProgress = "starting" | "target" | "above_target";
export type BestWindowSource = "blend" | "history" | "live" | "default";

export type BestReplyWindow = {
  hour: number;
  label: string;
  source: BestWindowSource;
  opportunityCount: number;
  historyCount: number;
  noOrMinorRate: number | null;
  reason: string;
};

export type ReplyPacingSummary = {
  sentRepliesToday: number;
  targetMin: number;
  targetMax: number;
  remainingToTarget: number;
  warningLevel: ReplyPacingWarningLevel;
  progress: ReplyPacingProgress;
  headline: string;
  detail: string;
  bestWindowSource: BestWindowSource;
  bestWindows: BestReplyWindow[];
};

type HourStats = {
  historyCount: number;
  noOrMinorCount: number;
  opportunityCount: number;
  topOpportunityScore: number;
};

export function summarizeReplyPacing({
  nowMs,
  timezoneOffsetMinutes,
  publishedReplies,
  liveOpportunities,
}: {
  nowMs: number;
  timezoneOffsetMinutes: number;
  publishedReplies: PublishedReplyPoint[];
  liveOpportunities: LiveOpportunityPoint[];
}): ReplyPacingSummary {
  const sentRepliesToday = publishedReplies.filter((reply) =>
    isSameLocalDay(reply.publishedAt, nowMs, timezoneOffsetMinutes)
  ).length;
  const warningLevel = getReplyPacingWarningLevel(sentRepliesToday);
  const progress = getReplyPacingProgress(sentRepliesToday);
  const bestWindows = deriveBestReplyWindows({
    nowMs,
    timezoneOffsetMinutes,
    publishedReplies,
    liveOpportunities,
  });

  return {
    sentRepliesToday,
    targetMin: DAILY_REPLY_TARGET_MIN,
    targetMax: DAILY_REPLY_TARGET_MAX,
    remainingToTarget: Math.max(0, DAILY_REPLY_TARGET_MIN - sentRepliesToday),
    warningLevel,
    progress,
    headline: buildHeadline(sentRepliesToday, warningLevel),
    detail: buildDetail(sentRepliesToday, warningLevel),
    bestWindowSource: bestWindows[0]?.source ?? "default",
    bestWindows,
  };
}

export function getReplyPacingWarningLevel(
  sentRepliesToday: number
): ReplyPacingWarningLevel {
  if (sentRepliesToday >= DAILY_REPLY_LIMIT_THRESHOLD) return "limit";
  if (sentRepliesToday >= DAILY_REPLY_WARNING_THRESHOLD) return "warning";
  if (sentRepliesToday >= DAILY_REPLY_WATCH_THRESHOLD) return "watch";
  return "none";
}

export function getReplyPacingProgress(
  sentRepliesToday: number
): ReplyPacingProgress {
  if (sentRepliesToday < DAILY_REPLY_TARGET_MIN) return "starting";
  if (sentRepliesToday <= DAILY_REPLY_TARGET_MAX) return "target";
  return "above_target";
}

export function deriveBestReplyWindows({
  nowMs,
  timezoneOffsetMinutes,
  publishedReplies,
  liveOpportunities,
  maxWindows = 3,
}: {
  nowMs: number;
  timezoneOffsetMinutes: number;
  publishedReplies: PublishedReplyPoint[];
  liveOpportunities: LiveOpportunityPoint[];
  maxWindows?: number;
}): BestReplyWindow[] {
  const currentHour = localHour(nowMs, timezoneOffsetMinutes);
  const statsByHour = new Map<number, HourStats>();

  for (const reply of publishedReplies) {
    if (reply.publishedAt < nowMs - HISTORY_LOOKBACK_MS) continue;
    const hour = localHour(reply.publishedAt, timezoneOffsetMinutes);
    const stats = getHourStats(statsByHour, hour);
    stats.historyCount += 1;
    if (reply.editBucket !== "major_edit") stats.noOrMinorCount += 1;
  }

  for (const opportunity of liveOpportunities) {
    const dayTimestamp = opportunity.scannedAt || opportunity.postedAt;
    if (!isSameLocalDay(dayTimestamp, nowMs, timezoneOffsetMinutes)) continue;
    if (opportunity.status === "dismissed" || opportunity.status === "archived") {
      continue;
    }
    const hour = localHour(dayTimestamp, timezoneOffsetMinutes);
    const stats = getHourStats(statsByHour, hour);
    stats.opportunityCount += 1;
    stats.topOpportunityScore = Math.max(stats.topOpportunityScore, opportunity.score);
  }

  const candidateHours = new Set<number>([
    ...DEFAULT_WINDOW_HOURS,
    ...statsByHour.keys(),
  ]);

  const ranked = [...candidateHours]
    .map((hour) => buildWindow(hour, currentHour, statsByHour.get(hour)))
    .sort((a, b) => b.rank - a.rank || a.distance - b.distance || a.hour - b.hour)
    .slice(0, maxWindows)
    .map((window) => ({
      hour: window.hour,
      label: window.label,
      source: window.source,
      opportunityCount: window.opportunityCount,
      historyCount: window.historyCount,
      noOrMinorRate: window.noOrMinorRate,
      reason: window.reason,
    }));

  return ranked.length > 0
    ? ranked
    : DEFAULT_WINDOW_HOURS.slice(0, maxWindows).map((hour) =>
        defaultWindow(hour)
      );
}

function buildWindow(
  hour: number,
  currentHour: number,
  stats?: HourStats
): BestReplyWindow & { rank: number; distance: number } {
  const historyCount = stats?.historyCount ?? 0;
  const opportunityCount = stats?.opportunityCount ?? 0;
  const noOrMinorRate =
    historyCount === 0
      ? null
      : Math.round(((stats?.noOrMinorCount ?? 0) / historyCount) * 100);
  const topOpportunityScore = stats?.topOpportunityScore ?? 0;
  const source = getWindowSource(historyCount, opportunityCount);

  const historyScore =
    historyCount === 0
      ? 0
      : Math.min(historyCount, 6) * 7 + ((noOrMinorRate ?? 0) / 100) * 36;
  const liveScore =
    opportunityCount === 0
      ? 0
      : Math.min(opportunityCount, 4) * 12 + Math.min(topOpportunityScore, 100) * 0.45;
  const distance = Math.abs(hour - currentHour);
  const timelinessBonus =
    hour === currentHour ? 8 : hour > currentHour ? Math.max(0, 5 - distance) : -4 - distance;
  const defaultBias = source === "default" ? -6 : 0;
  const rank = historyScore + liveScore + timelinessBonus + defaultBias;

  return {
    hour,
    label: formatHourWindow(hour),
    source,
    opportunityCount,
    historyCount,
    noOrMinorRate,
    reason: describeWindow({
      source,
      opportunityCount,
      historyCount,
      noOrMinorRate,
    }),
    rank,
    distance,
  };
}

function defaultWindow(hour: number): BestReplyWindow {
  return {
    hour,
    label: formatHourWindow(hour),
    source: "default",
    opportunityCount: 0,
    historyCount: 0,
    noOrMinorRate: null,
    reason: "Use this as a calm fallback block when the feed is quiet.",
  };
}

function getWindowSource(
  historyCount: number,
  opportunityCount: number
): BestWindowSource {
  if (historyCount > 0 && opportunityCount > 0) return "blend";
  if (historyCount > 0) return "history";
  if (opportunityCount > 0) return "live";
  return "default";
}

function describeWindow({
  source,
  opportunityCount,
  historyCount,
  noOrMinorRate,
}: {
  source: BestWindowSource;
  opportunityCount: number;
  historyCount: number;
  noOrMinorRate: number | null;
}): string {
  switch (source) {
    case "blend":
      return "Your cleanest sends and today's live threads overlap here.";
    case "history":
      return historyCount === 1 || noOrMinorRate === null
        ? "You ship cleanly in this hour — keep it in rotation."
        : "Historically your strongest send hour.";
    case "live":
      return opportunityCount === 1
        ? "A live thread is worth a look right now."
        : "Several live threads are clustering here.";
    case "default":
    default:
      return "Use this as a calm fallback block when the feed is quiet.";
  }
}

function buildHeadline(
  sentRepliesToday: number,
  warningLevel: ReplyPacingWarningLevel
): string {
  if (warningLevel === "limit") {
    return "Past today's safety envelope";
  }
  if (warningLevel === "warning") {
    return "Near the daily volume ceiling";
  }
  if (warningLevel === "watch") {
    return "Well above the quality target";
  }
  if (sentRepliesToday < DAILY_REPLY_TARGET_MIN) {
    return "Room left in today's budget";
  }
  if (sentRepliesToday <= DAILY_REPLY_TARGET_MAX) {
    return "On pace for today";
  }
  return "Over target — tighten up";
}

function buildDetail(
  sentRepliesToday: number,
  warningLevel: ReplyPacingWarningLevel
): string {
  if (warningLevel === "limit") {
    return "Anything beyond obvious winners risks account health. Save the rest for tomorrow.";
  }
  if (warningLevel === "warning") {
    return "You're approaching ~50/day territory — where spam heuristics kick in. Ship only your best remaining threads.";
  }
  if (warningLevel === "watch") {
    return "Volume is crowding out quality. Cut the filler and keep replies you'd send without the tool.";
  }
  if (sentRepliesToday < DAILY_REPLY_TARGET_MIN) {
    return "Pick strong threads and good timing over raw output. The count above is your pace check, not a quota to max out.";
  }
  if (sentRepliesToday <= DAILY_REPLY_TARGET_MAX) {
    return "You're in the recommended range. Hold the bar high instead of padding the day with extra sends.";
  }
  return "Past the sweet spot. From here, only send what you'd defend in public.";
}

function getHourStats(map: Map<number, HourStats>, hour: number): HourStats {
  const existing = map.get(hour);
  if (existing) return existing;
  const created: HourStats = {
    historyCount: 0,
    noOrMinorCount: 0,
    opportunityCount: 0,
    topOpportunityScore: 0,
  };
  map.set(hour, created);
  return created;
}

function localHour(timestampMs: number, timezoneOffsetMinutes: number): number {
  return shiftedDate(timestampMs, timezoneOffsetMinutes).getUTCHours();
}

function isSameLocalDay(
  timestampMs: number,
  nowMs: number,
  timezoneOffsetMinutes: number
): boolean {
  return (
    localDayKey(timestampMs, timezoneOffsetMinutes) ===
    localDayKey(nowMs, timezoneOffsetMinutes)
  );
}

export function isPublishedOnLocalDay(
  publishedAt: number,
  nowMs: number,
  timezoneOffsetMinutes: number
): boolean {
  return isSameLocalDay(publishedAt, nowMs, timezoneOffsetMinutes);
}

export function countPacingPublishesOnLocalDay(
  publishedAts: number[],
  nowMs: number,
  timezoneOffsetMinutes: number
): number {
  return publishedAts.filter((publishedAt) =>
    isPublishedOnLocalDay(publishedAt, nowMs, timezoneOffsetMinutes)
  ).length;
}

function localDayKey(timestampMs: number, timezoneOffsetMinutes: number): string {
  return shiftedDate(timestampMs, timezoneOffsetMinutes)
    .toISOString()
    .slice(0, 10);
}

function shiftedDate(timestampMs: number, timezoneOffsetMinutes: number): Date {
  return new Date(timestampMs - timezoneOffsetMinutes * 60_000);
}

function formatHourWindow(hour: number): string {
  const start = formatHour(hour);
  const end = formatHour((hour + 1) % 24);
  return `${start} - ${end}`;
}

function formatHour(hour: number): string {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "PM" : "AM";
  const twelveHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${twelveHour}${suffix}`;
}
