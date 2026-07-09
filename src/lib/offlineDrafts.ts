/**
 * Offline draft queue (WP15) — IndexedDB-backed pending creates/updates.
 * Never queues publish. Sync flushes draft mutations only when online.
 */

export type OfflineDraftKind =
  | "reply"
  | "quote"
  | "standalone"
  | "thread"
  | "longform";

export type OfflineDraftOp = {
  /** Client idempotency key — stable across retries. */
  clientId: string;
  op: "create" | "update";
  /** Server draft id when known (updates, or after a create synced). */
  draftId?: string;
  text: string;
  kind: OfflineDraftKind;
  analysisId?: string;
  replyId?: string;
  targetTweetId?: string;
  targetTweetUrl?: string;
  category?: string;
  /** Last-write-wins clock (ms). */
  updatedAt: number;
  /** Surfaced in UI; never silently drop text. */
  lastError?: string;
  /** Local-only row id for list badges before server id exists. */
  localLabel?: string;
};

export type OfflineQueueSnapshot = {
  pending: OfflineDraftOp[];
  syncing: boolean;
  lastSyncedAt: number | null;
  lastError: string | null;
};

const DB_NAME = "replypilot-offline-drafts";
const DB_VERSION = 1;
const STORE = "queue";

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** True when the browser reports offline or the error looks like a network failure. */
export function shouldQueueOffline(
  online: boolean | undefined,
  error?: unknown
): boolean {
  if (online === false) return true;
  if (error === undefined) return false;
  return isNetworkError(error);
}

export function isNetworkError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === "object" && error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("load failed") ||
      msg.includes("fetch")
    );
  }
  if (typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message).toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("offline") ||
      msg.includes("load failed")
    );
  }
  return false;
}

/**
 * Merge a new op into the queue. Same clientId or same draftId (updates)
 * collapses to last-write-wins by updatedAt.
 */
export function mergeQueuedOp(
  queue: OfflineDraftOp[],
  next: OfflineDraftOp
): OfflineDraftOp[] {
  const out = [...queue];
  const idx = out.findIndex((item) => {
    if (item.clientId === next.clientId) return true;
    if (
      next.op === "update" &&
      next.draftId &&
      item.op === "update" &&
      item.draftId === next.draftId
    ) {
      return true;
    }
    return false;
  });

  if (idx === -1) {
    out.push(next);
    return sortQueue(out);
  }

  const existing = out[idx]!;
  if (next.updatedAt < existing.updatedAt) {
    return sortQueue(out);
  }
  out[idx] = {
    ...existing,
    ...next,
    // Preserve create→update upgrade: once we know draftId, keep it.
    draftId: next.draftId ?? existing.draftId,
    op: next.draftId || existing.draftId ? next.op : existing.op,
    lastError: next.lastError,
  };
  return sortQueue(out);
}

export function dequeueByClientId(
  queue: OfflineDraftOp[],
  clientId: string
): OfflineDraftOp[] {
  return queue.filter((item) => item.clientId !== clientId);
}

export function markQueueError(
  queue: OfflineDraftOp[],
  clientId: string,
  lastError: string
): OfflineDraftOp[] {
  return queue.map((item) =>
    item.clientId === clientId ? { ...item, lastError } : item
  );
}

function sortQueue(queue: OfflineDraftOp[]): OfflineDraftOp[] {
  return [...queue].sort((a, b) => a.updatedAt - b.updatedAt);
}

export type DraftSyncHandlers = {
  create: (op: OfflineDraftOp) => Promise<{ draftId: string }>;
  update: (op: OfflineDraftOp) => Promise<void>;
};

export type FlushResult = {
  remaining: OfflineDraftOp[];
  synced: number;
  conflicts: number;
  errors: Array<{ clientId: string; message: string }>;
};

/**
 * Flush pending ops in order. Successful ops are removed.
 * Failed network ops stay with lastError set; other errors also stay
 * (never drop text silently).
 */
export async function flushOfflineQueue(
  queue: OfflineDraftOp[],
  handlers: DraftSyncHandlers,
  options?: { online?: boolean }
): Promise<FlushResult> {
  if (options?.online === false) {
    return { remaining: queue, synced: 0, conflicts: 0, errors: [] };
  }

  let remaining = [...queue];
  let synced = 0;
  let conflicts = 0;
  const errors: FlushResult["errors"] = [];

  // Work on a snapshot of clientIds so merges during flush don't skip items.
  const ordered = sortQueue(remaining);

  for (const op of ordered) {
    const stillThere = remaining.find((item) => item.clientId === op.clientId);
    if (!stillThere) continue;

    try {
      if (stillThere.op === "create" && !stillThere.draftId) {
        const { draftId } = await handlers.create(stillThere);
        remaining = dequeueByClientId(remaining, stillThere.clientId);
        synced += 1;
        // If a later update for same clientId existed as create-only, done.
        void draftId;
      } else if (stillThere.draftId) {
        await handlers.update(stillThere);
        remaining = dequeueByClientId(remaining, stillThere.clientId);
        synced += 1;
      } else {
        // Update without draftId — treat as create.
        const { draftId } = await handlers.create(stillThere);
        remaining = dequeueByClientId(remaining, stillThere.clientId);
        synced += 1;
        void draftId;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sync failed — draft kept offline";
      if (/not found|already published|conflict/i.test(message)) {
        conflicts += 1;
      }
      remaining = markQueueError(remaining, stillThere.clientId, message);
      errors.push({ clientId: stillThere.clientId, message });
      // Stop on first hard failure so order stays predictable; caller can retry.
      if (!isNetworkError(error) && !/not found|already published/i.test(message)) {
        // Continue flushing others — one bad draft shouldn't block the queue.
        continue;
      }
      if (isNetworkError(error)) {
        break;
      }
    }
  }

  return { remaining, synced, conflicts, errors };
}

// ---------------------------------------------------------------------------
// IndexedDB persistence
// ---------------------------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbAll(): Promise<OfflineDraftOp[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(sortQueue((req.result ?? []) as OfflineDraftOp[]));
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
}

async function idbPutAll(queue: OfflineDraftOp[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      for (const item of queue) {
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

/** In-memory fallback when IndexedDB is missing (SSR / tests). */
let memoryQueue: OfflineDraftOp[] = [];

export function resetMemoryQueueForTests(queue: OfflineDraftOp[] = []): void {
  memoryQueue = [...queue];
}

export async function loadOfflineQueue(): Promise<OfflineDraftOp[]> {
  if (typeof indexedDB === "undefined") {
    return sortQueue(memoryQueue);
  }
  try {
    return await idbAll();
  } catch {
    return sortQueue(memoryQueue);
  }
}

export async function persistOfflineQueue(queue: OfflineDraftOp[]): Promise<void> {
  memoryQueue = sortQueue(queue);
  if (typeof indexedDB === "undefined") return;
  try {
    await idbPutAll(memoryQueue);
  } catch {
    // Keep memory copy; UI still works for the session.
  }
}

export async function enqueueOfflineDraft(
  partial: Omit<OfflineDraftOp, "clientId" | "updatedAt"> & {
    clientId?: string;
    updatedAt?: number;
  }
): Promise<OfflineDraftOp> {
  const next: OfflineDraftOp = {
    ...partial,
    clientId: partial.clientId ?? newClientId(),
    updatedAt: partial.updatedAt ?? Date.now(),
  };
  const queue = await loadOfflineQueue();
  const merged = mergeQueuedOp(queue, next);
  await persistOfflineQueue(merged);
  return next;
}

export async function syncOfflineDrafts(
  handlers: DraftSyncHandlers,
  options?: { online?: boolean }
): Promise<FlushResult> {
  const queue = await loadOfflineQueue();
  if (queue.length === 0) {
    return { remaining: [], synced: 0, conflicts: 0, errors: [] };
  }
  const result = await flushOfflineQueue(queue, handlers, options);
  await persistOfflineQueue(result.remaining);
  return result;
}

export function pendingCount(queue: OfflineDraftOp[]): number {
  return queue.length;
}

export function findPendingForDraft(
  queue: OfflineDraftOp[],
  draftId: string
): OfflineDraftOp | undefined {
  return queue.find((item) => item.draftId === draftId);
}
