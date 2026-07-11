# WP52 Stories - Compose Activation and Evidence

**Definition of done** (`docs/PRODUCT_STRATEGY.md` section 14): Compose is hidden
from navigation until a non-demo user has a real qualifying reply win while
`/compose` remains directly reachable as an explicit zero-cost preview; real
runs resolve authorized clusters server-side; input and generation provenance
are truthful and persisted; typed events measure open -> generate -> option
action and real/demo breakdowns; immediate-publish copy states that posting is
queued rather than awaiting confirmation; demo mode, authorization,
three-option guardrails, and full checks remain green.

**PRD:** `tasks/prd-compose-activation-and-evidence.md`

**Depends on:** WP7 reply-back tracking, WP20 edit-distance buckets, WP23
reply-to-post ladder, and WP40 private-beta foundation on `main`.

**Registration dependency:** WP41-WP51 are registered by PR #61
(`docs/wp41-grok-eval-program`). This WP52 registration is intentionally stacked
on that docs branch until #61 lands or the owner authorizes a different
sequence.

## File boundary

**Owns / may edit:**

- `shared/compose.ts`
- `convex/compose.ts`
- `convex/schema.ts` only for additive Compose provenance fields
- `src/lib/ai.ts` only within Compose generation/provenance code
- `src/app/actions.ts` only within Compose actions
- `src/lib/analytics/events.ts`
- `src/components/app/compose-ladder.tsx`
- `src/components/app/sidebar/nav-links.ts`
- `src/components/app/sidebar/sidebar-nav.tsx`
- `src/components/app/command-menu.tsx`
- Narrow app-shell/nav files only when proven necessary
- Focused `tests/` files
- `docs/observability.md`
- `docs/wp/wp52-stories.md`
- `docs/wp/wp52-progress.md`

`docs/PRODUCT_STRATEGY.md` is owned only by registration. The implementation
worker must not edit it concurrently.

## Stories

- [ ] **WP52-S1 - Register/scaffold and baseline**
  - Confirm WP52 is the next available identifier after the WP41-WP51 reserved
    program.
  - Register the section-14 row.
  - Create story/progress ledgers before product-code edits.
  - Record base SHA, dependency state, dirty-worktree inventory, file boundary,
    collisions, initial full-check status, and model-routing ledger.

- [ ] **WP52-S2 - Lightweight authenticated availability**
  - Add a cheap authenticated Convex availability query returning at least
    `hasRealSource`.
  - Share pure eligibility logic with clustering.
  - Demo identities always return false; no reply text or fixtures are returned.
  - Tests cover empty, expired-only, responded/no-edit, responded/minor-edit,
    responded/major-edit, blank text, legacy missing bucket, and cross-user
    isolation.

- [ ] **WP52-S3 - Earned navigation**
  - Hide Compose from expanded/collapsed sidebar, mobile drawer, and command
    menu until availability resolves true.
  - Fail closed on loading/errors without breaking the app shell.
  - Keep `/compose` directly reachable and show a labelled deterministic preview
    for ineligible users.
  - Browser verification covers 375, 768, 1280, and 1728 widths.

- [ ] **WP52-S4 - Truthful provenance and server-resolved inputs**
  - Persist source provenance separately from generation provenance using
    additive/optional schema fields.
  - Store generation provenance from the actual `generateComposeOptions` result,
    including deterministic fallback after model errors.
  - Resolve real cluster context server-side by stable ID; preview accepts only a
    known server-side demo-cluster ID.
  - UI labels preview, fallback, and real/live states without exposing provider
    configuration, key names, raw errors, or secrets.

- [ ] **WP52-S5 - Typed evidence funnel**
  - Add Compose open, generation-complete, and successful option-action events
    only through the typed analytics catalog.
  - Include availability/source/generation provenance, format, action, and
    non-sensitive run IDs where available.
  - Avoid duplicate page-open events and do not count queued standalone posts as
    actual publishes.
  - Update observability docs with the Compose insight definition.

- [ ] **WP52-S6 - Correct immediate-publish semantics**
  - Change standalone copy to communicate immediate queueing, e.g. `Post now`.
  - Success toast says the post was queued and Drafts shows status.
  - Failure emits no successful option-action conversion.
  - Preserve explicit-click publish invariant; add no confirmation modal and no
    thread/long-form API publishing.

- [ ] **WP52-S7 - Full gate and PR evidence**
  - Focused tests cover eligibility, navigation filtering, provenance,
    analytics, and publish copy/behavior.
  - Required checks pass: typecheck, lint, test, evals, security audit, build,
    and responsive browser suite.
  - Run security and code review passes and address findings.
  - Map every DoD item to evidence in `wp52-progress.md`.
  - Prepare PR description; do not merge without explicit owner authorization.
