import { api } from "../../convex/_generated/api";
import { convexServer } from "./convex";
import { buildVoiceStyleFromTweets } from "../../shared/voice";
import { DEMO_TWEETS } from "../../shared/demoData";
import { DEFAULT_KEYWORDS } from "../../shared/onboarding";

/**
 * First-login setup: make sure the user has a starter voice profile and the
 * feed scanner configured, then kick off an initial scan so the dashboard
 * isn't empty. Idempotent — safe to run on every login. The onboarding
 * wizard refines these defaults; skipping the wizard leaves them in place.
 */
export async function ensureDefaults(sessionToken: string) {
  const convex = convexServer();

  const profiles = await convex.query(api.voiceProfiles.list, { sessionToken });
  if (profiles.length === 0) {
    await convex.mutation(api.voiceProfiles.create, {
      sessionToken,
      name: "Default voice",
      style: buildVoiceStyleFromTweets(DEMO_TWEETS.map((t) => t.text)),
      examples: [],
      source: "manual",
    });
  }

  const settings = await convex.query(api.scanner.settings, { sessionToken });
  if (!settings) {
    await convex.mutation(api.scanner.updateSettings, {
      sessionToken,
      enabled: true,
      keywords: DEFAULT_KEYWORDS,
    });
  }
  await convex.mutation(api.scanner.scanNow, { sessionToken });
}

/**
 * Where to land after login: new users (never finished or skipped the
 * wizard) go to /onboarding, everyone else to /dashboard.
 */
export async function postLoginPath(sessionToken: string): Promise<string> {
  try {
    const me = await convexServer().query(api.users.me, { sessionToken });
    return me && me.onboardingCompletedAt === undefined
      ? "/onboarding"
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
