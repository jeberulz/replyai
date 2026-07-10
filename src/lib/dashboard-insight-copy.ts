import type { EngagementWindowCurve } from "../../shared/engagementWindow";
import { formatEngagementMinutes } from "../../shared/engagementWindow";

function bandLabel(curve: Pick<EngagementWindowCurve, "authorBandLabel" | "topicTag">) {
  return curve.topicTag
    ? `${curve.authorBandLabel} · ${curve.topicTag}`
    : curve.authorBandLabel;
}

export function engagementWindowEmptyStatus(): string {
  return "Still learning your timing";
}

export function engagementWindowTitle(): string {
  return "How long conversations stay hot";
}

export function engagementWindowTitleSubtitle(): string {
  return "By account size · from your reply-backs";
}

export function engagementWindowEmptyBody(args: {
  publishedToday: number;
  minSampleSize: number;
}): string {
  const { publishedToday, minSampleSize } = args;
  if (publishedToday > 0) {
    const sendLabel = publishedToday === 1 ? "send" : "sends";
    return `${publishedToday} ${sendLabel} today. Need ${minSampleSize} more reply-backs from similar accounts to show peak timing.`;
  }
  return "Reply to a few more conversations like the ones you target. We'll show when engagement usually peaks after those posts.";
}

export function engagementWindowBucketFooter(hasTopicBuckets = false): string {
  return hasTopicBuckets
    ? "Your reply-backs, grouped by account size and topic."
    : "Your reply-backs, grouped by account size.";
}

export function engagementWindowBucketSampleMeta(args: {
  sampleSize: number;
  minSampleSize: number;
  hasEnoughData: boolean;
}): string {
  const { sampleSize, minSampleSize, hasEnoughData } = args;
  if (hasEnoughData) {
    return sampleSize === 1 ? "1 reply-back" : `${sampleSize} reply-backs`;
  }
  return `${sampleSize} of ${minSampleSize} needed`;
}

export function engagementWindowFilledCopy(args: {
  curve: EngagementWindowCurve;
  minSampleSize: number;
}): { headline: string; detail: string } {
  const { curve, minSampleSize } = args;
  if (!curve.hasEnoughData || curve.medianPeakMinutes == null) {
    return {
      headline: engagementWindowEmptyStatus(),
      detail: `Need ${minSampleSize} reply-backs in ${bandLabel(curve)} before peak timing shows. Observed so far: ${curve.sampleSize}.`,
    };
  }

  const peakLabel = formatEngagementMinutes(curve.medianPeakMinutes);
  const bandBit = bandLabel(curve);
  return {
    headline: `Engagement usually peaks ${peakLabel} after the post`,
    detail: `Based on ${curve.sampleSize} reply-back${curve.sampleSize === 1 ? "" : "s"} in ${bandBit}.`,
  };
}

export function personalAnalyticsTitle(): string {
  return "What gets you replies";
}

export function personalAnalyticsTitleSubtitle(): string {
  return "From finished conversations only";
}

export function personalAnalyticsHeroCaption(): string {
  return "got a reply-back";
}

export function personalAnalyticsHeroMetric(args: {
  responded: number;
  sent: number;
  publishedToday: number;
}): string {
  const { responded, sent, publishedToday } = args;
  if (sent === 0 && publishedToday > 0) {
    return `${responded}/${publishedToday}`;
  }
  return `${responded}/${sent}`;
}

export function personalAnalyticsHistoryLabel(
  sent: number,
  historyLimit: number
): string {
  if (sent >= historyLimit) {
    return `last ${historyLimit} finished conversations`;
  }
  const noun = sent === 1 ? "conversation" : "conversations";
  return `${sent} finished ${noun}`;
}

export function personalAnalyticsInProgressLabel(
  awaitingOutcome: number
): string | null {
  if (awaitingOutcome <= 0) return null;
  return awaitingOutcome === 1
    ? "1 in progress"
    : `${awaitingOutcome} in progress`;
}

export function personalAnalyticsSparseCopy(args: {
  sent: number;
  isSparse: boolean;
  publishedToday: number;
}): string {
  const { sent, isSparse, publishedToday } = args;

  if (sent === 0) {
    if (publishedToday > 0) {
      return `${publishedToday} send${publishedToday === 1 ? "" : "s"} today — waiting on reply-backs (up to 48h). Rankings appear after conversations finish.`;
    }
    return "Send replies and quotes as you normally would. Once conversations finish, we'll show which types and hours earn reply-backs.";
  }
  if (isSparse) {
    return "Early read — send a few more before treating these rankings as durable.";
  }
  return "Built from your finished conversations — not predicted scores.";
}

export const personalAnalyticsSections = {
  categories: "Categories",
  angles: "Angles that worked",
  sendHours: "Best hours to send",
  heatmapTitle: "Hourly reply-back map",
  heatmapSubtitle: "Darker = higher reply-back rate · your local time",
  emptyCategories: "Send a few more replies — we'll rank reply types here.",
  emptyAngles:
    "Send a few more replies — we'll rank which angles get answers here.",
  emptySendHours:
    "No send-hour pattern yet — shows up after conversations finish.",
  sparseSample: " · early read",
  listReplied: "reply-back",
} as const;
