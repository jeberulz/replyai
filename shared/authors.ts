/**
 * Author relationship memory — pure merge/format helpers for per-author
 * dossiers (WP13). Counts are observed interactions only; never fake scores.
 */

import { normalizeHandle } from "./feedFilters";

export const AUTHOR_TOPIC_HISTORY_LIMIT = 8;
export const AUTHOR_REPLY_SETTINGS_HISTORY_LIMIT = 6;
export const AUTHOR_POST_HOUR_BUCKETS = 24;

export type AuthorInteractionKind = "sent" | "responded";

export type AuthorReplySettingsEntry = {
  settings: string;
  seenAt: number;
};

export type AuthorDossierSnapshot = {
  authorHandle: string;
  authorName?: string;
  authorXUserId?: string;
  interactionCount: number;
  sentCount: number;
  responseCount: number;
  lastInteractedAt?: number;
  lastRespondedAt?: number;
  lastSentAt?: number;
  topicsResponded: string[];
  replySettingsHistory: AuthorReplySettingsEntry[];
  /** Hour-of-day (0–23 UTC) counts from observed post times. */
  postHourCounts: number[];
  updatedAt: number;
};

export type AuthorUpsertEvent = {
  kind: AuthorInteractionKind;
  at: number;
  authorHandle: string;
  authorName?: string;
  authorXUserId?: string;
  topic?: string;
  replySettings?: string;
  /** Target tweet postedAt — used for cadence buckets when present. */
  postedAt?: number;
};

export type DemoAuthorDossier = {
  authorHandle: string;
  authorName: string;
  interactionCount: number;
  sentCount: number;
  responseCount: number;
  lastRespondedAtOffsetMs: number;
  lastSentAtOffsetMs: number;
  topicsResponded: string[];
  replySettingsHistory: AuthorReplySettingsEntry[];
  /** Sparse hour → count map; expanded to 24 buckets at materialize time. */
  postHourHits: Array<{ hour: number; count: number }>;
  cadenceNote: string;
};

/** Deterministic demo dossiers keyed by demo handles from DEMO_TWEETS. */
export const DEMO_AUTHOR_DOSSIERS: DemoAuthorDossier[] = [
  {
    authorHandle: "sarahbuilds",
    authorName: "Sarah Chen",
    interactionCount: 5,
    sentCount: 5,
    responseCount: 2,
    lastRespondedAtOffsetMs: 3 * 24 * 60 * 60 * 1000,
    lastSentAtOffsetMs: 2 * 24 * 60 * 60 * 1000,
    topicsResponded: ["AI moats", "workflow compounds"],
    replySettingsHistory: [
      { settings: "everyone", seenAt: 0 },
      { settings: "following", seenAt: -14 * 24 * 60 * 60 * 1000 },
    ],
    postHourHits: [
      { hour: 13, count: 4 },
      { hour: 14, count: 2 },
    ],
    cadenceNote: "often posts around 9am ET",
  },
  {
    authorHandle: "marcusship",
    authorName: "Marcus Rivera",
    interactionCount: 3,
    sentCount: 3,
    responseCount: 1,
    lastRespondedAtOffsetMs: 10 * 24 * 60 * 60 * 1000,
    lastSentAtOffsetMs: 5 * 24 * 60 * 60 * 1000,
    topicsResponded: ["shipping speed"],
    replySettingsHistory: [{ settings: "everyone", seenAt: 0 }],
    postHourHits: [
      { hour: 16, count: 3 },
      { hour: 17, count: 1 },
    ],
    cadenceNote: "usually active mid-afternoon UTC",
  },
  {
    authorHandle: "priyaml",
    authorName: "Priya Malhotra",
    interactionCount: 4,
    sentCount: 4,
    responseCount: 2,
    lastRespondedAtOffsetMs: 6 * 24 * 60 * 60 * 1000,
    lastSentAtOffsetMs: 1 * 24 * 60 * 60 * 1000,
    topicsResponded: ["evals", "long-horizon agents"],
    replySettingsHistory: [
      { settings: "everyone", seenAt: 0 },
      { settings: "mentionedUsers", seenAt: -21 * 24 * 60 * 60 * 1000 },
    ],
    postHourHits: [
      { hour: 12, count: 2 },
      { hour: 20, count: 3 },
    ],
    cadenceNote: "posts midday and evenings UTC",
  },
];

export function emptyPostHourCounts(): number[] {
  return Array.from({ length: AUTHOR_POST_HOUR_BUCKETS }, () => 0);
}

export function normalizeAuthorHandle(handle: string): string {
  return normalizeHandle(handle);
}

function pushUniqueFront(
  list: string[],
  value: string,
  limit: number
): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = [trimmed, ...list.filter((item) => item !== trimmed)];
  return next.slice(0, limit);
}

function mergeReplySettingsHistory(
  existing: AuthorReplySettingsEntry[],
  settings: string | undefined,
  at: number
): AuthorReplySettingsEntry[] {
  if (!settings?.trim()) return existing;
  const normalized = settings.trim();
  const withoutDup = existing.filter((entry) => entry.settings !== normalized);
  return [{ settings: normalized, seenAt: at }, ...withoutDup].slice(
    0,
    AUTHOR_REPLY_SETTINGS_HISTORY_LIMIT
  );
}

function bumpPostHour(
  counts: number[],
  postedAt: number | undefined
): number[] {
  if (postedAt === undefined || !Number.isFinite(postedAt)) return counts;
  const hour = new Date(postedAt).getUTCHours();
  if (hour < 0 || hour >= AUTHOR_POST_HOUR_BUCKETS) return counts;
  const next = counts.slice();
  next[hour] = (next[hour] ?? 0) + 1;
  return next;
}

/** Merge an interaction event into an existing (or empty) dossier snapshot. */
export function mergeAuthorUpsert(
  existing: AuthorDossierSnapshot | null,
  event: AuthorUpsertEvent
): AuthorDossierSnapshot {
  const authorHandle = normalizeAuthorHandle(event.authorHandle);
  if (!authorHandle) {
    throw new Error("authorHandle is required");
  }

  const base: AuthorDossierSnapshot = existing ?? {
    authorHandle,
    interactionCount: 0,
    sentCount: 0,
    responseCount: 0,
    topicsResponded: [],
    replySettingsHistory: [],
    postHourCounts: emptyPostHourCounts(),
    updatedAt: event.at,
  };

  const isResponded = event.kind === "responded";
  const isSent = event.kind === "sent";
  const topicsResponded = isResponded
    ? pushUniqueFront(
        base.topicsResponded,
        event.topic ?? "",
        AUTHOR_TOPIC_HISTORY_LIMIT
      )
    : base.topicsResponded;

  // sent → outbound interaction; responded → inbound only (sent already counted).
  // If we only ever see responded (legacy), still record a send once.
  const recordSend = isSent || (isResponded && base.sentCount === 0);

  return {
    authorHandle,
    authorName: event.authorName?.trim() || base.authorName,
    authorXUserId: event.authorXUserId?.trim() || base.authorXUserId,
    interactionCount: base.interactionCount + (recordSend ? 1 : 0),
    sentCount: base.sentCount + (recordSend ? 1 : 0),
    responseCount: base.responseCount + (isResponded ? 1 : 0),
    lastInteractedAt: Math.max(base.lastInteractedAt ?? 0, event.at) || event.at,
    lastRespondedAt: isResponded
      ? Math.max(base.lastRespondedAt ?? 0, event.at) || event.at
      : base.lastRespondedAt,
    lastSentAt: recordSend
      ? Math.max(base.lastSentAt ?? 0, event.at) || event.at
      : base.lastSentAt,
    topicsResponded,
    replySettingsHistory: mergeReplySettingsHistory(
      base.replySettingsHistory,
      event.replySettings,
      event.at
    ),
    postHourCounts: bumpPostHour(
      base.postHourCounts.length === AUTHOR_POST_HOUR_BUCKETS
        ? base.postHourCounts
        : emptyPostHourCounts(),
      event.postedAt
    ),
    updatedAt: event.at,
  };
}

/** Peak UTC hour from observed post buckets, or null if no signal. */
export function peakPostHourUtc(postHourCounts: number[]): number | null {
  let bestHour: number | null = null;
  let bestCount = 0;
  for (let hour = 0; hour < postHourCounts.length; hour++) {
    const count = postHourCounts[hour] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      bestHour = hour;
    }
  }
  return bestCount > 0 ? bestHour : null;
}

/** Format a short ET-ish cadence hint from UTC hour peak (observed only). */
export function formatCadenceHint(postHourCounts: number[]): string | null {
  const hour = peakPostHourUtc(postHourCounts);
  if (hour === null) return null;
  // Rough ET offset (−4 / −5); label as ET without claiming precision.
  const etHour = (hour - 4 + 24) % 24;
  const suffix = etHour >= 12 ? "pm" : "am";
  const display = etHour % 12 === 0 ? 12 : etHour % 12;
  return `often posts around ${display}${suffix} ET`;
}

export function formatAuthorDossierSnippet(args: {
  authorHandle: string;
  responseCount: number;
  topicsResponded: string[];
  postHourCounts: number[];
  cadenceNote?: string;
}): string | null {
  const handle = normalizeAuthorHandle(args.authorHandle);
  if (!handle || args.responseCount <= 0) return null;

  const n = args.responseCount;
  const head = `you've had ${n} response${n === 1 ? "" : "s"} from @${handle}`;
  const cadence =
    args.cadenceNote?.trim() || formatCadenceHint(args.postHourCounts);
  const topic = args.topicsResponded[0];

  if (topic && cadence) {
    return `${head} — they post about ${topic} · ${cadence}`;
  }
  if (topic) return `${head} — they've responded on ${topic}`;
  if (cadence) return `${head} — ${cadence}`;
  return head;
}

export function materializeDemoAuthorDossier(
  fixture: DemoAuthorDossier,
  now: number
): AuthorDossierSnapshot {
  const postHourCounts = emptyPostHourCounts();
  for (const hit of fixture.postHourHits) {
    if (hit.hour >= 0 && hit.hour < AUTHOR_POST_HOUR_BUCKETS) {
      postHourCounts[hit.hour] = hit.count;
    }
  }

  const replySettingsHistory = fixture.replySettingsHistory.map((entry) => ({
    settings: entry.settings,
    seenAt: entry.seenAt <= 0 ? now + entry.seenAt : entry.seenAt,
  }));

  return {
    authorHandle: normalizeAuthorHandle(fixture.authorHandle),
    authorName: fixture.authorName,
    interactionCount: fixture.interactionCount,
    sentCount: fixture.sentCount,
    responseCount: fixture.responseCount,
    lastInteractedAt: now - fixture.lastSentAtOffsetMs,
    lastRespondedAt: now - fixture.lastRespondedAtOffsetMs,
    lastSentAt: now - fixture.lastSentAtOffsetMs,
    topicsResponded: [...fixture.topicsResponded],
    replySettingsHistory,
    postHourCounts,
    updatedAt: now,
  };
}

export function demoAuthorDossierByHandle(
  handle: string,
  now = Date.now()
): AuthorDossierSnapshot | null {
  const normalized = normalizeAuthorHandle(handle);
  const fixture = DEMO_AUTHOR_DOSSIERS.find(
    (row) => normalizeAuthorHandle(row.authorHandle) === normalized
  );
  if (!fixture) return null;
  return materializeDemoAuthorDossier(fixture, now);
}

export function demoAuthorDossierSnippet(
  handle: string,
  now = Date.now()
): string | null {
  const dossier = demoAuthorDossierByHandle(handle, now);
  if (!dossier) return null;
  const fixture = DEMO_AUTHOR_DOSSIERS.find(
    (row) =>
      normalizeAuthorHandle(row.authorHandle) === dossier.authorHandle
  );
  return formatAuthorDossierSnippet({
    authorHandle: dossier.authorHandle,
    responseCount: dossier.responseCount,
    topicsResponded: dossier.topicsResponded,
    postHourCounts: dossier.postHourCounts,
    cadenceNote: fixture?.cadenceNote,
  });
}
