# WP12 Stories — Daily briefing agent

Definition of done from `docs/PRODUCT_STRATEGY.md` §14: **Runs at user hour
with run record; human-readable artifact.**

Product intent (§5.3 / §7.2.4): at the user's chosen hour, read overnight
opportunities, outcomes, and light trends; write a briefing artifact
(screen + optional email). Artifact: top ~5 opportunities with angles,
yesterday's outcomes, one coaching insight. Each run gets a run record
(mirror `researchRuns`). Agents prepare, humans decide — no publish path.

File boundary: `docs/wp/RULINGS.md` → **2026-07-09 - WP12**.

## Defaults (settled)

- Briefing **disabled** until opt-in; default hour `08:00` local
- Timezone + `hourLocal` (0–23) on briefing settings (reuse notification
  timezone pattern where present)
- Hourly cron dispatcher; idempotent per local calendar day
- Plan gate: Pro+ / demo via `hasProAccess` (same as notifications)
- LLM: Sonnet-class via existing Anthropic patterns; zod-structured
  artifact; demo path `demoBriefingArtifact(...)` when no key
- Ranking changelog: one plain-language sentence in coaching insight when
  weights recomputed recently; skip if no data — never fake numbers
- Email: optional opt-in; Resend fetch pattern; no-op without keys
- Usage: record AI spend to `usage` if research/semantic pattern exists
- No auto-publish; no fake engagement %; no new npm deps

## Stories

- [x] **WP12-S1 — Schema + shared helpers**
  - Additive schema: `briefingSettings` (enabled, hourLocal, timezone,
    emailOptIn) + `briefingRuns` (status, error, counts, artifact, localDay).
  - `shared/briefings.ts`: local-hour matching, local-day key, demo
    artifact builder, optional ranking-changelog sentence helper.
  - Vitest coverage for hour/day matching + demo artifact shape.

- [x] **WP12-S2 — Convex queries/mutations + account cascade**
  - `convex/briefings.ts`: get/update settings, list/latest run; all public
    functions use `requireUser(ctx, sessionToken)`.
  - Internal helpers for cron/action to read settings + write run records.
  - `shared/accountData.ts` + `convex/account.ts`: delete/export include
    briefing tables.

- [x] **WP12-S3 — Briefing action (generate artifact)**
  - `convex/briefingActions.ts`: load overnight opportunities + yesterday
    outcomes (+ light ranking changelog if present); LLM or demo path;
    write completed/failed `briefingRuns` row; record usage when AI used.
  - Demo / missing `ANTHROPIC_API_KEY` never throws to the user path.
  - No publish mutations reachable from this action.

- [x] **WP12-S4 — Cron dispatcher**
  - `convex/crons.ts` + internal dispatch: hourly; enqueue eligible Pro+/demo
    users whose local hour matches now and who lack a run for that local day.
  - Idempotent: second dispatch same local day is a no-op.

- [x] **WP12-S5 — Briefing UI surface + nav**
  - `/briefing` page (or equivalent app route) shows latest artifact +
    last-run status ("last briefing ran at …" / never-run empty state).
  - Free plan: surface visible with upgrade copy; no fake scores.
  - Minimal nav link; Dark Chrome / `ds/` adapters; landing untouched.

- [x] **WP12-S6 — Settings + optional email**
  - Settings card: enable, hour, timezone, email opt-in.
  - On successful run, if email opt-in: Resend delivery (env-gated; no-op
    without keys / demo). Does not block run completion on email failure.

- [x] **WP12-S7 — Final verification + PR**
  - Full `npm run typecheck && npm run lint && npm test && npm run build`.
  - Push branch; open PR with DoD, verification per story, deviations,
    Found-not-fixed. Do not merge.
