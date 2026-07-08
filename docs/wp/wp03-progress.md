# WP03 Progress

## 2026-07-08

- Read required docs in order: `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` (§4, §8.5, §10, §14 WP3), `convex/_generated/ai/guidelines.md`, relevant Next App Router docs from `node_modules/next/dist/docs/`, and `design.md`.
- Confirmed the WP3 branch starts clean at `aa7ddf0` and tracks `origin/main` at the same commit.
- Ran `npm ci` because `node_modules` was absent and the required local Next docs were unavailable before install; this also enables local checks later.
- Checked `docs/wp/RULINGS.md`; no existing WP3 ruling is recorded.
- Initial implementation plan: inventory/export first, destructive cascade second, settings UI last. Deletion must expose a dry-run inventory and use bounded Convex batches before deleting the `users` row.
