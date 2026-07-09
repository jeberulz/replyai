# WP13 Stories — Relationship memory

**Definition of done** (`docs/PRODUCT_STRATEGY.md` §14): Per-author dossier:
past interactions, what they responded to, reply-settings history, cadence;
surfaces in feed + workbench (“you've had 2 responses from @a …”).

**Product refs:** §5.1 P2 author relationship memory, §7.2 (relationship layer).

**Depends on:** WP7 on `main`.

**Parallel-safe with:** WP23 if schema/table names coordinated; **not** with WP37
same-table edits — WP13 owns `authors` table.

## File boundary

**Owns:**

- `convex/schema.ts` — `authors` (or `authorRelationships`) table + indexes
- `convex/authors.ts`
- Dossier UI component(s) on feed row detail / workbench
- `shared/authors.ts` if pure formatters needed
- `tests/authors.test.ts`

**May touch additively:**

- Outcome agent hooks to upsert author rows on `responded`
- `shared/accountData.ts` + `convex/account.ts` for delete/export

## Defaults

- Key by `(userId, authorHandle)` or stable X user id when available.
- Store: interaction count, last respondedAt, topics responded, last reply-settings seen.
- UI: expandable dossier on opportunity detail — not a fake score.
- Demo: fixture dossiers for demo handles.
- No auto-follow or auto-reply.

## Stories

- [x] **WP13-S1 — Schema + upsert from outcomes**
  - Additive author table; internal mutation or outcome pipeline patch to upsert on responded.
  - Index by user + handle.

- [x] **WP13-S2 — Queries for dossier**
  - getByHandle, list top relationships (by response count / recency).
  - requireUser on all public functions.

- [x] **WP13-S3 — Feed/workbench dossier UI**
  - Show dossier snippet when viewing opportunity from known author.
  - Dark Chrome; demo fixtures render.

- [x] **WP13-S4 — Account cascade + tests**
  - Delete/export includes author rows.
  - Unit tests for upsert merge logic.

- [x] **WP13-S5 — Verification**
  - Manual demo path; checks green; DoD checklist in PR.
