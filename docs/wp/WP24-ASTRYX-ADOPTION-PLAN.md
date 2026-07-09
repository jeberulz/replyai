# WP24–WP28 — Astryx adoption plan (Dark Chrome owns the system)

**Status:** plan only — do not implement until the owner assigns a WP and an
orchestrator session is running.
**Audience:** orchestrator + worker agents (playbook §7).
**Sources:** `design.md`, audit canvas, [Astryx getting started](https://astryx.atmeta.com/docs/getting-started),
`docs/AGENT_PLAYBOOK.md`, `docs/PRODUCT_STRATEGY.md` §4 / §9 / §10 / §14,
open branches/PRs as of 2026-07-09.

---

## 0. Strategic intent

**Goal:** replace the thin shadcn kit with Astryx as the *product UI
foundation*, while **Dark Chrome remains the brand**. Astryx supplies
tokens-as-API, layout, fields, density, AI-surface primitives, and a theme
pipeline. We do **not** adopt Neutral/Butter/Gothic aesthetics.

**North-star UX outcome:** denser, more consistent Feed / Drafts / Workbench /
Settings — without looking like a stock Meta/Astryx demo.

**Product strategy fit:**

| Strategy need | How this program helps |
|---|---|
| Phase 0 mobile triage (§9, WP6) | Shared size/spacing + bottom action patterns; do not reopen WP6 DoD |
| Phase 1 command palette (§5 / roadmap) | Prefer Astryx `CommandPalette` when that feature WP opens — after WP25 |
| Launch polish / trust | Field/Banner/EmptyState grammar beats ad-hoc Card stacks |
| Guardrails (§4) | UI-only; no publish path, scoring, or Convex auth changes |

**Non-goals (hard):**

1. **Do not touch the landing page** — `src/app/page.tsx` and any
   Ghostbase-stripe / hero / marketing-only components stay on current
   Dark Chrome CSS. No Astryx imports on the marketing surface in this
   program.
2. **Do not let stock Astryx theme the product** — Neutral is a *scaffold
   dependency* only; visual truth is a custom `darkChromeTheme`.
3. **Do not rewrite ReplyPreview** (X destination mock) — product-specific.
4. **Do not mandate StyleX** — use Tailwind bridge + `className` (matches
   current stack). StyleX is optional later, never a gate.
5. **Do not merge this into an existing feature WP** — new WP numbers only
   (playbook: one WP = one branch = one PR).

---

## 1. Timing vs ongoing work (collision map)

### Live / hot as of plan date

| Work | Risk to this program | Rule |
|---|---|---|
| PR #19 `fix/ci-lockfile-sync` | `package-lock.json` | **Gate 0:** merge CI fix before any Astryx install PR |
| Uncommitted research UI on `main` (`src/components/app/research/*`, deleted `profile-suggestion-card`) | research components | Finish or park that WIP on its own branch before WP27 touches research rows |
| WP10 extension (open PR) | mostly `extension/` | No collision if we stay out of `extension/` |
| WP2 / WP3 settings UI | `src/app/(app)/settings`, account controls | **WP25–26 avoid settings call sites** until those WPs are merged or idle; Field migration of settings is WP27+ or a dedicated follow-up |
| WP6 mobile split | `src/components/app/split/*` | **Do not reopen** stacked-nav behavior; WP26/27 may *consume* pane chrome, not redesign breakpoints |
| WP11 analytics card | `chat-home`, personal-analytics | WP28 only; after WP11 merges |
| WP21 research scoring/UI | research components | WP27 research pass waits for WP21 |
| WP22 pacing coach | dashboard / drafts / warnings | Avoid `reply-pacing*` and dashboard pacing modules until merged |
| WP17 voice studio | `voice-studio.tsx` | Out of scope until wave C |

### Soft freeze zones (workers escalate if they need these)

```
src/app/page.tsx                          # landing — NEVER
src/app/globals.css                       # WP24 only (dual-token bridge)
package.json / package-lock.json          # WP24 only
src/components/app/split/*                # WP6 ownership — read-only unless ruling
src/app/(app)/settings/**                 # WP2/WP3 — freeze until clear
src/components/app/research/**            # WP21 / current WIP — freeze until clear
src/components/app/reply-pacing/**        # WP22
src/components/app/chat/personal-analytics*  # WP11
extension/**                              # WP10
```

### Sequencing principle (playbook)

Risk order: **install + theme (reversible) → adapters (reversible) →
shell swap → list/workbench (high UX, high conflict) → chat surfaces.**
Irreversible “delete all shadcn” is **last**, behind an owner gate.

---

## 2. Adoption shape (locked)

Same shape as the audit recommendation, expanded into WPs:

```
WP24  Foundation     install + Dark Chrome defineTheme + app-only Theme provider
WP25  Primitive kit  adapters over Astryx Button/Field/Banner/… (shadcn stays)
WP26  App shell      SideNav / AppShell / CommandPalette wiring (app routes only)
WP27  Lists+workbench Item / SelectableCard / SegmentedControl / StatusDot / EmptyState
WP28  AI surfaces    Chat / Tokenizer / Progress / suggestion patterns (optional wave)
```

**Landing stays Dark Chrome forever in this program.** App shell migrates
underneath `(app)` and `(onboarding)` layouts only.

**Hybrid end state (not big-bang):**

- Marketing: current CSS tokens + Tailwind utilities (unchanged).
- App: Astryx components + `darkChromeTheme` tokens (via Theme + built CSS).
- Shared utilities (`cn`, lucide icons) stay.
- `src/components/ui/*` shadcn files shrink over WP25–27 as call sites move;
  deletion is a final cleanup story, not wave-1.

---

## 3. Installation recipe (from Astryx docs — adapted)

Follow [Getting Started](https://astryx.atmeta.com/docs/getting-started), then
**immediately** diverge from stock Neutral visuals.

### 3.1 Packages (WP24)

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral @astryxdesign/cli
```

- `theme-neutral` is required as the **extend base** / init scaffold, not as
  the shipping look. Prefer `extends: neutralTheme` (or gothic for dark-only
  experiments) inside `defineTheme`, then override everything brand-critical.
- Add script (docs recommendation for agents):

```json
"scripts": {
  "astryx": "node node_modules/@astryxdesign/cli/bin/astryx.mjs"
}
```

### 3.2 Init (WP24)

```bash
npx astryx init
```

- Commit generated agent docs under a clear path (e.g. `docs/astryx/` or
  whatever init creates) — treat as reference, **not** product truth.
- Product truth remains `design.md` + this plan. If init docs conflict with
  Dark Chrome, Dark Chrome wins (record in `docs/wp/RULINGS.md`).

### 3.3 CSS layers (WP24) — dual surface, landing-safe

Use the Tailwind bridge path from Astryx styling docs, but **scope Astryx
theme application to the app shell**, not the marketing page.

Target pattern (exact selectors left to WP24 implementer; intent is fixed):

1. Keep existing Dark Chrome `:root` tokens in `globals.css` for landing.
2. Import Astryx reset/core **without** letting Neutral become the document
   default look.
3. Import `@astryxdesign/core/tailwind-theme.css` bridge.
4. Ship a **built** custom theme (`npx astryx theme build`) for SSR-safe
   Next.js — runtime-only themes flash component overrides (Astryx theme
   docs). Production path = built `.css` + `.js` with `__built: true`.
5. Wrap **only** `src/app/(app)/layout.tsx` and `src/app/(onboarding)/layout.tsx`
   in `<Theme theme={darkChromeTheme} mode="dark">`. Root `layout.tsx` stays
   free of Astryx Theme so `page.tsx` landing is untouched.

**Forbidden in WP24:** replacing landing fonts, removing Instrument Serif,
enabling `mode="system"` for v1, importing stock `theme-neutral/theme.css` as
the sole visual source without Dark Chrome overrides.

### 3.4 First component proof (WP24 DoD)

One **non-user-facing** or low-traffic proof inside the app shell (e.g.
settings-adjacent dead-end or a Story/dev-only row is fine; prefer a real
but low-risk control like a Baner on an existing empty state **only if**
that file is not in a freeze zone). Proof must show:

- Orange accent `#ff4400` (or OKLCH equivalent), not Astryx blue.
- Charcoal surfaces matching chrome/canvas/card steps.
- No card drop shadows.
- Instrument Serif still used for an app pane title (via theme heading font).

### 3.5 Reference implementation

Clone/read `apps/example-nextjs-tailwind` from the Astryx repo for layer
order only — do not copy their theme aesthetics.

---

## 4. Brand lock — Dark Chrome → Astryx token map

WP24 owns the mapping. Workers may not invent new brand colors.

| Dark Chrome (`design.md`) | Astryx token target | Rule |
|---|---|---|
| `--primary` `#ff4400` | `--color-accent` (+ muted/on-accent) | Accent for micro-labels, focus, tiny cues — not giant orange washes |
| `--chrome` `#000` | page/overlay / inverted as needed | Full-screen AI moments only |
| `--background` `#181818` | `--color-background-body` | App default |
| `--canvas` `#1a1a1a` | surface step for workbench pane | Keep one-step seam |
| `--card` `#232323` | `--color-background-card` | Border elevation |
| `--popover` `#2e2e2e` | `--color-background-popover` | |
| `--border` `#353535` | `--color-border` | 1px everywhere |
| `--foreground` `#fafafa` | `--color-text-primary` | Never pure `#fff` |
| `--muted-foreground` `#a1a1aa` | `--color-text-secondary` | AA check on cards |
| `--destructive` / `--signal` | `--color-error` (+ muted) | Pacing/restriction banners use warning/error muted |
| `--success` / `--warning` | success/warning tokens | ScoreBadge tiers |
| Oatmeal ramp | optional warm neutrals via explicit tokens | Editorial empty states only |
| Instrument Serif | `--font-family-heading` | Headings only |
| Inter | `--font-family-body` | UI + reply text |
| Geist Mono | `--font-family-code` | Scores, handles, counts |
| Radius `0.5rem` system | radius scale tuned down; **no** large soft “page” radii on dense lists | |
| Shadows | card/popover: prefer border; suppress `--shadow-*` on cards via component overrides | |

**Component overrides (theme `components` field) must encode:**

- Buttons: app default can use accent; landing pills stay out of scope.
- Cards: no elevation shadow; 1px border.
- Inputs: inset focus ring using accent, not blue.
- SegmentedControl / FilterChips: active = light-on-dark pill per design.md
  (white/`foreground` pill), not generic blue selected state.

**Visual acceptance (orchestrator gate):** side-by-side screenshot of Feed
list before/after must still read as ReplyPilot, not Neutral demo. If a
stranger could mistake it for the Astryx docs site, the theme failed.

---

## 5. Work packages (agent-ready)

Propose these as **new §14 rows** (owner appends to `PRODUCT_STRATEGY.md`
when approving). Each follows playbook: branch `feat/wpNN-…`,
`docs/wp/wpNN-stories.md`, `docs/wp/wpNN-progress.md`, one PR.

### WP24 — Astryx foundation + Dark Chrome theme  
**Phase:** P0 polish / infra (after CI lockfile green)  
**Wave:** A (sequential, alone)  
**Model tier:** high (architecture)  
**Key files:**

- `package.json`, `package-lock.json`
- `src/app/globals.css` (bridge only; preserve landing tokens)
- `src/app/(app)/layout.tsx`, `src/app/(onboarding)/layout.tsx`
- `src/theme/dark-chrome.ts` (new) + built artifacts
- `design.md` (add “Astryx mapping” section — docs load-bearing)
- `docs/astryx/**` (init output)
- **Forbidden:** `src/app/page.tsx`, feature call-site rewrites

**Definition of done:**

1. Packages installed; `npm run astryx docs tokens` works.
2. `darkChromeTheme` via `defineTheme` + **built** CSS for SSR.
3. Theme provider on app/onboarding layouts only; landing unchanged visually.
4. Tailwind bridge utilities resolve to Dark Chrome tokens in app.
5. One proof Astryx component rendered in app shell with brand lock checks.
6. `npm run typecheck && lint && test && build` green; demo mode unaffected.
7. Progress notes include “how to add a component without importing Neutral.”

### WP25 — Primitive adapters (strangler fig)  
**Wave:** B (after WP24 gate)  
**Model tier:** mid  
**Key files:**

- `src/components/ui/*` — thin re-exports/adapters **or** parallel
  `src/components/ds/*` (prefer `ds/` to avoid breaking in-flight WPs that
  import `@/components/ui/button`)
- **Recommended ruling:** create `src/components/ds/` Astryx-backed
  primitives; leave `src/components/ui/` shadcn intact until call sites
  move. Prevents collision with every open feature branch.

**Definition of done:**

1. Adapters for: Button, IconButton, TextInput, TextArea, Field,
   Banner, Badge, Skeleton, Divider, Tooltip, Dialog, Switch,
   SegmentedControl, EmptyState, StatusDot, Spinner.
2. Each adapter documents prop mapping (shadcn children → Astryx `label`
   where needed) in `docs/wp/wp25-progress.md`.
3. No feature behavior changes; optional swap on **one** frozen low-traffic
   component outside freeze zones.
4. Checks green; no landing imports.

### WP26 — App shell migration  
**Wave:** B/C (after WP25; parallel with WP27 only if file scopes disjoint)  
**Model tier:** mid–high  
**Key files:**

- `src/components/app/sidebar/**`
- `src/components/app/nav.tsx`, `command-menu.tsx`, `page-header.tsx`
- `src/app/(app)/layout.tsx` (shell composition only)
- **Forbidden:** `split/*` behavior changes; settings page rewrite; landing

**Definition of done:**

1. App chrome uses Astryx layout primitives (`AppShell` / `SideNav` /
   `MobileNav` as appropriate) **or** existing sidebar restyled via ds/
   tokens — choose the smaller diff that preserves WP6 mobile behavior.
2. Command menu either wraps Astryx `CommandPalette` or stays cmdk but
   consumes ds/ tokens (document choice).
3. 375px: no horizontal scroll on shell; Playwright WP6 suite still green.
4. Visual brand lock pass on sidebar + top chrome.

### WP27 — Lists + workbench density  
**Wave:** C (after WP24–25; after research/settings freeze clears)  
**Model tier:** mid  
**Key files (explicit allow-list — escalate to expand):**

- `src/components/app/feed/opportunity-row.tsx`
- `src/components/app/feed/opportunity-detail.tsx`
- `src/components/app/drafts/draft-row.tsx`
- `src/components/app/drafts/draft-detail.tsx`
- `src/components/app/option-card.tsx`
- `src/components/app/score-badge.tsx`
- `src/components/app/split/pane-chrome.tsx` (**chrome only**: replace
  hand-rolled SegmentedToggle/FilterChips with ds/SegmentedControl —
  no breakpoint logic edits)
- `src/components/app/reply-pacing/reply-pacing-warning.tsx` (Banner)
- `src/components/app/oatmeal-empty-state.tsx` + call sites in
  `feed-scanner.tsx` / `drafts-list.tsx` (EmptyState + oatmeal/liner)
- `src/components/app/research/profile-row.tsx` / `profile-detail.tsx`
  **only after** research WIP + WP21 clear

**Definition of done:**

1. List rows use Item/MetadataList patterns (or equivalent ds density).
2. ScoreBadge → StatusDot/Badge with success/warning/muted tiers — still
   **heuristic score with plain-language reason**, never fake ML %.
3. OptionCard selection uses SelectableCard or ds equivalent; still
   **3 options + reason**; publish still requires explicit click.
   *(Ruling: ds Card is the equivalent — SelectableCard is checkbox-select
   and does not fit multi-action OptionCard.)*
4. Restriction/pacing banners use Banner (warning/error) if those files
   are in scope and not frozen.
5. Empty states use EmptyState + oatmeal/liner only where design.md allows.
6. Mobile critical flows still pass; demo mode intact.

### WP28 — AI / chat surfaces (optional, Phase 1-aligned)  
**Wave:** D  
**Model tier:** mid  
**Key files:** `src/components/app/chat/**` except personal-analytics until
WP11 merges; composer, suggestion chips, analysis thread chrome.

**Definition of done:** Chat/Tokenizer/Progress used where they reduce
custom CSS without changing pipeline semantics; ReplyPreview untouched.

---

## 6. Multi-agent operating model

Follow playbook §7 exactly. This program is a **mini-wave track** parallel
to feature WPs, with stricter UI file freezes.

```
                    ┌─────────────────────────┐
                    │  Orchestrator (no code) │
                    │  owns gates + rulings   │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
        WP24 worker         WP25 worker         Gate runner
        (foundation)        (adapters)          (fresh context)
            │                   │
            └─────────┬─────────┘
                      ▼
            WP26 ∥ WP27 (if scopes disjoint)
                      │
                      ▼
                   WP28 + cleanup
```

### Orchestrator responsibilities

1. Confirm Gate 0 (CI lockfile PR merged; `main` green).
2. Assign **one** WP at a time until WP24+WP25 are merged (foundation is
   sequential). WP26/WP27 may parallelize only with written file
   boundaries in the assignment message.
3. Refuse any worker PR that touches `src/app/page.tsx` or ships stock
   Neutral look.
4. Run wave gates on post-merge `main`: full checks + demo flows
   (analyze→generate→save, feed→detail, draft→publish) + **brand lock
   screenshots**.
5. Append rulings to `docs/wp/RULINGS.md` (theme questions, adapter
   location `ds/` vs `ui/`, shell AppShell vs restyle).
6. Write zero feature code.

### Worker responsibilities

1. Read PRD → AGENTS → this plan → design.md → assigned WP stories.
2. One story at a time; commit only when checks pass.
3. New dependency justification in PR body (Astryx packages only in WP24).
4. Escalate on freeze-zone contact — do not “just this one file.”
5. Update `design.md` / `AGENTS.md` when conventions change (same PR).

### Suggested assignment blurb (copy/paste)

```text
You own WP24 (Astryx foundation). Branch: feat/wp24-astryx-foundation.
File boundary: [list from §5 WP24]. Forbidden: src/app/page.tsx, feature
call-site rewrites, settings/research/split behavior.
Read docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md §0–4 and design.md before edits.
DoD: [paste WP24 DoD]. Create docs/wp/wp24-stories.md before first code.
Theme Dark Chrome into Astryx — do not ship Neutral aesthetics.
```

### Model routing (playbook table)

| Role | Tier |
|---|---|
| Orchestrator | top |
| WP24 theme/architecture | high |
| WP25 adapters | mid |
| WP26 shell | mid–high |
| WP27 lists | mid |
| Gate / screenshot diff | mid or low |

---

## 7. Gates

### Gate 0 — Before WP24 starts

- [ ] PR #19 (or equivalent) merged; `main` CI green
- [ ] Research WIP either committed on `feat/wp21-…` or reverted from dirty
      `main` working tree
- [ ] Owner approves this plan + `ds/` adapter ruling
- [ ] Owner confirms landing is out of scope

### Gate A — After WP24

- [ ] Landing pixel-identical (or explicitly unchanged) vs pre-WP24
- [ ] App shell shows Dark Chrome accent/surfaces via Theme
- [ ] Built theme used (no hydration flash of Neutral)
- [ ] Full check suite + demo boot with zero keys

### Gate B — After WP25

- [ ] `ds/` primitives documented; no drive-by feature refactors
- [ ] In-flight feature WPs still compile against untouched `ui/` imports

### Gate C — After WP26–27

- [ ] WP6 Playwright viewport suite green
- [ ] Brand lock: Feed + Workbench screenshots pass “not Neutral” test
- [ ] Guardrails visible: 3 options, reasons not fake scores, no
      auto-publish affordance introduced
- [ ] Critical demo flows walkthrough signed by gate runner

### Gate D — Cleanup (optional separate WP)

- [ ] Remove unused shadcn `ui/` modules only when zero imports remain
- [ ] Bundle size note in progress.md (Astryx subpath imports only)

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Astryx 0.1.x API churn | Pin versions; adapters isolate call sites; budget a “compat bump” chore WP |
| Theme flash / SSR mismatch | Mandatory `astryx theme build` + built import path |
| Brand dilution | Brand lock table + screenshot gate; Neutral never default look |
| Collision with feature WPs | `ds/` strangler; freeze zones; orchestrator file boundaries |
| Mobile regression | WP6 suite is merge gate for WP26/27 |
| Scope creep into landing | Hard forbid list; PR template checkbox |
| Touch targets vs Astryx 28–36px sizes | Strategy §9 wants ≥44px on primary mobile actions — theme/override primary actions to meet 44px on mobile even if density drops on desktop lists |
| Fake-score UI via StatusDot misuse | ScoreBadge reason tooltip retained; no “92% engagement” copy |

---

## 9. Owner decisions required before coding

Record answers in `docs/wp/RULINGS.md`:

1. **Approve WP24–WP28 as official §14 packages?** (yes/no + numbering)
2. **Adapter path:** `src/components/ds/` strangler (recommended) vs
   overwrite `ui/`?
3. **Shell strategy:** adopt Astryx `AppShell` or token-restyle existing
   sidebar?
4. **Start after Gate 0 only?** (recommended yes)
5. **WP28 in Phase 0 or defer to Phase 1 with command palette?**
   (recommend defer WP28; ship WP24–27 for launch polish)

---

## 10. First orchestrator checklist (day 0)

1. Merge CI lockfile fix; clean research dirty state on `main`.
2. Get owner rulings for §9.
3. Append WP24–WP27 rows to `docs/PRODUCT_STRATEGY.md` §14 (WP28 optional).
4. Spawn WP24 worker with §6 blurb; track stories file.
5. On WP24 PR: verify landing untouched (`git diff main -- src/app/page.tsx`
   empty) and theme is Dark Chrome.
6. Only then spawn WP25.

---

*This file is the program brief. Individual WPs still create their own
`wpNN-stories.md` / `wpNN-progress.md` on their branches per playbook §5.*
