import { describe, expect, it } from "vitest";
import { backgroundScannerEnabled } from "../shared/scannerScheduling";

describe("backgroundScannerEnabled", () => {
  it("enables recurring scans for an enabled live account", () => {
    expect(
      backgroundScannerEnabled({ enabled: true, isDemo: false })
    ).toBe(true);
  });

  it("keeps demo accounts out of recurring scans", () => {
    expect(
      backgroundScannerEnabled({ enabled: true, isDemo: true })
    ).toBe(false);
  });

  it("keeps disabled live accounts out of recurring scans", () => {
    expect(
      backgroundScannerEnabled({ enabled: false, isDemo: false })
    ).toBe(false);
  });
});
