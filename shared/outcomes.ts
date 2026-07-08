export type ReplyOutcomeLabel =
  | "author_replied"
  | "conversation_continued"
  | "got_ratioed";

export type ReplyOutcomeCandidate = {
  tweetId: string;
  authorHandle?: string;
  likeCount?: number;
  replyCount?: number;
};

export type PublishedTweetMetrics = {
  likeCount: number;
  replyCount: number;
};

export type ReplyOutcomeTrackerStatus =
  | "active"
  | "responded"
  | "expired"
  | "failed";

export type ClassifiedReplyOutcome = {
  label: ReplyOutcomeLabel;
  responseTweetId?: string;
  responseAuthorHandle?: string;
};

const BASE_POLL_DELAY_MS = 15 * 60 * 1000;
const MAX_POLL_DELAY_MS = 6 * 60 * 60 * 1000;

function normalizeHandle(handle: string | undefined): string | null {
  const normalized = handle?.replace(/^@/, "").trim().toLowerCase();
  return normalized ? normalized : null;
}

export function nextOutcomePollDelayMs(pollCount: number): number {
  const safePollCount = Math.max(0, Math.floor(pollCount));
  return Math.min(
    MAX_POLL_DELAY_MS,
    BASE_POLL_DELAY_MS * 2 ** safePollCount
  );
}

export function classifyReplyOutcome(args: {
  candidates: ReplyOutcomeCandidate[];
  targetAuthorHandle?: string;
  publishedMetrics?: PublishedTweetMetrics | null;
}): ClassifiedReplyOutcome | null {
  const targetAuthor = normalizeHandle(args.targetAuthorHandle);

  if (targetAuthor) {
    const authorReply = args.candidates.find(
      (candidate) => normalizeHandle(candidate.authorHandle) === targetAuthor
    );
    if (authorReply) {
      return {
        label: "author_replied",
        responseTweetId: authorReply.tweetId,
        responseAuthorHandle: authorReply.authorHandle,
      };
    }
  }

  const metrics = args.publishedMetrics;
  if (
    metrics &&
    metrics.replyCount >= 5 &&
    metrics.replyCount >= Math.max(1, metrics.likeCount) * 2
  ) {
    const firstCandidate = args.candidates[0];
    return {
      label: "got_ratioed",
      responseTweetId: firstCandidate?.tweetId,
      responseAuthorHandle: firstCandidate?.authorHandle,
    };
  }

  const firstCandidate = args.candidates[0];
  if (firstCandidate) {
    return {
      label: "conversation_continued",
      responseTweetId: firstCandidate.tweetId,
      responseAuthorHandle: firstCandidate.authorHandle,
    };
  }

  if (metrics && metrics.replyCount > 0) {
    return { label: "conversation_continued" };
  }

  return null;
}

export function replyResponseRate(args: {
  responded: number;
  sent: number;
}): number | null {
  if (args.sent <= 0) return null;
  return Math.round((args.responded / args.sent) * 100);
}

export function replyResponseStats(
  rows: Array<{ status: ReplyOutcomeTrackerStatus }>
): { rate: number | null; responded: number; sent: number } {
  const responded = rows.filter((row) => row.status === "responded").length;
  const sent = rows.filter(
    (row) => row.status === "responded" || row.status === "expired"
  ).length;
  return {
    rate: replyResponseRate({ responded, sent }),
    responded,
    sent,
  };
}
