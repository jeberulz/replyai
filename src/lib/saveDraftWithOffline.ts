"use client";

import { saveDraftAction, updateDraftAction } from "@/app/actions";
import { refreshOfflinePending } from "@/lib/offlineDraftSync";
import {
  enqueueOfflineDraft,
  shouldQueueOffline,
  type OfflineDraftKind,
} from "@/lib/offlineDrafts";

export async function saveDraftWithOffline(args: {
  text: string;
  kind: OfflineDraftKind;
  analysisId?: string;
  replyId?: string;
  targetTweetId?: string;
  targetTweetUrl?: string;
  category?: string;
}): Promise<{ draftId?: string; queued: boolean; clientId?: string }> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (!online) {
    const op = await enqueueOfflineDraft({
      op: "create",
      text: args.text,
      kind: args.kind,
      analysisId: args.analysisId,
      replyId: args.replyId,
      targetTweetId: args.targetTweetId,
      targetTweetUrl: args.targetTweetUrl,
      category: args.category,
      localLabel: args.text.slice(0, 48),
    });
    await refreshOfflinePending();
    return { queued: true, clientId: op.clientId };
  }

  try {
    const { draftId } = await saveDraftAction({
      text: args.text,
      kind: args.kind,
      analysisId: args.analysisId,
      replyId: args.replyId,
      targetTweetId: args.targetTweetId,
      targetTweetUrl: args.targetTweetUrl,
      category: args.category,
    });
    return { draftId, queued: false };
  } catch (error) {
    if (shouldQueueOffline(online, error)) {
      const op = await enqueueOfflineDraft({
        op: "create",
        text: args.text,
        kind: args.kind,
        analysisId: args.analysisId,
        replyId: args.replyId,
        targetTweetId: args.targetTweetId,
        targetTweetUrl: args.targetTweetUrl,
        category: args.category,
        localLabel: args.text.slice(0, 48),
        lastError:
          error instanceof Error
            ? error.message
            : "Network error — queued offline",
      });
      await refreshOfflinePending();
      return { queued: true, clientId: op.clientId };
    }
    throw error;
  }
}

export async function updateDraftWithOffline(
  draftId: string,
  text: string
): Promise<{ queued: boolean }> {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (!online) {
    await enqueueOfflineDraft({
      op: "update",
      draftId,
      text,
      kind: "reply",
    });
    await refreshOfflinePending();
    return { queued: true };
  }

  try {
    await updateDraftAction(draftId, text);
    return { queued: false };
  } catch (error) {
    if (shouldQueueOffline(online, error)) {
      await enqueueOfflineDraft({
        op: "update",
        draftId,
        text,
        kind: "reply",
        lastError:
          error instanceof Error
            ? error.message
            : "Network error — queued offline",
      });
      await refreshOfflinePending();
      return { queued: true };
    }
    throw error;
  }
}
