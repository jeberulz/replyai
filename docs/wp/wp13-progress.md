# WP13 Progress — Relationship memory

## 2026-07-09 — Scaffold

- Wave 1B — start after or parallel with WP23 mid-flight; owns `authors` schema.

## 2026-07-09 — Implementation

### Decisions

- Table name: `authors` (not `authorRelationships`) — matches §14 / PHASE2 collision rule vs WP37 topic clusters.
- Key: `(userId, authorHandle)` normalized via `shared/feedFilters.normalizeHandle`; optional `authorXUserId` stored when available later.
- Upsert hooks live in `outcomes.seedPublishedDraft` (sent) + `outcomes.markResponded` (responded) — additive, no drafts/compose edits.
- `responded` does not double-count `sent` when a prior send exists; legacy responded-only still records one send.
- Public queries: `getByHandle`, `listTop` — both `requireUser`. Demo fixtures require client-supplied `now` (no `Date.now()` in queries).
- UI: expandable `AuthorDossier` on feed opportunity detail + workbench; snippet is observed counts only (no fake scores).
- Account cascade: `authors` at deletionOrder 48 in `ACCOUNT_USER_TABLES` + switch arms in `convex/account.ts`.

### Gotchas

- Worktree had no `node_modules`; symlinked to sibling checkout for checks. Do not commit the symlink.
- `npx convex codegen` needs `CONVEX_DEPLOYMENT`; manually registered `authors` in `convex/_generated/api.d.ts` (runtime `api.js` is `anyApi`).
- Reply-settings history merges newest-first and dedupes by settings string.

### Verification

- `npm run typecheck && npm run lint && npm test && npm run build` green.
- Demo handles `sarahbuilds` / `marcusship` / `priyaml` return snippets via fixtures when no stored row.
