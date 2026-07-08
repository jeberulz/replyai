# WP03 Progress

## 2026-07-08

- Read required docs in order: `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` (§4, §8.5, §10, §14 WP3), `convex/_generated/ai/guidelines.md`, relevant Next App Router docs from `node_modules/next/dist/docs/`, and `design.md`.
- Confirmed the WP3 branch starts clean at `aa7ddf0` and tracks `origin/main` at the same commit.
- Ran `npm ci` because `node_modules` was absent and the required local Next docs were unavailable before install; this also enables local checks later.
- Checked `docs/wp/RULINGS.md`; no existing WP3 ruling is recorded.
- Initial implementation plan: inventory/export first, destructive cascade second, settings UI last. Deletion must expose a dry-run inventory and use bounded Convex batches before deleting the `users` row.
- Completed `WP03-S1`.
  - Added `shared/accountData.ts` as the account-data contract and `docs/wp/wp03-data-inventory.md` documenting user-owned tables, owner fields, relationship fields, and deletion order.
  - Added `convex/account.ts` with authenticated `inventory` query using `requireUser(ctx, sessionToken)` and dry-run counts only.
  - Added additive `by_user` indexes on `sessions` and `researchProfiles` so inventory/deletion do not require user-owned table scans.
  - `cachedResponses` is intentionally excluded because it has no `userId` owner field and is an expiring keyed cache.
  - Added `tests/accountData.test.ts` for table contract, authenticated-owner scoping, unrelated-user exclusion, and deterministic dry-run totals.
  - Checks: `npm run typecheck` passed; `npm test -- tests/accountData.test.ts` passed; `npm test` passed (26 files, 204 tests; 1 skipped).
  - Attempted `npx convex codegen`; blocked locally because `CONVEX_DEPLOYMENT` is unset in this worktree. Revisit generated API metadata before any `api.account.*` TypeScript references land.
