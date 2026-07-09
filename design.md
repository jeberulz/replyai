---
version: alpha
name: ReplyPilot Dark Chrome
description: >
  Design system for ReplyPilot AI — an editorial, high-contrast dark interface
  adapted from the Ghostbase visual language. Pure-black "chrome" surfaces for
  AI-centric pages, serif editorial headlines, sharp 1px-border architecture.
source: Extracted from ghostbase.com compiled CSS + screenshot (July 2026) and
  adapted to this codebase (Next.js App Router, Tailwind v4, shadcn/ui).
colors:
  # Landing shell
  chrome-background: "#000000"
  canvas-background: "#181818"
  panel-background: "#111111"
  chrome-foreground: "#fafafa"
  # App surfaces (dashboard, feed, settings)
  app-background: "#181818"
  card: "#232323"
  popover: "#2e2e2e"
  border: "#353535"
  input: "#2e2e32"
  muted: "#282828"
  muted-foreground: "#a1a1aa"
  accent-surface: "#363636"
  # Semantic
  primary: "#ff4400"
  destructive: "#c25b54"
  signal-red: "#fb2c36"
  # Warm neutral ramp ("oatmeal") — dark-mode order, 50 = darkest
  oatmeal-50: "#0f0906"
  oatmeal-100: "#1d140f"
  oatmeal-200: "#30231c"
  oatmeal-400: "#644d3f"
  oatmeal-600: "#b49c8b"
  oatmeal-800: "#ede3d8"
  oatmeal-950: "#fdf9f4"
typography:
  font-sans: "Inter, system-ui, sans-serif"
  font-serif: "Instrument Serif (regular 400 only), Georgia, serif"
  font-mono: "Geist Mono, ui-monospace, monospace"
  text-base: "1rem"
  line-height-body: 1.5
  tracking-display: "-0.025em"
spacing:
  base: "0.25rem"
  landing-canvas: "73.75rem"
  landing-content: "67.5rem"
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  "2xl": "1rem"
---

# ReplyPilot Design System — "Dark Chrome"

## Overview

ReplyPilot borrows Ghostbase's actual landing-page structure: a narrow charcoal
canvas centered inside pure-black gutters, compact editorial type, orange
micro-labels, white pill CTAs, dense dark product mockups, star proof rows, and
diagonal stripe bands between sections. The fit is deliberate — ReplyPilot is a
*writing* tool for X, so the interface should feel like a private writing room,
not a broad SaaS homepage.

Two surface tiers, exactly as Ghostbase does it:

1. **Chrome gutter (`#000000`)** — the browser/page outside the landing canvas
   and any full-screen AI moment. It frames the product rather than filling the
   whole layout.
2. **Canvas tier (`#181818`)** — the Ghostbase-style landing page body and the
   app default. Cards (`#232323`), popovers (`#2e2e2e`), and dark panels
   (`#111111`) layer inside it through surface contrast + 1px borders, never
   heavy shadows.

Tone: authoritative, literary, precise. Motion is quiet — 150ms ease-in-out
transitions, one orchestrated page-load reveal on the landing hero, nothing
else animated for its own sake.

## Colors

The palette is a charcoal architecture with one real brand accent: Ghostbase
orange (`#ff4400`). Blue is not part of the landing-page language.

### Surfaces (dark, default and only theme for v1)

| Token | Value | Role |
|---|---|---|
| `--chrome` | `#000000` | Outer gutters and full-screen AI moments |
| `--background` / canvas | `#181818` | Centered landing canvas, dashboard, feed, settings |
| `--panel` | `#111111` | Dense mockup surfaces inside product visuals |
| `--card` | `#232323` | Cards, panels |
| `--popover` | `#2e2e2e` | Menus, dropdowns, tooltips |
| `--muted` | `#282828` | Quiet fills, skeletons, table stripes |
| `--accent` | `#363636` | Hover fills on interactive rows/buttons |
| `--border` | `#353535` | All structural 1px separation |
| `--input` | `#2e2e32` | Input backgrounds/borders |
| `--sidebar-background` | `#1f1f1f` | Nav rail, if/when added |

### Content

| Token | Value | Role |
|---|---|---|
| `--foreground` | `#fafafa` | Primary text (never pure `#fff`) |
| `--muted-foreground` | `#a1a1aa` | Secondary text, captions, meta rows |

### Accents — used sparingly, never as washes

| Token | Value | Role |
|---|---|---|
| `--primary` | `#ff4400` | Micro-labels, active dots, focus ring, brand mark |
| `--destructive` | `#c25b54` | Errors in app surfaces (desaturated for dark) |
| `--signal-red` | `#fb2c36` | Rare high-urgency cue only (e.g. reply window expiring) |
| `--success` | keep current `oklch(0.696 0.17 149)` | Posted/approved states |

### Oatmeal ramp (warm neutrals)

A brown-tinted neutral scale for *editorial* moments where zinc feels too
clinical: blockquote surfaces on the landing page, voice-profile sample cards,
long-form explainer sections. In dark mode the ramp inverts (50 = `#0f0906`
darkest → 950 = `#fdf9f4` lightest). Use 100–200 as background tints, 600–800
as warm text on those tints. Never mix oatmeal and zinc surfaces in the same
component.

Rules:

- Convert all values to OKLCH in `globals.css` (already the house style).
- Accents follow 60/30/10: orange is for labels, active dots, and tiny status
  cues. Primary CTAs are usually white pills, not orange blocks.
- No soft gradients on surfaces. The permitted Ghostbase divider is the
  diagonal hairline band: `repeating-linear-gradient(135deg, border 0 2px,
  transparent 2px 9px)`.

## Typography

Two families, two jobs, plus mono for data. (Ghostbase uses Tiempos + STK
Bureau — both are commercial, licensed faces we cannot bundle. Inter +
Instrument Serif reproduce the same role split — sans for interface, serif
for editorial headlines — with faces we can ship.)

| Variable | Face | Job |
|---|---|---|
| `--font-serif` | Instrument Serif, regular 400 only (has a true italic), fallback Georgia | Headings only: H1/H2/H3, landing hero, section titles. Never body copy. |
| `--font-sans` | Inter | Everything else: nav, buttons, labels, forms, tables, prose, generated reply previews, tweet bodies |
| `--font-mono` | Geist Mono | Scores, timestamps, handles, keyboard hints, counts |

Instrument Serif ships in one weight (400) with a distinct italic — don't
apply `font-semibold`/`font-bold` to it (the browser will synthesize a fake
bold, which looks broken on a display serif). Use the italic style for
emphasis inside headings instead of weight.

Scale (modular, ~1.25 ratio, tight at the top):

| Step | Size | Notes |
|---|---|---|
| `display` | `clamp(2.5rem, 6vw, 4.5rem)` | Landing hero only. Serif display, weight 550–600, tracking `-0.025em`, leading 1.05 |
| `h1` | `2rem` | Page titles. Serif display, tracking `-0.02em` |
| `h2` | `1.5rem` | Section titles. Serif display |
| `h3` | `1.125rem` | Card titles. Sans semibold — serif stops at h2 |
| `body` | `1rem` / 1.5 | Sans (Inter) everywhere, including prose and reply previews |
| `sm` | `0.875rem` | Secondary UI text |
| `xs` | `0.75rem` | Meta rows, badges. Often mono, uppercase, tracking `+0.05em` |

Rules:

- Fluid `clamp()` sizing on the landing page only; fixed `rem` steps inside
  the app (dashboard/feed/settings).
- Generated replies and tweet content render in `--font-sans` (Inter) like the
  rest of the interface — the serif is reserved for headings only.
- Prose never exceeds `65ch`. Reply preview cards cap at `~55ch`.
- Numbers that update (scores, follower counts, countdowns) are always mono
  with `font-variant-numeric: tabular-nums`.
- On the black chrome tier, add +0.05 to body line-height (light-on-dark reads
  lighter).

## Layout

- **Landing canvas**: pure-black page (`#000`) with a centered charcoal canvas
  (`#181818`) at `max-width: 73.75rem` (`1180px`). Inner content should use
  almost the full canvas: `max-width: 67.5rem` (`1080px`) with `px-6`.
- **Spacing**: strict 4px base. Use the token scale 4 / 8 / 12 / 16 / 24 / 32 /
  48 / 64 / 96. Vary spacing to build hierarchy — section gaps at 56–64,
  intra-card at 12–16. Same-padding-everywhere is a defect.
- **Header**: 64px height, mono 12px navigation, logo left, small white pill
  CTA right. No full-width header.
- **Hero**: wide split. Left column: orange mono eyebrow, Instrument Serif
  headline at `56px → 82px` with tight leading (`0.9`), Inter body at
  `16px/28px`, white pill CTA. Right column: dense dark product panel.
- **Section rhythm**: every major section is separated by a 32px diagonal
  stripe band with hairline borders. This creates the Ghostbase “stacked
  editorial issue” feel.
- **Grid**: testimonials are 3 columns, centered, readable `14px/24px`.
  Feature/explainer sections alternate between centered title blocks,
  two-column method blocks, large product panels, and a focused narrative card.
  Avoid equal-height icon-card grids.
- **Viewport units**: `svh`/`dvh` for full-height sections and the feed
  scanner toolbar so mobile URL bars don't clip framing.

## Elevation & Depth

Borders, not shadows.

- Every panel is separated by a `1px solid var(--border)` line. Stroke weight
  is 1px everywhere (1.5px only for the brand icon).
- Surface steps encode depth: `#181818` page → `#232323` card → `#2e2e2e`
  popover. That's the whole z-axis.
- The single permitted shadow: `0 1px 2px #00000026` on popovers/dropdowns.
  Nothing else casts.
- No glassmorphism, no blur, no glow borders.

## Shapes

- `0.375rem` (md) — buttons, inputs, badges.
- `0.5rem` (lg) — default `--radius` for shadcn components. (Change the
  current `0.625rem` to `0.5rem` to match.)
- `0.75rem`–`1rem` (xl/2xl) — cards, reply preview panels.
- Larger containers get larger radii; never the reverse.

## Components

- **Landing CTA pill**: 28px height, fully rounded, white fill, black text,
  11px sans semibold. This is the primary landing-page action style.
- **Button**: app buttons stay 40px (`h-10`), `rounded-md`, sans medium.
  Default app variant can use solid `--primary` orange, but the landing page
  mostly uses white pills and orange micro-labels.
- **Reply composer / preview**: the flagship component. Sans body text on a
  `#232323` card, `rounded-xl`, 1px border, mono meta row (character count,
  voice-match score, timestamp) pinned to the card footer. Textarea keeps
  vertical resize.
- **Feed row**: borderless until hover (`hover:bg-accent`), separated by
  hairline dividers rather than card-per-tweet. Score chips in mono.
- **Nav**: top bar on the landing page (logo left, single CTA right, 1px
  bottom border). In-app nav stays as-is structurally but adopts the
  `#1f1f1f` sidebar token if a rail is introduced.
- **Empty states**: oatmeal-tinted panel with the 45° hairline liner pattern
  and one instructive sentence + one action. They teach, not apologize.
- **Focus states**: `outline-color: color-mix(in oklab, var(--ring) 50%,
  transparent)` — already wired in `globals.css`; `--ring` becomes primary
  blue.

## Split View & Workbench

The in-app working surfaces (active analysis, Feed, Drafts) use a **two-pane
split**: a scrollable list/analysis column on the left and a fixed-purpose
**workbench / detail pane** on the right, separated by a draggable divider. The
persistent sidebar rail is unchanged and sits outside the split. Source of
truth: the Figma frames in the `ReplyAI` file (Reply Workbench `239-2` /
`260-2585`, Feed `262-2`, Drafts `268-2`).

**Surface tiers (reuse existing tokens, no new colors):**

- Left pane: `--background` (`#181818`), the primary reading column.
- Right pane: `--canvas` (`#1a1a1a`) — one step off the left column so the seam
  reads without a shadow.
- Cards inside either pane: `--card` (`#232323`), 1px `--border` (`#353535`).
- Divider: a 1px `--border` seam with a centered ~40px rounded grip (a
  `--border`-lightened fill). Hover/active tint to `--primary`. Never a shadow.

**Pane anatomy (right pane):**

1. **Header** — a tab-pill on the left (e.g. `Reply to @handle`, or the item
   kind) + a muted action-icon cluster on the right, over a 1px bottom border.
2. **Title row** — an Instrument Serif title (`text-[22px]`, the only serif use
   inside the app) with a right-aligned control (the Options/Preview toggle, or
   a source badge).
3. **Body** — scrollable; holds the source-tweet card, banners, and cards.
4. **Action bar** — pinned to the bottom over a 1px top border on `--background`;
   primary action + secondary actions + a muted trust note.

**Controls:**

- **Segmented toggle** (Options/Preview): `--card` container, active segment on
  `--accent` (`#363636`), inactive `--muted-foreground`.
- **Filter chips** (Feed/Drafts): active is a white pill (`bg-foreground
  text-background`), inactive is a 1px-bordered ghost.
- **Score block**: `Worth replying?` card with a `ScoreBadge` pill (green ≥70 /
  amber ≥45 / muted) and a 2×2 grid of factor bars (Reply timing, Growth
  velocity, Audience size, Topic relevance) on `--primary` fills.
- **Restriction banner**: amber (`border-amber-500/30 bg-amber-500/10
  text-amber-100/90`) for the X reply/quote publishing limitation; red
  (`--destructive` tints) for a failed draft.

**Responsive rule** — master-detail stack. Below `lg` (1024px) the split
collapses: Feed/Drafts show the list full-width and push a full-screen detail
with a back affordance on selection; the active-analysis view stacks its two
panes vertically (analysis, then workbench). The split + draggable divider only
render at `lg+`. Pane widths persist per surface (react-resizable-panels
`autoSaveId`).

**Implementation:** `src/components/ui/resizable.tsx` (divider),
`src/components/app/split/master-detail.tsx` (responsive shell),
`src/components/app/split/pane-chrome.tsx` (`Pane`, `PaneHeader`, `PaneTitleRow`,
`PaneBody`, `PaneActionBar`, `SegmentedToggle`, `FilterChips`, `PaneEyebrow`).

## Motion

- Default transition: `150ms cubic-bezier(0.4, 0, 0.2, 1)` on colors,
  opacity, transform. Nothing longer than 300ms in-app.
- One orchestrated moment: landing hero load — headline, copy, CTA, vignette
  stagger in at 60ms intervals (opacity + 8px translate, ease-out-quart).
- Animate only `transform` and `opacity`. No layout-property animation.
- `prefers-reduced-motion: reduce` collapses all entrances to instant.

## Do's and Don'ts

- **Do** use pure black (`#000`) for the landing page and AI-generation
  moments; use `#181818` for working screens.
- **Do** set generated replies and tweets in the sans text face at the app body
  size. Editorial typography is reserved for page and pane identity.
- **Do** keep every structural line at 1px `--border`.
- **Do** put live numbers in tabular mono.
- **Do** use orange (`#ff4400`) for micro-labels, active dots, and small
  attention cues.
- **Do** use diagonal stripe divider bands between landing sections.
- **Don't** introduce soft gradients, glows, or bright colored section
  backgrounds.
- **Don't** use serif for buttons, labels, or any control — serif is for
  reading, sans is for doing.
- **Don't** exceed 65ch line length in prose.
- **Don't** use pure `#fff` text or `#000` text-on-light anywhere.
- **Don't** show more than one solid primary button per view.
- **Don't** add drop shadows to cards.

## Accessibility

- Contrast: `#fafafa` on `#000`/`#181818` clears AAA; `#a1a1aa` on `#181818`
  clears AA for normal text — do not use muted-foreground below 0.875rem on
  `#232323` cards without checking.
- All interactive targets ≥ 40px.
- `antialiased` on body (already set).
- Forced `color-scheme: dark` + `theme-color` meta `#000000` on chrome-tier
  pages so form controls and scrollbars match.
- Focus visible on every control via the ring mix; never `outline: none`
  without replacement.
- Honor `prefers-reduced-motion` (see Motion).

## Implementation map (this codebase)

Applied to:

- `src/app/globals.css` — Dark Chrome token set (OKLCH), `--radius: 0.5rem`,
  `--font-sans` → Inter, `--font-serif` → Instrument Serif, `--font-mono` →
  Geist Mono, oatmeal ramp, `fade-rise` animation, `liner` utility.
  **WP24:** also imports Astryx `astryx.css`, built `dark-chrome.css`, and
  `tailwind-theme.css` (no Astryx reset — Tailwind preflight stays).
- `src/theme/dark-chrome.source.ts` — `defineTheme` brand lock; rebuild with
  `npm run astryx:theme` → `dark-chrome.css` / `.js` / `.d.ts`.
- `src/components/app/astryx-theme-provider.tsx` — `<Theme mode="dark">` on
  `(app)` and `(onboarding)` only. Landing never mounts Theme.
- `src/app/layout.tsx` — loads Inter, Instrument Serif (weight 400, italic),
  and Geist Mono via `next/font/google`; `dark` class + black `themeColor` on
  `<html>`.
- `src/app/page.tsx` — Ghostbase `/writers`-style landing: black gutters,
  centered `1180px` charcoal canvas, full-width `1080px` content rail, split
  hero, white pill CTAs, product mockup panels, star proof rows, diagonal
  stripe dividers, large Instrument Serif headings, readable Inter body copy.
  **Out of scope for Astryx migration.**
- `src/components/ui/*` — button hover → `--accent` fill, no shadows, 40px
  default height; card shadow removed. (WP25+ moves call sites to
  `src/components/ds/`.)

### Astryx ↔ Dark Chrome mapping (WP24+)

| Dark Chrome | Astryx |
|---|---|
| `--primary` `#ff4400` | `--color-accent` |
| `--background` `#181818` | `--color-background-body` |
| `--canvas` `#1a1a1a` | `--color-background-surface` |
| `--card` `#232323` | `--color-background-card` |
| `--popover` `#2e2e2e` | `--color-background-popover` |
| `--border` `#353535` | `--color-border` |
| `--foreground` `#fafafa` | `--color-text-primary` |
| `--muted-foreground` | `--color-text-secondary` |
| Instrument Serif | `--font-family-heading` |
| Inter | `--font-family-body` |
| Geist Mono | `--font-family-code` |
| Card elevation | borders; `--shadow-low: none` |

Program brief: `docs/wp/WP24-ASTRYX-ADOPTION-PLAN.md`.

Licensing note: do **not** hotlink or copy Ghostbase's woff2 assets (Tiempos,
STK Bureau, Inter Display are commercially licensed). Inter (OFL), Instrument
Serif (OFL), and Geist Mono (OFL) are the shipping faces, loaded via
`next/font/google`.
