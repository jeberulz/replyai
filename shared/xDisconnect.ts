export const X_DISCONNECT_DRAFT_ERROR =
  "X was disconnected before this scheduled publish ran. Reconnect X in Settings, then schedule again.";

export type XDisconnectCascade = {
  scannerPatch: {
    enabled: false;
    backgroundEnabled: false;
    enabledSources: [];
    engageListIds: [];
    engageListNames: [];
    watchedHandles: [];
    lastScanError: string;
  };
  notificationPatch: {
    masterEnabled: false;
    pushEnabled: false;
    digestEnabled: false;
    enabledSources: [];
    updatedAt: number;
  };
  scheduledDraftPatch: {
    status: "failed";
    error: string;
  };
};

export function buildXDisconnectCascade(nowMs = Date.now()): XDisconnectCascade {
  return {
    scannerPatch: {
      enabled: false,
      backgroundEnabled: false,
      enabledSources: [],
      engageListIds: [],
      engageListNames: [],
      watchedHandles: [],
      lastScanError: "X disconnected. Reconnect in Settings to scan again.",
    },
    notificationPatch: {
      masterEnabled: false,
      pushEnabled: false,
      digestEnabled: false,
      enabledSources: [],
      updatedAt: nowMs,
    },
    scheduledDraftPatch: {
      status: "failed",
      error: X_DISCONNECT_DRAFT_ERROR,
    },
  };
}

export function xDisconnectConsequenceCopy(scheduledDraftCount: number): string {
  const scheduled =
    scheduledDraftCount > 0
      ? `${scheduledDraftCount} scheduled publish${
          scheduledDraftCount === 1 ? "" : "es"
        } will be stopped and marked failed.`
      : "Scheduled X publishes will be stopped if any are queued.";
  return [
    "Stored X OAuth tokens will be removed.",
    "Feed scanner and hot-window notifications will turn off.",
    scheduled,
    "Draft text and account exports stay available.",
  ].join(" ");
}
