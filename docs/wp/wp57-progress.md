# WP57 Progress - Scanner Background-Cost Guard

Append-only implementation log. Never record secrets, tokens, private user
content, or customer-identifying data.

## 2026-07-15 - Setup, signal, and scope

- User request: stop the Convex Free-plan overage without upgrading.
- Branch/worktree: `codex/wp57-scanner-cost-guard` in the contained
  `.worktrees/wp57-scanner-cost-guard` directory, based on `origin/main` at
  `d7e529a`. The dirty main checkout and its unrelated WP/eval work were not
  modified.
- Lane: Work Package. The change is additive schema plus live-dev data
  backfill, so it is not eligible for the Small Fix lane.
- Measured team signal from the supplied dashboard: ReplyPilot produced 485k
  of 533k calls; roughly 400k were the repeated scanner function chain.
- Read-only live-dev inventory before code changes:
  - `scannerSettings`: 503 total, 502 visibly enabled, 1 disabled, 503 missing
    the new background flag.
  - `users`: 541 total, 534 demo, 7 non-demo, 1 paid-plan row.
  - `scanner.enabledSettings`: 502 recurring eligible rows, all free-plan demo
    identities under the existing `hasProAccess` demo rule.
- Approved mutation scope: the user's follow-up "go ahead and fix it" followed
  the explicit finding that 502 scanner-enabled demo users were driving the
  recurring fan-out and the recommendation to remove demo users from background
  scanning. The planned data mutation is additive and reversible: populate only
  `scannerSettings.backgroundEnabled`; do not delete users, settings, or product
  data and do not change the user-visible `enabled` toggle.
- Rollout lock: optional field + dual writes + dual read, dry-run/apply bounded
  backfill on dev, then indexed hot path. Demo `scanNow` behavior remains intact.
- Initial `npx convex insights --details`: healthy over the last 72 hours; this
  confirms a workload-amplification problem rather than an execution-limit or
  OCC incident.

## 2026-07-15 - S2 dual-write implementation

- Added optional `scannerSettings.backgroundEnabled` with the
  `by_background_enabled` storage index. The existing `enabled` field remains
  the user-visible toggle.
- Added one pure scheduling rule: background work requires `enabled` and a
  non-demo identity. Demo users retain explicit `scanNow` access through the
  existing Pro/demo entitlement path.
- Updated every scanner-settings insert path to write an explicit false
  background flag for disabled defaults; `updateSettings` computes the flag
  from live/demo identity; X disconnect clears both flags.
- Focused verification: scanner scheduling + X disconnect tests passed (2
  files / 5 tests); `npm run typecheck` passed.
