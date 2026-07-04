import { api } from "../../convex/_generated/api";
import { convexServer } from "./convex";
import { buildVoiceStyleFromTweets } from "../../shared/voice";
import { DEMO_TWEETS } from "../../shared/demoData";

const DEFAULT_KEYWORDS = ["ai", "startup", "founder", "build", "product"];

/**
 * First-login setup: make sure the user has a starter voice profile and the
 * feed scanner configured, then kick off an initial scan so the dashboard
 * isn't empty.
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
