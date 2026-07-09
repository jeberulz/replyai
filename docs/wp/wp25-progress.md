# WP25 progress

Append-only. Newest entries at the bottom.

## 2026-07-09 — Kickoff

- Branched `feat/wp25-astryx-ds-adapters` from WP24 tip (includes Dark Chrome theme).
- WP24 PR: https://github.com/jeberulz/replyai/pull/21
- Adapter path ruling: `src/components/ds/` strangler; `ui/` stays.
- Next: S2–S3 adapter modules.

## 2026-07-09 — S2–S4 adapters landed

- Added `src/components/ds/*` thin re-exports + `index.ts` barrel.
- `AstryxBrandProof` now imports `@/components/ds/banner`.
- `src/components/ui/*` untouched; `src/app/page.tsx` untouched.
- Typecheck green.

### Prop map (shadcn `ui/` → Astryx `ds/`)

| shadcn / current | Astryx `ds/` | Notes |
|---|---|---|
| `Button` children + `variant=default` | `Button` `label` + `variant=primary` | No `asChild`; use `label` string. `outline`≈`secondary`, `link` has no 1:1 — keep ui or compose. |
| `Button size=default\|sm\|lg\|icon` | `size=md\|sm\|lg` or `IconButton` | Icon-only → `IconButton` with `label` (a11y). |
| `Input` + separate `Label` | `TextInput` with `label` | Built-in label/description/status. |
| `Textarea` | `TextArea` | Same; `label` required unless `isLabelHidden`. |
| `Label` alone | `Field` / control `label` | Prefer Field wrapper for custom controls. |
| `Switch` | `Switch` | `value` boolean + `onChange(checked)`; has `label`. |
| `Badge` children | `Badge` `label` | Semantic + categorical variants. |
| `Skeleton` className sizes | `Skeleton` `width`/`height`/`radius` | |
| `Separator` | `Divider` | `orientation` + `variant`. |
| `Tooltip` Radix compound | `Tooltip` `content` + children/anchor | Different composition model. |
| `Dialog` Radix compound | `Dialog` + `DialogHeader` + Layout slots | `isOpen` / `onOpenChange`; not 1:1 with shadcn. |
| Hand-rolled SegmentedToggle | `SegmentedControl` + `SegmentedControlItem` | WP27 pane-chrome target. |
| Hand-rolled ScoreBadge tiers | `StatusDot` / `Badge` | WP27; keep reason tooltip. |
| Empty copy blocks | `EmptyState` | `title` / `description` / `actions`. |
| — | `Banner` | Restriction/pacing (WP27+). |
| — | `Spinner` / `FieldStatus` | Loading + validation. |

### Migration rule for later WPs

1. New UI → import from `@/components/ds/*` only.
2. Touching a file that uses `@/components/ui/*` → migrate that file’s controls in the same PR when cheap; otherwise leave and note in progress.
3. Never delete `ui/` modules until zero imports remain (Gate D).
