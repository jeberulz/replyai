import type { ObservedEditBucket } from "./editDistance";

const MIN_GROUP_SAMPLE = 3;

export type ObservedAnalyticsRow = {
  category?: string | null;
  angle?: string | null;
  publishedAt: number;
  responded: boolean;
  editBucket?: ObservedEditBucket | null;
};

export type PersonalAnalyticsGroup = {
  label: string;
  sent: number;
  responded: number;
  responseRate: number;
  noOrMinorSent: number;
  noOrMinorResponseRate: number | null;
  isSparse: boolean;
};

export type TimeOfDayBucket = {
  hour: number;
  sent: number;
  responded: number;
  responseRate: number | null;
  noOrMinorSent: number;
  noOrMinorResponseRate: number | null;
  isSparse: boolean;
};

export type PersonalAnalyticsSnapshot = {
  sample: {
    sent: number;
    responded: number;
    responseRate: number | null;
    isSparse: boolean;
  };
  categories: PersonalAnalyticsGroup[];
  angles: PersonalAnalyticsGroup[];
  timeOfDay: {
    buckets: TimeOfDayBucket[];
    bestHours: TimeOfDayBucket[];
  };
};

export function chooseObservedAngle(args: {
  suggestedAngle?: string | null;
  missingAngles?: string[] | null;
  replyText?: string | null;
}): string | null {
  const suggested = normalizeInsightLabel(args.suggestedAngle);
  if (suggested) return suggested;

  const missingAngles = (args.missingAngles ?? [])
    .map((angle) => normalizeInsightLabel(angle))
    .filter((angle): angle is string => Boolean(angle));
  if (missingAngles.length === 0) return null;
  if (missingAngles.length === 1) return missingAngles[0];

  const replyLower = (args.replyText ?? "").toLowerCase();
  const replyTokens = new Set(tokenize(replyLower));

  let bestAngle = missingAngles[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const angle of missingAngles) {
    const angleLower = angle.toLowerCase();
    const angleTokens = tokenize(angleLower);
    const sharedTokens = angleTokens.filter((token) => replyTokens.has(token)).length;
    const coverage = angleTokens.length === 0 ? 0 : sharedTokens / angleTokens.length;
    const phraseBonus = replyLower.includes(angleLower) ? 2 : 0;
    const score = sharedTokens * 2 + coverage + phraseBonus;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

export function buildPersonalAnalytics(args: {
  rows: ObservedAnalyticsRow[];
  timezoneOffsetMinutes: number;
  maxGroups?: number;
  maxBestHours?: number;
}): PersonalAnalyticsSnapshot {
  const rows = args.rows;
  const maxGroups = args.maxGroups ?? 3;
  const maxBestHours = args.maxBestHours ?? 3;

  return {
    sample: {
      sent: rows.length,
      responded: rows.filter((row) => row.responded).length,
      responseRate: rate(rows.filter((row) => row.responded).length, rows.length),
      isSparse: rows.length < MIN_GROUP_SAMPLE,
    },
    categories: aggregateGroups(rows, (row) => row.category).slice(0, maxGroups),
    angles: aggregateGroups(rows, (row) => row.angle).slice(0, maxGroups),
    timeOfDay: buildTimeOfDayInsights({
      rows,
      timezoneOffsetMinutes: args.timezoneOffsetMinutes,
      maxBestHours,
    }),
  };
}

function aggregateGroups(
  rows: ObservedAnalyticsRow[],
  getLabel: (row: ObservedAnalyticsRow) => string | null | undefined
): PersonalAnalyticsGroup[] {
  const grouped = new Map<
    string,
    {
      label: string;
      sent: number;
      responded: number;
      noOrMinorSent: number;
      noOrMinorResponded: number;
    }
  >();

  for (const row of rows) {
    const label = normalizeInsightLabel(getLabel(row));
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = grouped.get(key) ?? {
      label,
      sent: 0,
      responded: 0,
      noOrMinorSent: 0,
      noOrMinorResponded: 0,
    };
    entry.sent += 1;
    if (row.responded) entry.responded += 1;
    if (row.editBucket !== "major_edit") {
      entry.noOrMinorSent += 1;
      if (row.responded) entry.noOrMinorResponded += 1;
    }
    grouped.set(key, entry);
  }

  return [...grouped.values()]
    .map((entry) => ({
      label: entry.label,
      sent: entry.sent,
      responded: entry.responded,
      responseRate: rate(entry.responded, entry.sent) ?? 0,
      noOrMinorSent: entry.noOrMinorSent,
      noOrMinorResponseRate: rate(entry.noOrMinorResponded, entry.noOrMinorSent),
      isSparse: entry.sent < MIN_GROUP_SAMPLE,
    }))
    .sort(compareGroups);
}

function buildTimeOfDayInsights(args: {
  rows: ObservedAnalyticsRow[];
  timezoneOffsetMinutes: number;
  maxBestHours: number;
}): PersonalAnalyticsSnapshot["timeOfDay"] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sent: 0,
    responded: 0,
    noOrMinorSent: 0,
    noOrMinorResponded: 0,
  }));

  for (const row of args.rows) {
    const hour = localHour(row.publishedAt, args.timezoneOffsetMinutes);
    const bucket = buckets[hour];
    bucket.sent += 1;
    if (row.responded) bucket.responded += 1;
    if (row.editBucket !== "major_edit") {
      bucket.noOrMinorSent += 1;
      if (row.responded) bucket.noOrMinorResponded += 1;
    }
  }

  const mapped = buckets.map((bucket) => ({
    hour: bucket.hour,
    sent: bucket.sent,
    responded: bucket.responded,
    responseRate: rate(bucket.responded, bucket.sent),
    noOrMinorSent: bucket.noOrMinorSent,
    noOrMinorResponseRate: rate(
      bucket.noOrMinorResponded,
      bucket.noOrMinorSent
    ),
    isSparse: bucket.sent > 0 && bucket.sent < MIN_GROUP_SAMPLE,
  }));

  const bestHours = mapped
    .filter((bucket) => bucket.sent > 0)
    .sort(compareTimeOfDayBuckets)
    .slice(0, args.maxBestHours);

  return {
    buckets: mapped,
    bestHours,
  };
}

function compareGroups(a: PersonalAnalyticsGroup, b: PersonalAnalyticsGroup): number {
  return (
    b.responded - a.responded ||
    b.responseRate - a.responseRate ||
    b.sent - a.sent ||
    a.label.localeCompare(b.label)
  );
}

function compareTimeOfDayBuckets(a: TimeOfDayBucket, b: TimeOfDayBucket): number {
  return (
    b.responded - a.responded ||
    (b.responseRate ?? -1) - (a.responseRate ?? -1) ||
    b.sent - a.sent ||
    a.hour - b.hour
  );
}

function normalizeInsightLabel(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function localHour(timestampMs: number, timezoneOffsetMinutes: number): number {
  const localTimestampMs = timestampMs - timezoneOffsetMinutes * 60_000;
  return new Date(localTimestampMs).getUTCHours();
}
