# WP38 Stories — Command palette v2

**Definition of done** (Phase 2 program extension; product ref §5.3 P1 command
palette): ⌘K palette supports **paste tweet URL → start analysis**, **jump to
feed opportunity**, and **switch active voice profile** — power-user retention
for a daily tool.

**Depends on:** WP24–27 shell on `main` (cmdk palette exists); WP29 voice studio
on `main`.

**Parallel-safe with:** WP23, WP35, WP37 (disjoint files).

## File boundary

**Owns:**

- `src/components/app/command-menu.tsx`
- `src/components/app/sidebar/sidebar-provider.tsx` (only if voice/project context hooks needed)
- Small helper e.g. `src/lib/commandPalette.ts` (optional)
- `tests/commandPalette.test.ts` (URL parse / routing helpers if extracted)

**May touch:**

- `src/app/(app)/layout.tsx` — wiring only, no layout redesign
- `convex/voiceProfiles.ts` — read-only list query if missing for palette

**Do not touch:** compose (WP23), scanner, billing, Convex schema (prefer existing queries).

## Defaults

- Keep **cmdk** (`ui/command`) unless orchestrator rules otherwise (WP26 note).
- Paste URL: detect `x.com/.../status/...` → navigate `/dashboard?url=…&auto=1`
  (same as extension deep link — WP10 ruling).
- Jump to opportunity: search feed by handle/text snippet or list recent high-score
  opportunities (new lightweight query OK in `convex/opportunities.ts` if bounded).
- Switch voice: set default voice profile via existing mutation; show current default in palette header.
- Keyboard: ⌘K / Ctrl+K unchanged; Esc closes.
- Demo mode: all actions work with demo data.

## Stories

- [ ] **WP38-S1 — URL paste → analyze**
  - Detect tweet URL in command input; on Enter/select, deep-link to dashboard with `auto=1`.
  - Vitest for URL detection + query string builder.

- [ ] **WP38-S2 — Jump to opportunity**
  - Command group “Opportunities” with debounced search (reuse feed index or add
    `opportunities.search` capped at 8).
  - Navigate to `/feed` with opportunity selected or direct detail if route exists.

- [ ] **WP38-S3 — Switch voice profile**
  - List voice profiles in palette; switching calls existing set-default mutation.
  - Show active profile badge in palette footer or group heading.

- [ ] **WP38-S4 — Polish + accessibility**
  - Placeholder copy reflects three powers; empty state hints.
  - Keyboard roving focus works; no horizontal scroll on mobile palette.

- [ ] **WP38-S5 — Verification**
  - Manual ⌘K flows in demo mode; typecheck/lint/test/build green.
  - PR maps each story to acceptance criteria.
