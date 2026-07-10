import { api } from "../../convex/_generated/api";
import { convexServer } from "./convex";
import { buildVoiceStyleFromTweets } from "../../shared/voice";
import { hasProAccess } from "../../shared/billing";
import { DEMO_TWEETS } from "../../shared/demoData";
import { DEFAULT_KEYWORDS } from "../../shared/onboarding";
import { hasUsableOnboardingProfile } from "../../shared/onboardingIdentity";

/**
 * First-login setup: make sure the user has a starter voice profile and the
 * feed scanner configured, then kick off an initial scan so the dashboard
 * isn't empty. Idempotent — safe to run on every login. The onboarding
 * wizard refines these defaults; skipping the wizard leaves them in place.
 */
export async function ensureDefaults(sessionToken: string) {
  const convex = convexServer();
  const me = await convex.query(api.users.me, { sessionToken });

  const profiles = await convex.query(api.voiceProfiles.list, { sessionToken });
  if (profiles.length === 0) {
    await convex.mutation(api.voiceProfiles.create, {
      sessionToken,
      name: "Default voice",
      style: buildVoiceStyleFromTweets(DEMO_TWEETS.map((t) => t.text)),
      examples: [],
      source: "manual",
      purpose: "starter",
    });
  }

  const settings = await convex.query(api.scanner.settings, { sessionToken });
  if (!settings) {
    await convex.mutation(api.scanner.updateSettings, {
      sessionToken,
      enabled: hasProAccess(me ?? {}),
      keywords: DEFAULT_KEYWORDS,
    });
  }
  if (hasProAccess(me ?? {})) {
    await convex.mutation(api.scanner.scanNow, { sessionToken });
  }
}

/**
 * Where to land after login: new users (never finished or skipped the
 * wizard) go to /onboarding, everyone else to /dashboard.
 */
export async function postLoginPath(sessionToken: string): Promise<string> {
  try {
    const convex = convexServer();
    const [me, profiles] = await Promise.all([
      convex.query(api.users.me, { sessionToken }),
      convex.query(api.voiceProfiles.list, { sessionToken }),
    ]);
    const needsOnboarding =
      me &&
      me.onboardingCompletedAt === undefined &&
      !hasUsableOnboardingProfile(profiles);
    return needsOnboarding ? "/onboarding" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
