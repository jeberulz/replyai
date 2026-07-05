# Onboarding flow — design (2026-07-04)

Ghostbase-inspired first-run wizard that captures a goal, seeds the feed
scanner (the discovery+timing wedge), and trains a voice profile — the
"writing model" — before the user reaches the dashboard.

## Decisions

- **Auth**: X OAuth (or demo) stays the only front door. Onboarding runs
  *after* first login; no email/password added.
- **Segmentation**: primary goal (`audience` / `leads` / `authority`), not
  role. The goal seeds suggested scanner keywords and can later tune copy.
- **Skippable**: every step has a skip. Skipping falls back to the silent
  `ensureDefaults()` seed (starter voice + default keywords), so the app is
  never empty. `onboardingCompletedAt` is set on finish *or* skip.
- **"Model" naming**: the wizard's output is the trained **voice profile**
  (`voiceProfiles`, `source: "trained"`, set default). The Claude model
  picker stays in Settings — it's a cost decision, not onboarding.
- **Real numbers only** (PRD guardrail): the building screen paces its
  checklist for legibility, but every row completes only after
  `buildWritingModelAction` returns; post counts, detected style, and the
  ready screen's queue count (live Convex query) are all real. Demo mode is
  labeled as "sample posts", never passed off as the user's own.

## Flow

Rail: `GOAL · VOICE · READY` (5 screens roll up to 3 stages).

1. **Goal** — 3 radio rows → `users.goal`.
2. **Niche** — chips seeded per goal + free text → `scannerSettings.keywords`
   (scanner enabled). Our addition vs. Ghostbase; configures the wedge.
3. **Voice source** — import recent X posts (default; demo fallback is
   labeled) or paste 5–10 posts.
4. **Building** — `buildWritingModelAction`: fetch/accept posts →
   `buildVoiceStyleFromTweets` → create trained profile + set default →
   `scanNow` → `completeOnboarding`. Returns `{postCount, style,
   profileName, usedSampleTweets}`.
5. **Ready** — measured style summary, live opportunity count, "Start
   replying" → dashboard. Trust note: "You click send. Always."

## Post-onboarding

Sidebar **"Finish setup"** panel (Ghostbase's train-your-model slot),
derived entirely from real state via `buildSetupChecklist()`: goal set,
keywords moved off defaults, trained voice exists, first analysis, first
draft. Hides when complete or dismissed (`users.setupDismissedAt`).

## Touch points

- Schema: `users.goal`, `users.onboardingCompletedAt`, `users.setupDismissedAt`.
- Convex: `users.setGoal` / `completeOnboarding` / `dismissSetupChecklist`;
  `me` returns the new fields.
- Shared: `shared/onboarding.ts` (goals, suggested keywords, checklist
  derivation — pure, tested in `tests/onboarding.test.ts`).
- Actions: `setGoalAction`, `saveOnboardingNicheAction`,
  `buildWritingModelAction`, `skipOnboardingAction`,
  `dismissSetupChecklistAction`.
- Routes: `(onboarding)/onboarding` (chrome-black tier); auth callback +
  demo route redirect via `postLoginPath()`; Settings gets "Redo
  onboarding" (`/onboarding?rerun=1`).

## Gotcha (found in verification)

Do **not** call `revalidatePath` inside `buildWritingModelAction`: it
re-renders `/onboarding` after the action, and the page guard (onboarding
now complete) redirects to `/dashboard` before the ready screen shows.
Voice list and dashboard update via Convex reactivity anyway.
