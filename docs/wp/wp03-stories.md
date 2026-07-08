# WP03 Stories - Deletion + export

- [x] `WP03-S1` Account data inventory and export contract
  - Document the exact user-owned tables included in account export and deletion, with relationship fields and deletion order.
  - Add a safe, authenticated Convex account module surface that can return a dry-run inventory without deleting data.
  - Add focused tests proving the inventory is scoped to the authenticated user and excludes unrelated users.

- [ ] `WP03-S2` JSON export payload
  - Implement an authenticated JSON export payload that includes the user's account record and all related user data needed for a portable account download.
  - Export omits secrets or irreversible credential material while still listing token/account metadata needed to understand connected-account state.
  - Add focused tests proving export payload shape, ownership isolation, and deterministic JSON-safe values.

- [ ] `WP03-S3` Batched cascade deletion
  - Implement authenticated account deletion that cascades across all user-owned tables listed in the inventory and deletes the user record only after related rows are gone.
  - Large accounts are processed in bounded batches with continuation scheduling rather than a single unbounded destructive mutation.
  - Add focused tests proving all related rows are deleted, unrelated users' rows remain, and dry-run/inventory counts match deletion behavior.

- [ ] `WP03-S4` Settings export and deletion UI
  - Add Settings UI controls for downloading JSON export and requesting account deletion without changing unrelated settings surfaces.
  - Deletion requires an explicit typed confirmation and presents the dry-run inventory before calling the destructive action.
  - Server actions authenticate from the httpOnly session cookie, demo mode does not break, and the UI follows Dark Chrome settings conventions.

- [ ] `WP03-S5` Final verification and security audit
  - `npm run typecheck && npm run lint && npm test && npm run build` pass on the WP3 branch.
  - `npm run security:audit` runs because WP3 touches auth and data deletion/export behavior.
  - `docs/wp/wp03-progress.md` records verification results, decisions, and any unresolved escalation.
