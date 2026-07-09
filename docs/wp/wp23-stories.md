# WP23 Stories — Reply-to-post ladder

**Definition of done** (`docs/PRODUCT_STRATEGY.md` §14): Topic-clustered winning
replies + unused angles → voice-matched **standalone post** / **4–8 thread** /
**long-form draft**; standalone publish via existing API path; Articles as
copy-out drafts; **human click on every send**.

**Product refs:** §5.5 (Phase 2 flagship), §10 Phase 2 item 1b, PRD §11 roadmap
(original-post territory from proven replies).

**Depends on:** WP7 on `main` (outcome / reply-back data for “winning” replies).

**Parallel-safe with:** WP38, WP35, WP37 (disjoint files). **Not** parallel with
WP14 until WP23 merges or draft schema is additive-only.

## File boundary

**Owns (create/edit):**

- `convex/compose.ts` (new)
- `shared/compose.ts` (new — clustering + demo fixtures)
- Compose section of `src/lib/ai.ts` (new helpers only; do not refactor unrelated generation)
- `src/app/actions.ts` — compose* actions only
- New route e.g. `src/app/(app)/compose/**` or workbench tab (orchestrator confirms in S1)
- `tests/compose*.test.ts`

**May touch additively:**

- `convex/schema.ts` — `composeRuns` or `savedDrafts.kind` extension if needed
- `convex/drafts.ts` — new draft kinds / publish modes for thread + long-form copy-out
- `src/components/app/drafts/**` — display new draft types

**Do not touch without escalation:** scanner, billing, extension, unrelated chat surfaces.

## Defaults (propose in S1; confirm with orchestrator if product-ambiguous)

- Input signals: published replies with `responded` outcome + high no/minor edit
  rate; cluster by topic/angle from analysis metadata
- Three output formats: (a) standalone short post, (b) 4–8 post thread, (c)
  long-form / Article **copy-out** (clipboard, not API publish)
- Standalone posts use existing `publishMode: "standalone"` path
- **3 options max per format** per generation request + “generate more”
- Demo: deterministic clusters + sample outputs in `shared/demoData.ts` or
  `shared/compose.ts`
- Fair-use: compose generations count against `usage.generations` / fair-use checks
- No auto-publish; no fake engagement scores

## Stories

- [ ] **WP23-S1 — Shared clustering + demo fixtures**
  - `shared/compose.ts`: pure functions to cluster winning reply rows by topic;
    pick unused missing-angles; vitest with fixture rows.
  - Demo path returns deterministic compose bundles when no AI key.

- [ ] **WP23-S2 — Schema + Convex compose API**
  - Additive schema for compose run records (status, error, input summary, outputs).
  - `convex/compose.ts`: list sources (eligible winning replies), start compose
    mutation, get run; all public fns use `requireUser`.
  - Account delete/export includes compose tables if persisted.

- [ ] **WP23-S3 — Generation action (standalone + thread + long-form)**
  - Server action + Convex action pattern mirroring analysis pipeline.
  - Zod-validated outputs; 3 options per requested format; voice block from default profile.
  - Record usage; demo never throws.

- [ ] **WP23-S4 — Compose UI surface**
  - User selects topic cluster → format → reviews options → save draft or publish standalone.
  - Dark Chrome / `ds/` components; mobile primary actions ≥44px.
  - Long-form/Article: copy-to-clipboard CTA only.

- [ ] **WP23-S5 — Draft + publish integration**
  - Thread drafts saved as multi-part or sequenced drafts (document choice in progress.md).
  - Standalone publish reuses existing publish mutation; reply restriction N/A.
  - Pacing + duplicate-reply warnings on publish path.

- [ ] **WP23-S6 — Tests + verification**
  - Unit tests for clustering; smoke test compose demo path.
  - Manual: demo mode end-to-end; Pro fair-use unaffected.
  - PR checklist: every DoD bullet mapped.
