export type OnboardingProfileSignal = {
  name: string;
  source: "manual" | "trained";
  purpose?: "starter" | "onboarding" | "manual";
  isDefault: boolean;
  examples: string[];
};

function isLegacyStarterProfile(profile: OnboardingProfileSignal): boolean {
  return (
    profile.source === "manual" &&
    profile.purpose === undefined &&
    profile.name.trim().toLowerCase() === "default voice" &&
    profile.examples.length === 0
  );
}

/**
 * A profile that represents actual user setup should suppress first-run
 * onboarding on a fresh browser. The deterministic starter default should not.
 */
export function hasUsableOnboardingProfile(
  profiles: OnboardingProfileSignal[]
): boolean {
  return profiles.some((profile) => {
    if (profile.purpose === "starter") return false;
    if (profile.purpose === "onboarding" || profile.purpose === "manual") {
      return true;
    }
    if (profile.source === "trained") return true;
    if (isLegacyStarterProfile(profile)) return false;
    return profile.isDefault && profile.source === "manual";
  });
}

export type DuplicateUserCandidate = {
  userId: string;
  createdAt: number;
  productRows: number;
};

export function chooseDuplicateAccountSurvivor(
  candidates: DuplicateUserCandidate[]
): string | null {
  const [winner] = [...candidates].sort((a, b) => {
    if (b.productRows !== a.productRows) return b.productRows - a.productRows;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.userId.localeCompare(b.userId);
  });
  return winner?.userId ?? null;
}
