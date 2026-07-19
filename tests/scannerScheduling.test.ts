import { describe, expect, it } from "vitest";
import {
  backgroundScannerDispatchEligible,
  backgroundScannerEnabled,
} from "../shared/scannerScheduling";

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

describe("backgroundScannerDispatchEligible", () => {
  it("keeps eligible legacy live rows running during the rollout", () => {
    expect(
      backgroundScannerDispatchEligible({
        enabled: true,
        isDemo: false,
        hasAccess: true,
      })
    ).toBe(true);
  });

  it("rejects legacy demo rows even though demo has feature access", () => {
    expect(
      backgroundScannerDispatchEligible({
        enabled: true,
        isDemo: true,
        hasAccess: true,
      })
    ).toBe(false);
  });

  it("honors an explicit background opt-out", () => {
    expect(
      backgroundScannerDispatchEligible({
        enabled: true,
        backgroundEnabled: false,
        isDemo: false,
        hasAccess: true,
      })
    ).toBe(false);
  });

  it("still enforces current plan or beta access", () => {
    expect(
      backgroundScannerDispatchEligible({
        enabled: true,
        backgroundEnabled: true,
        isDemo: false,
        hasAccess: false,
      })
    ).toBe(false);
  });
});
