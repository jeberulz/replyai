import { describe, expect, test } from "vitest";
import {
  chooseDuplicateAccountSurvivor,
  hasUsableOnboardingProfile,
  type OnboardingProfileSignal,
} from "../shared/onboardingIdentity";

const starter: OnboardingProfileSignal = {
  name: "Default voice",
  source: "manual",
  purpose: "starter",
  isDefault: true,
  examples: [],
};

describe("onboarding identity helpers", () => {
  test("does not treat the deterministic starter profile as completed setup", () => {
    expect(hasUsableOnboardingProfile([starter])).toBe(false);
  });

  test("treats trained and onboarding profiles as usable setup", () => {
    expect(
      hasUsableOnboardingProfile([
        starter,
        {
          name: "Jane's voice",
          source: "trained",
          purpose: "onboarding",
          isDefault: true,
          examples: ["Ship the boring version first."],
        },
      ])
    ).toBe(true);
  });

  test("treats intentional manual profiles as usable setup", () => {
    expect(
      hasUsableOnboardingProfile([
        {
          name: "Founder voice",
          source: "manual",
          purpose: "manual",
          isDefault: false,
          examples: [],
        },
      ])
    ).toBe(true);
  });

  test("keeps legacy empty default voice profiles on the onboarding path", () => {
    expect(
      hasUsableOnboardingProfile([
        {
          name: "Default voice",
          source: "manual",
          isDefault: true,
          examples: [],
        },
      ])
    ).toBe(false);
  });

  test("selects duplicate-account survivor by product rows, then age", () => {
    expect(
      chooseDuplicateAccountSurvivor([
        { userId: "new-rich", createdAt: 20, productRows: 3 },
        { userId: "old-rich", createdAt: 10, productRows: 3 },
        { userId: "old-empty", createdAt: 1, productRows: 0 },
      ])
    ).toBe("old-rich");
  });
});
