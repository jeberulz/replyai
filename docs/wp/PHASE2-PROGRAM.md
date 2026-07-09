# Phase 2 Program — Compounding intelligence

**Kickoff base:** `main` @ WP34 merged (`21473cc` or later).  
**Current base:** `main` @ Wave 3 complete (`d4e0784` / #50–#52 or later).  
**Exit criterion:** data moat visible — retention driven by accumulated per-user
outcome data (reply-back, relationships, compounding content).  
**Process:** `docs/AGENT_PLAYBOOK.md` §5–§7 (orchestrator + workers, story loop,
wave gates).  
**Model policy (Phase 2 sprint):** all worker sessions use **Grok 4.5 Fast**
(`grok-4.5-fast-xhigh`) unless the orchestrator escalates after two failed gates.

**Status:** Wave 3 merged. Automated Gate 3 green. Tag `phase-2-gate-3-pass`
after manual extras. See `docs/wp/PHASE2-CLOSEOUT.md`.

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
| WP15 | PWA + offline drafts | #50 |
| WP39 | Onboarding concierge MVP | #51 |
| Phase 1 | WP7–11, WP9, WP21, WP31, WP33, WP10, WP22, Astryx WP24–30 | on `main` |

---

## Phase 2 backlog (remaining)

**Empty.** All Phase 2 WPs merged.

**Phase 2 complete** when Gate 3 passes (automated ✅ + manual extras) and
`phase-2-gate-3-pass` is tagged.

Story scaffolds on `main`: WP23, WP38, WP35, WP37, WP13, WP14, WP36, WP39, WP15.

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

### Wave 3 — complete

| WP | PR |
|---|---|
| WP15 | #50 |
| WP39 | #51 |
| Docs scaffold | #49 / #52 |

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

Tag: `git tag phase-2-gate-3-pass` when green (including manual extras).

---

*Maintained by the Phase 2 orchestrator. Wave 3 complete — see PHASE2-CLOSEOUT.md.*
