import { measureObservedEdit } from "./editDistance";
import { fingerprintText } from "./semanticRelevance";

export const DUPLICATE_REPLY_LOOKBACK_MS = 2 * 60 * 60 * 1000;
export const DUPLICATE_REPLY_SIMILARITY_MAX = 0.15;
export const DUPLICATE_REPLY_PATTERN_COUNT = 3;

export type DuplicateReplyWarningLevel = "none" | "similar" | "pattern";

export type PublishedReplySample = {
  text: string;
  publishedAt: number;
};

export type DuplicateReplyAssessment = {
  level: DuplicateReplyWarningLevel;
  similarCount: number;
  lookbackHours: number;
  headline: string;
  detail: string;
};

export function normalizeReplyText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .trim();
}

export function repliesAreNearDuplicate(a: string, b: string): boolean {
  const left = normalizeReplyText(a);
  const right = normalizeReplyText(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (fingerprintText(left) === fingerprintText(right)) return true;
  return (
    measureObservedEdit(left, right).normalizedEditDistance <=
    DUPLICATE_REPLY_SIMILARITY_MAX
  );
}

export function assessDuplicateReplyRisk({
  candidateText,
  recentPublished,
  nowMs = Date.now(),
}: {
  candidateText: string;
  recentPublished: PublishedReplySample[];
  nowMs?: number;
}): DuplicateReplyAssessment {
  const lookbackStart = nowMs - DUPLICATE_REPLY_LOOKBACK_MS;
  const recent = recentPublished.filter(
    (reply) => reply.publishedAt >= lookbackStart
  );
  const similarCount = recent.filter((reply) =>
    repliesAreNearDuplicate(candidateText, reply.text)
  ).length;
  const lookbackHours = DUPLICATE_REPLY_LOOKBACK_MS / (60 * 60 * 1000);

  if (similarCount >= DUPLICATE_REPLY_PATTERN_COUNT) {
    return {
      level: "pattern",
      similarCount,
      lookbackHours,
      headline: "Repeating reply pattern detected",
      detail: `You've sent ${similarCount} near-identical replies in the last ${lookbackHours} hours. X's spam heuristics flag this — rewrite meaningfully or wait before sending another.`,
    };
  }

  if (similarCount >= 1) {
    return {
      level: "similar",
      similarCount,
      lookbackHours,
      headline: "Similar to a recent reply",
      detail: `This text closely matches a reply you already sent in the last ${lookbackHours} hours. Consider rephrasing so your account stays healthy.`,
    };
  }

  return {
    level: "none",
    similarCount: 0,
    lookbackHours,
    headline: "",
    detail: "",
  };
}
