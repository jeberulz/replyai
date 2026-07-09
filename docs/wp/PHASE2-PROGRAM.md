# Phase 2 Program — Compounding intelligence

**Kickoff base:** `main` @ WP34 merged (`21473cc` or later).  
**Exit criterion:** data moat visible — retention driven by per-user outcome
data (reply-back, relationships, compounding content).  
**Process:** `docs/AGENT_PLAYBOOK.md` §5–§7 (orchestrator + workers, story loop,
wave gates).  
**Model policy (Phase 2 sprint):** all worker sessions use **Grok 4.5 Fast**
(`grok-4.5-fast-xhigh`) unless the orchestrator escalates after two failed gates.

---

## Already shipped (do not re-assign)

| WP | Package | PR / note |
|---|---|---|
| WP12 | Daily briefing agent | #34 |
| WP32 | Ranking outcome weights + deterministic changelog | #37 |
| WP34 | Fair-use caps + duplicate-reply warnings | #38 |
| Phase 1 | WP7–11, WP9, WP21, WP31, WP33, WP10, WP22, Astryx WP24–30 | on `main` |

---

## Phase 2 backlog

### §14 packages (official)

| WP | Package | Priority | Branch slug |
|---|---|---|---|
| **WP23** | Reply-to-post ladder | **P0 flagship** | `feat/wp23-reply-to-post-ladder` |
| WP13 | Relationship memory | P1 moat | `feat/wp13-relationship-memory` |
| WP14 | A/B reply variants | P2 | `feat/wp14-ab-reply-variants` |
| WP15 | PWA + offline drafts | P2 launch polish | `feat/wp15-pwa-offline-drafts` |

### Phase 2 extensions (program packages — see RULINGS 2026-07-09 Phase 2)

| WP | Package | Priority | Branch slug |
|---|---|---|---|
| WP35 | Engagement-window prediction | P1 honest numbers | `feat/wp35-engagement-window-prediction` |
| WP36 | Voice-drift agent | P2 | `feat/wp36-voice-drift-agent` |
| WP37 | Trend-radar MVP | P1 discovery | `feat/wp37-trend-radar-mvp` |
| WP38 | Command palette v2 | P1 daily-driver UX | `feat/wp38-command-palette-v2` |
| WP39 | Onboarding concierge MVP | P2 | `feat/wp39-onboarding-concierge-mvp` |

Story scaffolds on `main`: WP23, WP38, WP35, WP37, WP13 (this program PR).
Workers for WP14–15, WP36, WP39 author `wpNN-stories.md` on their branch before
coding.

---

## Wave plan

### Wave 1A — parallel (max 3 workers, disjoint files)

| Worker | WP | File boundary |
|---|---|---|
| W1 | WP38 | `src/components/app/command-menu.tsx`, `sidebar/*`, optional `voiceProfiles` list query usage |
| W2 | WP35 | `shared/timing*.ts`, new `convex/timing.ts` or `usage` queries, analytics/dashboard cards |
| W3 | WP37 | `shared/trends.ts`, new `convex/trends.ts`, research/feed radar UI strip |

**No** edits to `convex/drafts.ts`, `convex/compose.ts`, or `authors` schema in 1A.

### Wave 1B — flagship + moat (2 workers)

| Worker | WP | File boundary |
|---|---|---|
| W4 | WP23 | **Owns** `convex/compose.ts`, compose prompts in `src/lib/ai.ts` (compose-only helpers), compose UI route, `src/app/actions.ts` compose actions |
| W5 | WP13 | **Owns** `authors` schema, `convex/authors.ts`, dossier UI on feed/workbench |

### Wave 2 — after Gate 1

| Worker | WP | Sequencing |
|---|---|---|
| W6 | WP14 | Start after WP23 merges **or** additive-only draft fields (`variantGroupId`) |
| W7 | WP36 | Parallel with WP14 if limited to voice profile tables + voice studio |

### Wave 3 — launch polish

| Worker | WP | Notes |
|---|---|---|
| W8 | WP39 | `src/app/onboarding/**`, one Convex action, demo fallback |
| W9 | WP15 | `public/manifest`, service worker, offline draft queue — last before PH push |

---

## Collision rules

| Pair | Rule |
|---|---|
| WP23 ↔ WP14 | WP23 merges first; WP14 adds only additive draft metadata |
| WP13 ↔ WP37 | WP13 = per-author dossier; WP37 = niche topic clusters — separate tables |
| WP15 ↔ WP14 | WP15 after draft schema stable |
| WP23 ↔ WP38 | OK parallel; palette may deep-link to `/compose` when WP23 lands |
| Schema | Additive/optional only; widen → migrate → narrow per playbook §7 |

---

## Wave gates

Run on post-merge `main` after each wave:

1. `npm run typecheck && npm run lint && npm test && npm run build`
2. Demo mode (zero keys): analyze → generate → save; feed → opportunity → draft; draft → publish
3. Eval fixtures green (`npm run evals` / CI gate)
4. Orchestrator walks each merged WP's `wpNN-stories.md` acceptance criteria

Tag restore point before irreversible schema: `git tag phase-2-wave-N-pre`.

---

## Minimum beta slice (recommended)

Ship to 50-user beta after Gate 1:

1. **WP23** — reply-to-post ladder (standalone publish surface)
2. **WP38** — command palette v2
3. **WP35** — engagement-window prediction
4. **WP13** — relationship memory

Defer post-beta: WP14, WP15, WP36, WP37 (full), WP39.

---

## Orchestrator spawn template

```
You own WP{NN} only. NOT the orchestrator.
Model: grok-4.5-fast-xhigh
Repo: replyai · Branch: feat/wp{NN}-{slug} from origin/main
Read: AGENT_PLAYBOOK.md, PRD.md, AGENTS.md, docs/wp/wp{NN}-stories.md,
  PRODUCT_STRATEGY §14, convex/_generated/ai/guidelines.md, design.md (UI)
File boundary: {from this doc}
DoD: {from stories file header}
Story loop → checks → commit → progress.md
Open PR; do not merge.
```

---

## Worker quick start

```bash
git fetch origin main
git checkout -b feat/wpNN-short-slug origin/main
# Copy or verify docs/wp/wpNN-stories.md exists; implement unchecked stories only
```

---

*Maintained by the Phase 2 orchestrator. Update when waves complete or RULINGS change scope.*
