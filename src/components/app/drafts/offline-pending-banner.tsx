"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import {
  refreshOfflinePending,
  runOfflineDraftSync,
  subscribeOfflineSync,
} from "@/lib/offlineDraftSync";
import type { OfflineDraftOp } from "@/lib/offlineDrafts";

export function OfflinePendingBanner() {
  const [pending, setPending] = useState<OfflineDraftOp[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    return subscribeOfflineSync((state) => {
      setPending(state.pending);
      setSyncing(state.syncing);
    });
  }, []);

  if (pending.length === 0) return null;

  return (
    <div
      data-testid="offline-pending-banner"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Badge
          variant="warning"
          label={`${pending.length} offline`}
          icon={<CloudOff className="size-3" />}
        />
        <p className="text-xs text-muted-foreground">
          Draft text is saved on this device. Syncs when you reconnect — never
          auto-publishes.
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        label={syncing ? "Syncing…" : "Sync now"}
        icon={<RefreshCw className="size-3.5" />}
        isDisabled={syncing || (typeof navigator !== "undefined" && !navigator.onLine)}
        onClick={() => {
          void (async () => {
            try {
              await refreshOfflinePending();
              const result = await runOfflineDraftSync({ online: navigator.onLine });
              if (result.synced > 0) {
                toast.success(
                  result.synced === 1
                    ? "Offline draft synced"
                    : `${result.synced} offline drafts synced`
                );
              } else if (result.errors[0]) {
                toast.error(result.errors[0].message);
              } else if (!navigator.onLine) {
                toast.message("Still offline — drafts kept locally");
              }
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Sync failed"
              );
            }
          })();
        }}
      />
    </div>
  );
}

/** Badge for a server draft that has a pending offline update. */
export function OfflineDraftBadge({ draftId }: { draftId: string }) {
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return subscribeOfflineSync((state) => {
      setPending(state.pending.some((item) => item.draftId === draftId));
    });
  }, [draftId]);

  if (!pending) return null;
  return (
    <Badge
      variant="warning"
      label="Offline edit"
      icon={<CloudOff className="size-3" />}
      className="shrink-0"
    />
  );
}
