# WP57 Stories - Scanner Background-Cost Guard

**Definition of done** (`docs/PRODUCT_STRATEGY.md` section 14): Background-cron
eligibility is stored and indexed separately from the user-visible scanner
toggle; demo users keep deterministic on-demand scanner behavior but never
enter recurring scan fan-out; legacy rows have a dual-read rollout and
idempotent backfill; the active dev deployment is backfilled/throttled and full
checks are green.

## File boundary

- `shared/scannerScheduling.ts`
- `shared/xDisconnect.ts`
- `convex/schema.ts`
- `convex/scanner.ts`
- Scanner-setting insert paths in `convex/onboardingConcierge.ts` and
  `convex/research.ts`
- Focused tests under `tests/`
- `README.md`
- `docs/PRODUCT_STRATEGY.md`
- `docs/wp/wp57-{stories,progress}.md`

## Stories

- [x] **WP57-S1 - Register, baseline, and freeze the rollout**
  - Record the measured live-dev inventory and the user-approved mutation
    scope before data changes.
  - Register WP57 and freeze file boundaries before product-code edits.
  - Preserve the unrelated dirty main checkout in an isolated worktree.

- [x] **WP57-S2 - Add explicit background eligibility and dual writes**
  - Add an optional indexed `scannerSettings.backgroundEnabled` field.
  - Every scanner-setting writer stores an explicit background eligibility
    value; demo rows store `false` even when their visible scanner toggle is on.
  - X disconnect clears both visible and background scanner state.
  - Focused unit tests cover demo, disabled, live, and disconnect behavior.

- [x] **WP57-S3 - Cut the cron read/fan-out hot path safely**
  - `enabledSettings` reads explicit eligible rows through the storage index.
  - Legacy missing-field rows remain readable during rollout and are filtered
    with the same demo/access guard, so no real eligible user is dropped.
  - Demo users remain eligible for explicit `scanNow` deterministic behavior
    but are never returned to `scanAll`.

- [x] **WP57-S4 - Backfill and verify the active dev deployment**
  - Add a bounded, idempotent dry-run/apply migration for the measured small
    `scannerSettings` table.
  - Deploy to dev, record the dry-run inventory, apply only the approved rows,
    and verify no legacy rows or demo background-eligible rows remain.
  - Set the existing dev cadence floor to daily as a reversible safety net.

- [ ] **WP57-S5 - Full gate and handoff**
  - Update README architecture/operations guidance.
  - Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
  - Re-query live dev state and record verification plus docs status.
