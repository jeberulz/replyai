"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  refreshOfflinePending,
  runOfflineDraftSync,
  subscribeOfflineSync,
} from "@/lib/offlineDraftSync";
import type { OfflineDraftOp } from "@/lib/offlineDrafts";
import { ensurePushServiceWorker } from "@/lib/push";

/**
 * Mount once in the authenticated app shell.
 * - Registers the single SW (`/push-sw.js`) for installability + push.
 * - Syncs offline draft queue on online / focus / SW message.
 * Never publishes.
 */
export function OfflineDraftSync() {
  const [pending, setPending] = useState<OfflineDraftOp[]>([]);
  const toasting = useRef(false);

  useEffect(() => {
    return subscribeOfflineSync((state) => {
      setPending(state.pending);
    });
  }, []);

  useEffect(() => {
    void ensurePushServiceWorker().catch(() => {
      // Demo / unsupported browsers — installability still works via manifest
      // once a controlling SW exists; push remains optional.
    });
  }, []);

  useEffect(() => {
    const flush = async (reason: string) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const before = await refreshOfflinePending();
      if (before.length === 0) return;
      if (toasting.current) return;
      toasting.current = true;
      try {
        const result = await runOfflineDraftSync({ online: true });
        if (result.synced > 0) {
          toast.success(
            result.synced === 1
              ? "Offline draft synced"
              : `${result.synced} offline drafts synced`
          );
        }
        if (result.conflicts > 0) {
          toast.message(
            "Some offline edits conflicted with the server — kept last write"
          );
        }
        for (const err of result.errors) {
          toast.error(err.message || "Offline draft sync failed — text kept locally");
        }
        if (result.remaining.length > 0 && result.synced === 0 && result.errors.length === 0) {
          // Still pending without explicit errors (e.g. went offline mid-flush).
          void reason;
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not sync offline drafts — text kept locally"
        );
      } finally {
        toasting.current = false;
      }
    };

    const onOnline = () => {
      void flush("online");
    };
    const onFocus = () => {
      void flush("focus");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void flush("visibility");
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        data &&
        typeof data === "object" &&
        "type" in data &&
        data.type === "replypilot-sync-drafts"
      ) {
        void flush("sw");
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    navigator.serviceWorker?.addEventListener("message", onMessage);

    // Initial attempt after mount (covers reconnect while app was closed).
    void flush("mount");

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  // Invisible host — pending count is consumed by drafts UI via subscribe.
  return (
    <span
      data-testid="offline-draft-sync"
      data-pending={pending.length}
      className="sr-only"
      aria-hidden
    />
  );
}
