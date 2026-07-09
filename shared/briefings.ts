/**
 * Daily briefing helpers (WP12).
 * Pure functions: hour matching, demo artifact, ranking-changelog snippet.
 * No publish path. No fake engagement percentages.
 */

import { z } from "zod";
import {
  dateKeyForTimezone,
  localTimeParts,
} from "./notifications";
import { RANKING_CHANGELOG_MAX_AGE_MS, rankingChangelogSentence } from "./rankingChangelog";

export { rankingChangelogSentence };

export const BRIEFING_DEFAULTS = {
  enabled: false,
  hourLocal: 8,
  timezone: "UTC",
  emailOptIn: false,
  /** Include ranking changelog when weights updated within this window. */
  rankingChangelogMaxAgeMs: RANKING_CHANGELOG_MAX_AGE_MS,
  topOpportunityCount: 5,
} as const;

export const BriefingOpportunitySchema = z.object({
  opportunityId: z.string().optional(),
  authorHandle: z.string(),
  textPreview: z.string(),
  angle: z.string(),
  reason: z.string(),
});

export const BriefingOutcomesSchema = z.object({
  analyzed: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  responded: z.number().int().nonnegative(),
  summary: z.string(),
});

export const BriefingArtifactSchema = z.object({
  opportunities: z.array(BriefingOpportunitySchema).max(8),
  outcomes: BriefingOutcomesSchema,
  coachingInsight: z.string().min(1),
  generatedAt: z.number(),
  demo: z.boolean(),
});

export type BriefingArtifact = z.infer<typeof BriefingArtifactSchema>;
export type BriefingOpportunity = z.infer<typeof BriefingOpportunitySchema>;
export type BriefingOutcomes = z.infer<typeof BriefingOutcomesSchema>;

export type BriefingSettingsSnapshot = {
  enabled: boolean;
  hourLocal: number;
  timezone: string;
  emailOptIn: boolean;
};

export function clampHourLocal(hour: number): number {
  if (!Number.isFinite(hour)) return BRIEFING_DEFAULTS.hourLocal;
  return Math.min(23, Math.max(0, Math.floor(hour)));
}

/** YYYY-MM-DD in the user's timezone (reuse notification date key). */
export function localDayKey(nowMs: number, timezone: string): string {
  return dateKeyForTimezone(nowMs, timezone);
}

/** True when the user's local hour equals the configured briefing hour. */
export function isBriefingHour(
  nowMs: number,
  hourLocal: number,
  timezone: string
): boolean {
  const { hours } = localTimeParts(nowMs, timezone);
  return hours === clampHourLocal(hourLocal);
}

/**
 * Eligible for a new run: settings enabled, local hour matches, and no
 * completed/running run already exists for this local calendar day.
 */
export function shouldEnqueueBriefing(input: {
  nowMs: number;
  settings: BriefingSettingsSnapshot;
  hasRunForLocalDay: boolean;
}): boolean {
  if (!input.settings.enabled) return false;
  if (input.hasRunForLocalDay) return false;
  return isBriefingHour(
    input.nowMs,
    input.settings.hourLocal,
    input.settings.timezone
  );
}

export type DemoBriefingInput = {
  nowMs?: number;
  rankingSentence?: string | null;
};

/** Deterministic demo artifact — used when ANTHROPIC_API_KEY is missing. */
export function demoBriefingArtifact(
  input: DemoBriefingInput = {}
): BriefingArtifact {
  const generatedAt = input.nowMs ?? Date.parse("2026-07-09T08:00:00Z");
  const ranking = input.rankingSentence?.trim();
  const coachingInsight = ranking
    ? `${ranking} Pick one overnight opportunity and reply before the window cools.`
    : "Yesterday's replies that got a response tended to ask a concrete follow-up — lead with one sharp question today.";

  return BriefingArtifactSchema.parse({
    opportunities: [
      {
        opportunityId: "demo-opp-1",
        authorHandle: "sarahbuilds",
        textPreview:
          "Most AI startups aren't AI startups — they're UI wrappers with a prompt library.",
        angle: "Agree, then name the workflow moat you actually own.",
        reason: "High-follower take with room for a practitioner counterpoint.",
      },
      {
        opportunityId: "demo-opp-2",
        authorHandle: "priyaml",
        textPreview:
          "Shipping weekly beats perfect roadmaps. What's your smallest shippable this week?",
        angle: "Share one ship you cut scope on and what you learned.",
        reason: "Direct question — early replies get visibility.",
      },
      {
        opportunityId: "demo-opp-3",
        authorHandle: "marcusship",
        textPreview: "Distribution is the product. Features are table stakes.",
        angle: "Add a distribution channel that worked for a similar ICP.",
        reason: "Topic fits builder niche; conversation still young.",
      },
      {
        opportunityId: "demo-opp-4",
        authorHandle: "lenacodes",
        textPreview:
          "If your AI feature needs a 40-page prompt doc, you don't have a product yet.",
        angle: "Describe the thinnest prompt that still ships value.",
        reason: "Contrarian hook — short, specific replies stand out.",
      },
      {
        opportunityId: "demo-opp-5",
        authorHandle: "alexvc",
        textPreview:
          "Founders underrate reply speed in public threads. Timing > polish.",
        angle: "Ask what 'fast enough' means for their last launch thread.",
        reason: "Meta on timing — aligns with ReplyPilot's wedge.",
      },
    ],
    outcomes: {
      analyzed: 4,
      sent: 2,
      responded: 1,
      summary:
        "Yesterday: 4 analyzed, 2 sent, 1 reply-back. The reply-back came from a watched-handle thread.",
    },
    coachingInsight,
    generatedAt,
    demo: true,
  });
}

export function parseBriefingArtifact(value: unknown): BriefingArtifact {
  return BriefingArtifactSchema.parse(value);
}

export function briefingSettingsDefaults(): BriefingSettingsSnapshot {
  return {
    enabled: BRIEFING_DEFAULTS.enabled,
    hourLocal: BRIEFING_DEFAULTS.hourLocal,
    timezone: BRIEFING_DEFAULTS.timezone,
    emailOptIn: BRIEFING_DEFAULTS.emailOptIn,
  };
}

export function defaultBriefingSettings(
  nowMs: number
): BriefingSettingsSnapshot & { updatedAt: number } {
  return {
    ...briefingSettingsDefaults(),
    updatedAt: nowMs,
  };
}
