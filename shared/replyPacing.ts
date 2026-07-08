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

export type LiveOpportunityPoint = {
  postedAt: number;
  scannedAt: number;
  score: number;
  status: "new" | "dismissed" | "analyzed";
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
    if (opportunity.status === "dismissed") continue;
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
      return `${opportunityCount} live threads are surfacing here, and your sent replies stay clean in this hour.`;
    case "history":
      return historyCount === 1 || noOrMinorRate === null
        ? "You already ship cleanly in this hour — worth keeping in the rotation."
        : `${noOrMinorRate}% of your sent replies in this hour needed no or only minor edits.`;
    case "live":
      return opportunityCount === 1
        ? "A live conversation is surfacing in this hour."
        : `${opportunityCount} live conversations are surfacing in this hour.`;
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
    return `${sentRepliesToday} replies sent today — back off volume.`;
  }
  if (warningLevel === "warning") {
    return `${sentRepliesToday} replies sent today — slow the pace.`;
  }
  if (warningLevel === "watch") {
    return `${sentRepliesToday} replies sent today — stay selective from here.`;
  }
  if (sentRepliesToday < DAILY_REPLY_TARGET_MIN) {
    return `${sentRepliesToday} replies sent today — build toward ${DAILY_REPLY_TARGET_MIN}-${DAILY_REPLY_TARGET_MAX}.`;
  }
  if (sentRepliesToday <= DAILY_REPLY_TARGET_MAX) {
    return `${sentRepliesToday} replies sent today — you are in the target lane.`;
  }
  return `${sentRepliesToday} replies sent today — quality over extra volume now.`;
}

function buildDetail(
  sentRepliesToday: number,
  warningLevel: ReplyPacingWarningLevel
): string {
  if (warningLevel === "limit") {
    return "You are past the researched safety envelope. Ship only obvious winners and leave room for tomorrow.";
  }
  if (warningLevel === "warning") {
    return "You are close to the ~50/day spam-heuristic zone. Prioritize the clearest opportunities only.";
  }
  if (warningLevel === "watch") {
    return "You are well above the 15-20 quality target. Trim volume and keep only the strongest threads.";
  }
  if (sentRepliesToday < DAILY_REPLY_TARGET_MIN) {
    return "Aim for 15-20 strong replies, not maximum output. The goal is clean sends and good timing.";
  }
  if (sentRepliesToday <= DAILY_REPLY_TARGET_MAX) {
    return "You have hit the recommended daily range. Keep the bar high rather than pushing more volume.";
  }
  return "You are beyond the target range. Keep only high-conviction replies from here.";
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
