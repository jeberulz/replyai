# Phase 2 Program — Compounding intelligence

**Kickoff base:** `main` @ WP34 merged (`21473cc` or later).  
**Current base:** `main` @ Wave 2 complete (`5d1b14a` / #48 or later).  
**Exit criterion:** data moat visible — retention driven by accumulated per-user
outcome data (reply-back, relationships, compounding content).  
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
| WP38 | Command palette v2 | #40 |
| WP35 | Engagement-window prediction | #41 |
| WP37 | Trend-radar MVP | #42 |
| WP13 | Relationship memory | #43 |
| WP23 | Reply-to-post ladder | #44 |
| WP14 | A/B reply variants | #47 |
| WP36 | Voice-drift agent | #48 |
| Phase 1 | WP7–11, WP9, WP21, WP31, WP33, WP10, WP22, Astryx WP24–30 | on `main` |

---

## Phase 2 backlog (remaining)

| WP | Package | Branch slug |
|---|---|---|
| WP15 | PWA + offline drafts | `feat/wp15-pwa-offline-drafts` |
| WP39 | Onboarding concierge MVP | `feat/wp39-onboarding-concierge-mvp` |

**Phase 2 complete** when Wave 3 merges + Gate 3 passes.

Story scaffolds on `main`: WP23, WP38, WP35, WP37, WP13, WP14, WP36, **WP39, WP15**.

---

## Wave plan

### Wave 1 — complete

| WP | PR |
|---|---|
| WP38 | #40 |
| WP35 | #41 |
| WP37 | #42 |
| WP13 | #43 |
| WP23 | #44 |

### Wave 2 — complete

| WP | PR |
|---|---|
| WP14 | #47 |
| WP36 | #48 |
| Gate fix | #46 (compose null-safe detail) |

### Wave 3 — launch polish ← **current**

| Worker | WP | File boundary |
|---|---|---|
| W8 | WP39 | `onboarding/**`, `convex/onboardingConcierge*`, onboarding actions |
| W9 | WP15 | `public/manifest*`, extend `push-sw.js`, `src/lib/offlineDrafts.ts`, draft sync UI |

**Parallel OK:** WP39 and WP15 are disjoint (no shared files except avoid both editing `src/app/actions.ts` in same commit — split action groups per WP).

**Sequence note:** WP15 last before Product Hunt push (program plan); can merge before or after WP39 if gate green.

---

## Collision rules

| Pair | Rule |
|---|---|
| WP15 ↔ WP8 | Extend `push-sw.js` additively; push + notificationclick must regress-test |
| WP15 ↔ WP14 | WP14 merged ✅ — draft schema stable for offline queue |
| WP39 ↔ WP15 | No overlap — onboarding vs PWA |
| WP39 ↔ research | Proposed watches require explicit user accept (same as WP33) |
| Schema | Additive/optional only |

---

## Wave gates

Run on post-merge `main` after each wave:

1. `npm run typecheck && npm run lint && npm test && npm run build`
2. Demo mode (zero keys): analyze → generate → save; feed → opportunity → draft; draft → publish
3. Eval fixtures green (`npm run evals` / CI gate)
4. Orchestrator walks each merged WP's `wpNN-stories.md` acceptance criteria

**Gate 3 extras (Wave 3):**

- Offline: save draft in airplane mode → reconnect → draft appears in Convex
- Onboarding: demo concierge proposal → accept → keywords/goal applied
- Push: hot-window notification still opens `/feed` (WP8 regression)
- Install: Lighthouse PWA installable (document score in PR)

Tag: `git tag phase-2-gate-3-pass` when green.

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
git checkout -b feat/wp39-onboarding-concierge-mvp origin/main
# or
git checkout -b feat/wp15-pwa-offline-drafts origin/main
```

---

*Maintained by the Phase 2 orchestrator. Update when Wave 3 completes.*
