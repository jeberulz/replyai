import { describe, expect, it } from "vitest";
import {
  buildXDisconnectCascade,
  xDisconnectConsequenceCopy,
  X_DISCONNECT_DRAFT_ERROR,
} from "../shared/xDisconnect";

describe("X disconnect cascade", () => {
  it("builds owned-user patches that remove X-dependent activity", () => {
    const cascade = buildXDisconnectCascade(1_000);

    expect(cascade.scannerPatch).toEqual({
      enabled: false,
      backgroundEnabled: false,
      enabledSources: [],
      engageListIds: [],
      engageListNames: [],
      watchedHandles: [],
      lastScanError: "X disconnected. Reconnect in Settings to scan again.",
    });
    expect(cascade.notificationPatch).toEqual({
      masterEnabled: false,
      pushEnabled: false,
      digestEnabled: false,
      enabledSources: [],
      updatedAt: 1_000,
    });
    expect(cascade.scheduledDraftPatch).toEqual({
      status: "failed",
      error: X_DISCONNECT_DRAFT_ERROR,
    });
  });

  it("states scheduled-draft consequences before final disconnect", () => {
    expect(xDisconnectConsequenceCopy(1)).toContain(
      "1 scheduled publish will be stopped"
    );
    expect(xDisconnectConsequenceCopy(2)).toContain(
      "2 scheduled publishes will be stopped"
    );
    expect(xDisconnectConsequenceCopy(0)).toContain(
      "Stored X OAuth tokens will be removed"
    );
  });
});
