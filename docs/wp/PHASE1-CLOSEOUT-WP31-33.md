# Phase 1 close-out — WP31–WP33 orchestration

**Goal:** Ship the remaining explicit Phase 1 product gaps from
`docs/PRODUCT_STRATEGY.md` §10 (items #3, ranking loop, #4 research v2).

**Prerequisite:** **WP9** (scan-triage) merged to `main` before starting this
wave. Rebase each branch on latest `main` before opening PRs.

## Packages

| WP | Branch | Phase 1 closes | Parallel with |
|---|---|---|---|
| **WP31** | `feat/wp31-freshness-auto-archive` | §10 #3 freshness + auto-archive | **WP32** |
| **WP32** | `feat/wp32-ranking-outcome-weights` | §2 ranking funnel + changelog MVP | **WP31** |
| **WP33** | `feat/wp33-research-agent-v2-mvp` | §10 #4 research agent v2 (MVP) | — (after WP31 or rebase on WP31 for `crons.ts`) |

## Merge order (recommended)

```
main (+ WP9 merged)
  ├─► WP32 (ranking) ──► merge
  ├─► WP31 (freshness) ──► merge   ← can land same day as WP32
  └─► WP33 (research v2) ──► merge  ← rebase after WP31 (both edit crons.ts)
```

**Cron conflict:** WP31 and WP33 both append to `convex/crons.ts`. Run in
parallel if you want, but **WP33 rebases on WP31** before PR merge.

## Agent assignment

Each agent owns **one WP** per `docs/AGENT_PLAYBOOK.md` §0–§1. Read before
coding:

1. `PRD.md`, `AGENTS.md`, `docs/AGENT_PLAYBOOK.md`
2. `docs/PRODUCT_STRATEGY.md` §4 + §10 Phase 1
3. Your WP's `docs/wp/wpNN-stories.md`
4. `docs/wp/RULINGS.md` → **WP31 / WP32 / WP33** file boundaries
5. `convex/_generated/ai/guidelines.md` before Convex edits

## Definition of done (wave exit)

Phase 1 product code is **honestly closed** when all three PRs are on
`main` plus:

- [ ] WP9 on `main`
- [ ] Feed default list excludes expired/archived opportunities
- [ ] Ranking recomputes from `responded > sent > analyzed` (not click-through)
- [ ] User sees a plain-language ranking changelog after weekly recompute
- [ ] Monthly research curator run + quiet-profile prune + replacement suggestions

**Not in this wave (Phase 2 or launch hardening):** full WP12 briefing, LLM
ranking-analyst agent, fair-use rate limits (Phase 0 tail — separate WP).

## Checks (every PR)

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
