import { describe, expect, it } from "vitest";
import {
  dequeueByClientId,
  flushOfflineQueue,
  isNetworkError,
  markQueueError,
  mergeQueuedOp,
  shouldQueueOffline,
  type OfflineDraftOp,
} from "../src/lib/offlineDrafts";

function op(partial: Partial<OfflineDraftOp> & Pick<OfflineDraftOp, "clientId" | "text">): OfflineDraftOp {
  return {
    op: "create",
    kind: "reply",
    updatedAt: 1,
    ...partial,
  };
}

describe("shouldQueueOffline / isNetworkError", () => {
  it("queues when navigator reports offline", () => {
    expect(shouldQueueOffline(false)).toBe(true);
    expect(shouldQueueOffline(true)).toBe(false);
  });

  it("queues on network-shaped errors even when online", () => {
    expect(shouldQueueOffline(true, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldQueueOffline(true, new Error("NetworkError when attempting to fetch"))).toBe(
      true
    );
    expect(shouldQueueOffline(true, new Error("validation failed"))).toBe(false);
  });

  it("detects common network error messages", () => {
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
    expect(isNetworkError(new Error("offline"))).toBe(true);
    expect(isNetworkError(new Error("Not found"))).toBe(false);
  });
});

describe("mergeQueuedOp", () => {
  it("appends a new clientId", () => {
    const a = op({ clientId: "a", text: "one", updatedAt: 1 });
    const b = op({ clientId: "b", text: "two", updatedAt: 2 });
    expect(mergeQueuedOp([a], b)).toEqual([a, b]);
  });

  it("last-write-wins for the same clientId", () => {
    const a1 = op({ clientId: "a", text: "old", updatedAt: 1 });
    const a2 = op({ clientId: "a", text: "new", updatedAt: 5 });
    expect(mergeQueuedOp([a1], a2)[0]?.text).toBe("new");
  });

  it("ignores stale writes for the same clientId", () => {
    const a1 = op({ clientId: "a", text: "new", updatedAt: 10 });
    const a2 = op({ clientId: "a", text: "stale", updatedAt: 2 });
    expect(mergeQueuedOp([a1], a2)[0]?.text).toBe("new");
  });

  it("merges updates that share a draftId", () => {
    const u1 = op({
      clientId: "c1",
      op: "update",
      draftId: "d1",
      text: "v1",
      updatedAt: 1,
    });
    const u2 = op({
      clientId: "c2",
      op: "update",
      draftId: "d1",
      text: "v2",
      updatedAt: 3,
    });
    const merged = mergeQueuedOp([u1], u2);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.text).toBe("v2");
    expect(merged[0]?.draftId).toBe("d1");
  });
});

describe("dequeue / markQueueError", () => {
  it("removes by clientId", () => {
    const queue = [
      op({ clientId: "a", text: "1" }),
      op({ clientId: "b", text: "2" }),
    ];
    expect(dequeueByClientId(queue, "a").map((item) => item.clientId)).toEqual(["b"]);
  });

  it("attaches lastError without dropping text", () => {
    const queue = [op({ clientId: "a", text: "keep me" })];
    const next = markQueueError(queue, "a", "boom");
    expect(next[0]?.text).toBe("keep me");
    expect(next[0]?.lastError).toBe("boom");
  });
});

describe("flushOfflineQueue", () => {
  it("no-ops when offline", async () => {
    const queue = [op({ clientId: "a", text: "x" })];
    const result = await flushOfflineQueue(
      queue,
      {
        create: async () => ({ draftId: "should-not-run" }),
        update: async () => {
          throw new Error("should-not-run");
        },
      },
      { online: false }
    );
    expect(result.synced).toBe(0);
    expect(result.remaining).toHaveLength(1);
  });

  it("creates then removes from remaining", async () => {
    const queue = [op({ clientId: "a", text: "hello", kind: "reply" })];
    const created: string[] = [];
    const result = await flushOfflineQueue(queue, {
      create: async (item) => {
        created.push(item.text);
        return { draftId: "draft_1" };
      },
      update: async () => undefined,
    });
    expect(created).toEqual(["hello"]);
    expect(result.synced).toBe(1);
    expect(result.remaining).toHaveLength(0);
  });

  it("updates when draftId is present", async () => {
    const queue = [
      op({
        clientId: "u1",
        op: "update",
        draftId: "draft_9",
        text: "edited",
        updatedAt: 2,
      }),
    ];
    const updated: string[] = [];
    const result = await flushOfflineQueue(queue, {
      create: async () => ({ draftId: "nope" }),
      update: async (item) => {
        updated.push(`${item.draftId}:${item.text}`);
      },
    });
    expect(updated).toEqual(["draft_9:edited"]);
    expect(result.synced).toBe(1);
    expect(result.remaining).toHaveLength(0);
  });

  it("keeps text on failure and records lastError", async () => {
    const queue = [op({ clientId: "a", text: "precious" })];
    const result = await flushOfflineQueue(queue, {
      create: async () => {
        throw new Error("server 500");
      },
      update: async () => undefined,
    });
    expect(result.synced).toBe(0);
    expect(result.remaining).toHaveLength(1);
    expect(result.remaining[0]?.text).toBe("precious");
    expect(result.remaining[0]?.lastError).toContain("server 500");
    expect(result.errors).toHaveLength(1);
  });

  it("stops flushing further items after a network error", async () => {
    const queue = [
      op({ clientId: "a", text: "1", updatedAt: 1 }),
      op({ clientId: "b", text: "2", updatedAt: 2 }),
    ];
    let creates = 0;
    const result = await flushOfflineQueue(queue, {
      create: async () => {
        creates += 1;
        throw new TypeError("Failed to fetch");
      },
      update: async () => undefined,
    });
    expect(creates).toBe(1);
    expect(result.remaining).toHaveLength(2);
    expect(result.remaining[0]?.lastError).toMatch(/Failed to fetch/i);
  });
});
