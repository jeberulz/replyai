"use client";

import {
  syncOfflineDraftCreateAction,
  syncOfflineDraftUpdateAction,
} from "@/app/actions";
import {
  loadOfflineQueue,
  syncOfflineDrafts,
  type FlushResult,
  type OfflineDraftOp,
} from "@/lib/offlineDrafts";

export type { OfflineDraftOp, FlushResult };

export type OfflineSyncListener = (state: {
  pending: OfflineDraftOp[];
  syncing: boolean;
  lastResult: FlushResult | null;
}) => void;

let syncing = false;
let lastResult: FlushResult | null = null;
const listeners = new Set<OfflineSyncListener>();

function emit(pending: OfflineDraftOp[]) {
  const snapshot = { pending, syncing, lastResult };
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function subscribeOfflineSync(listener: OfflineSyncListener): () => void {
  listeners.add(listener);
  void loadOfflineQueue().then((pending) => {
    listener({ pending, syncing, lastResult });
  });
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshOfflinePending(): Promise<OfflineDraftOp[]> {
  const pending = await loadOfflineQueue();
  emit(pending);
  return pending;
}

/**
 * Flush IndexedDB queue via server actions. Draft create/update only.
 * Safe to call when online; no-ops cleanly with empty queue (demo included).
 */
export async function runOfflineDraftSync(options?: {
  online?: boolean;
}): Promise<FlushResult> {
  const online =
    options?.online ??
    (typeof navigator === "undefined" ? true : navigator.onLine);

  if (syncing) {
    const pending = await loadOfflineQueue();
    return (
      lastResult ?? {
        remaining: pending,
        synced: 0,
        conflicts: 0,
        errors: [],
      }
    );
  }

  syncing = true;
  emit(await loadOfflineQueue());

  try {
    const result = await syncOfflineDrafts(
      {
        create: async (op) => {
          const { draftId } = await syncOfflineDraftCreateAction({
            clientId: op.clientId,
            text: op.text,
            kind: op.kind,
            analysisId: op.analysisId,
            replyId: op.replyId,
            targetTweetId: op.targetTweetId,
            targetTweetUrl: op.targetTweetUrl,
          });
          return { draftId };
        },
        update: async (op) => {
          if (!op.draftId) {
            throw new Error("Missing draftId for offline update");
          }
          await syncOfflineDraftUpdateAction({
            draftId: op.draftId,
            text: op.text,
          });
        },
      },
      { online }
    );
    lastResult = result;
    emit(result.remaining);
    return result;
  } finally {
    syncing = false;
    emit(await loadOfflineQueue());
  }
}
