# In-app Typography Audit — Text Sizing, Consistency & Hierarchy

**Scope:** every in-app (dashboard) surface — Dashboard/Chat, Feed/Discovery/Briefing,
Drafts/Compose/Voice/Research, Settings/Onboarding, and the app shell (sidebar, nav,
page headers). **Landing page excluded** per request. Method: 5 parallel read-only audits,
one shared yardstick (the `design.md` type scale). No code was changed.

---

## TL;DR

The "text is small and inconsistent everywhere" complaint has **one root cause plus a layer
of ad-hoc patches on top of it**:

1. **The design-system token scale is a full step below spec.** One config line —
   `src/theme/dark-chrome.source.ts:27` → `scale: { base: 14, ratio: 1.2 }` — generates every
   `--font-size-*` custom property one tier too small. So **body renders at 14px (should be 16px),
   `Heading level=1` at 24px (should be 32px), `Heading level=2` at 20px (should be 24px)**, and
   secondary text at 12px (should be 14px). Every component that trusts the DS `Text`/`Heading`
   primitives (most of the app) is silently undersized. **Verified** against `dark-chrome.css:87-126`.

2. **Because the default is wrong, screens invented their own patches** — and each patched to a
   *different* number. Result: the same role renders at 4+ sizes (h1 exists at 24 / 32 / 33.6 / 40px;
   "card title" at 14 / 15 / 16 / 17px; "tweet body" at 12 / 14 / 15px). This is the source of the
   *inconsistency* half of the complaint.

3. **A cluster of sub-12px arbitrary values** (`text-[9px]` … `text-[11.5px]`) — several on
   muted text — **violate the project's own a11y floor** (`design.md:326-328`: *"do not use
   muted-foreground below 0.875rem on cards"*). These are genuine bugs, not taste.

**The fix is overwhelmingly top-down:** correct the token generator once, delete the redundant
patches, then bump a short list of primary-content call sites. Fixing ~4 shared files removes the
majority of findings.

---

## The target scale (source of truth: `design.md:156-162`)

Fixed rem steps inside the app (fluid `clamp()` is landing-only):

| Role | Target | px | Tailwind | Font | Notes |
|---|---|---|---|---|---|
| h1 page title | 2rem | 32 | `text-[2rem]` | Instrument Serif | Page titles only |
| h2 section title | 1.5rem | 24 | `text-2xl` | Instrument Serif | Section headers |
| h3 card title | 1.125rem | 18 | `text-lg` | Inter semibold | Serif stops at h2 |
| body | 1rem | 16 | `text-base` | Inter | Prose, tweet bodies, reply drafts |
| sm secondary | 0.875rem | 14 | `text-sm` | Inter | Dense rows, helper text |
| xs meta | 0.75rem | 12 | `text-xs` | often Geist Mono | Badges, counts, timestamps |

**Density guardrail:** raising the scale must NOT bloat dense data. Keep list-row primary text at
`text-sm`, and keep genuine meta/badges/timestamps at `text-xs` (12px). The bumps target *body
content, titles, nav, and anything currently below 12px* — not table rows.

---

## Root cause, verified

`src/theme/dark-chrome.source.ts:27`
```ts
typography: { scale: { base: 14, ratio: 1.2 }, … }
```
generates (`dark-chrome.css:87-126`):

| Token → role | Built value | Should be | Gap |
|---|---|---|---|
| `--font-size-2xl` → h1 | 1.5rem / **24px** | 2rem / 32px | **−25%** |
| `--font-size-xl` → h2 | 1.25rem / **20px** | 1.5rem / 24px | **−17%** |
| `--font-size-lg` → h3 | 1.0625rem / **17px** | 1.125rem / 18px | −6% |
| `--font-size-base` → body | 0.875rem / **14px** | 1rem / 16px | **−12.5% (one full step)** |
| `--font-size-sm` → supporting | 0.75rem / **12px** | 0.875rem / 14px | **−14% (one full step)** |
| `--font-size-xs` → meta | 0.625rem / **10px** | 0.75rem / 12px | **−17%, near-illegible** |

Every `Text` (default `type="body"`), `Heading`, `Field` label/help, `Item` row, `SegmentedControl`,
`Chat` bubble, `TextInput`, and `Tooltip` reads these tokens — so one recalibration ripples through
all of them. (One good default already exists: `TextInput` forces `max(1rem, …)` on touch pointers,
so mobile inputs already render 16px and dodge iOS auto-zoom.)

> **Note on the exact numbers:** a pure `base:16, ratio:1.2` modular scale lands at ~28px for h1
> (16→19→23→28), not the 32px `design.md` specifies. Hitting the spec exactly needs either a larger
> top-end ratio or explicit per-role overrides in the theme so `heading-1 = 2rem`, `heading-2 = 1.5rem`,
> `heading-3 = 1.125rem`, `body = 1rem`, `supporting = 0.875rem`, `xs = 0.75rem`. **Decision to make:**
> keep `design.md`'s dramatic 2rem h1, or accept a smoother ~1.75–1.875rem. Recommend keeping 2rem —
> it's the brand's editorial-serif moment.

---

## Cross-cutting systemic patterns (all five surfaces agreed)

1. **One role, many sizes.** After the undersized default, patches diverged:
   - **h1 page title:** 24px (DS default) · 32px (`page-header.tsx`) · 33.6/40px (`wizard-ui.tsx`
     `text-[2.1rem] sm:text-[2.5rem]`).
   - **h2 section:** 20px (`briefing-view`, `compose-ladder`) · 22px (`pane-chrome PaneTitleRow`) ·
     15px (`feed-scanner`, `research-agent`, `drafts-list`).
   - **h3 card title:** 14px (`opportunity-detail`, `author-dossier`) · 15px (chat cards) · 16px
     (`briefing-view`, `voice-studio`, blocks) · 17px (DS default).
   - **tweet / reply body (the product's most-read text):** 12px · 14px · 15px depending on which
     component drew the *same* conversation.

2. **Primary content is smaller than the chrome around it.** The text users read to decide and the
   text they publish is repeatedly the *smallest* thing on screen: AI-drafted reply
   (`option-card.tsx:419`, 14px), generated copy about to publish (`compose-ladder.tsx:412/471`),
   draft being edited (`draft-detail.tsx:240`, 15px), "why this account" (`profile-detail.tsx:119`),
   voice-drift diff (`voice-drift-panel.tsx:172`, 12px). Hierarchy is inverted.

3. **Real sentences filed under "meta" (`text-xs`).** Disclaimers, form helper text, "why this
   works" reasons, status messages, dossier detail rows — multi-clause copy sized like a timestamp.
   `text-xs` should be badges/counts/timestamps only.

4. **Sub-12px arbitrary values that break the a11y floor.** `text-[9px]` (`onboarding-flow.tsx:54`),
   `text-[10px]`, `text-[10.5px]` (`pane-chrome PaneEyebrow` — a shared primitive), `text-[11px]`,
   `text-[11.5px]` (safety disclaimers in `ready-step.tsx:103` and `pane-chrome.tsx:122`). Many are
   muted-on-card → violate `design.md:326-328`.

5. **Onboarding is a separate type system.** A `text-[13px]…text-[15px]` micro-scale
   (`goal-step`, `voice-step`, `niche-step`, `ready-step`, `building-step`) that exists nowhere else
   and maps to no documented step — picked by eye against a mock.

6. **Two component systems mid-migration** (`ds/*` Astryx = canonical, `ui/*` shadcn = legacy per
   `src/components/ds/index.ts:1-8`). They agree on sizes today only by coincidence and will diverge
   the moment tokens are corrected. Confirmed live inconsistency: `ds/Button` never varies font-size
   by size prop (only padding), while `ui/Button size="sm"` drops to 12px. `ui/CardTitle` sets **no
   size class at all** (inherits ambient, unpredictable).

---

## Recommended fix plan (highest ripple first)

### Tier 0 — one config change fixes most of the app
- **`src/theme/dark-chrome.source.ts:27`** — recalibrate the scale to the `design.md` steps
  (body 1rem, h1 2rem, h2 1.5rem, h3 1.125rem, supporting 0.875rem, meta 0.75rem), then rebuild
  with `npm run astryx:theme` (needs Node ≥22.13; commit the rebuilt `dark-chrome.css`/`.js`).
- **Guardrail:** pin `--text-supporting-size` at 0.875rem and badge/meta at 0.75rem so dense rows
  stay compact. Verify `Badge`, `ChatMessageMetadata`, `FieldStatus` don't grow.

### Tier 1 — shared components that hand-roll their own scale (bypass tokens)
These cascade across many surfaces; fixing them is second-highest leverage.
- **`src/components/app/split/pane-chrome.tsx`** — replace 4 arbitrary values:
  `PaneEyebrow` `text-[10.5px]`→`text-xs` · `PaneActionBar` note `text-[11.5px]`→`text-sm`
  (it's a safety disclaimer) · `PaneTabPill` `text-[13px]`→`text-sm` · `PaneTitleRow`
  `text-[22px]`→`text-2xl`. Cascades to reply-workbench, reply-preview, opportunity-detail,
  draft-detail, profile-detail, compose-ladder.
- **`src/components/ui/card.tsx`** `CardTitle` — add default `text-lg font-semibold` (fixes all
  chat/feed card titles at once instead of 8+ call sites).
- **`src/components/app/page-header.tsx`** — after Tier 0, drop the `text-[2rem]` h1 hack; bump the
  page **description** off `Text type="supporting"` (12px) to `text-sm`/`text-base`.
- **`src/components/app/sidebar/sidebar-nav.tsx:24`** — nav items `text-sm`→`text-base`. Single line,
  highest-visibility payoff (persistent on every screen). Also `sidebar-history.tsx:142` section
  headers `text-[10px]`→`text-xs`.
- **`ui/input.tsx:10`** `text-sm`→`text-base`, **`ui/button.tsx:21`** `size="sm"` `text-xs`→`text-sm`,
  **`ui/label.tsx:15`** align with `ds/FieldLabel`.

### Tier 2 — primary content undersized below body (bump to `text-base`)
- Reply/generated content: `option-card.tsx:419`, `compose-ladder.tsx:412` & `:471`,
  `draft-detail.tsx:240`, `chat/blocks/breakdown-block.tsx:31`.
- Tweet body convergence: `chat/analysis-thread.tsx:178`, `chat/blocks/tweet-block.tsx:56`,
  `feed/opportunity-row.tsx:82`, `feed/opportunity-detail.tsx:102/138`, `briefing-view.tsx:174-180`,
  `author-dossier.tsx:77`, `profile-detail.tsx:119`. (Leave `reply-preview.tsx`'s 15px **only** if
  commented as a deliberate X-render mimic.)
- Reasoning prose out of meta: `option-card.tsx:424`, `reply-pacing-card.tsx:136`,
  `voice-drift-panel.tsx:172`, `voice-studio.tsx:277/302` → `text-sm`.
- Analysis pane h2: `chat/analysis-thread.tsx:237` `text-[15px]`→`text-2xl`.
- Hero subhead hierarchy jump: `chat/chat-home.tsx:79` `text-sm`→`text-base`.

### Tier 3 — a11y floor cleanup + onboarding normalization
- Raise every sub-12px value to ≥`text-xs`; important disclaimers to `text-sm`:
  `onboarding-flow.tsx:54` (`9px`), `ready-step.tsx:103` (safety copy), `pane-chrome.tsx:122/210`,
  `model-eval.tsx:151/174`, `personal-analytics-card.tsx:223`, `setup-checklist.tsx:48/109`,
  `variant-compare-panel.tsx:43/66/92`, `feed-scan-progress.tsx:92/107`,
  `profile-detail.tsx:102/128/150`, `profile-row.tsx:49`.
- Collapse the onboarding `13–15px` ad-hoc scale (`goal-step`, `voice-step`, `niche-step`,
  `ready-step`, `building-step`) onto `text-base` (labels) / `text-sm` (hints); route step titles
  through `Heading level={1}` so the token fix reaches them.
- Settings rows: primary label `text-sm`→`text-base` (`settings/page.tsx:105/140` etc.); keep row
  meta at `text-sm` (up from `text-xs` muted, per a11y floor).

---

## Per-surface findings (full detail)

### 1. Dashboard / Chat
| File:line | Role | Current | Issue | → |
|---|---|---|---|---|
| `option-card.tsx:419` | AI reply/quote body (most-read, published) | `text-sm` | too small | `text-base` |
| `option-card.tsx:424` | "Why this works" reason (PRD feature) | `text-xs` | prose-as-meta | `text-sm` |
| `chat/blocks/breakdown-block.tsx:31` | AI analysis prose | `text-sm` | too small | `text-base` |
| `chat/blocks/breakdown-block.tsx:29`,`score-block.tsx:32`,`tweet-block.tsx:32` | Card title (h3) | `text-base` | under 18px | `text-lg` via `CardTitle` |
| `chat/engagement-window-card.tsx:54`,`personal-analytics-card.tsx:77`,`reply-pacing-card.tsx:71` | Card title | `text-[15px]` | inconsistent | `text-lg` |
| `chat/analysis-thread.tsx:237` | Analysis pane h2 (only heading) | `text-[15px]` | smaller than body | `text-2xl` serif |
| `chat/analysis-thread.tsx:178`,`tweet-block.tsx:56`,`suggestion-chips.tsx:68` | Tweet body | `text-sm`/`text-sm` | too small/inconsistent | `text-base` |
| `chat/chat-home.tsx:79` | Hero subhead | `text-sm` | skips body step | `text-base` |
| `chat/reply-pacing-card.tsx:136` | "Best windows" reason | `text-xs` | prose-as-meta | `text-sm` |
| `chat/chat-composer.tsx:163` | Drawer helper | `text-xs` | instructional | `text-sm` |
| `options-panel.tsx:121/124` | Primary tabs | `text-xs sm:text-sm` | 12px on mobile nav | `text-sm` all breakpoints |
| `personal-analytics-card.tsx:223` | Heatmap hour ticks | `text-[10px]` | below floor | `text-[11px]`/thin labels |
| `setup-checklist.tsx:48/109` | Eyebrow / Dismiss | `text-[10px]` | below floor | `text-xs` |
| `reply-preview.tsx:42/60` | X-mimic tweet body | `text-[15px]` | 3rd tweet size | keep only if commented as X-mimic |

### 2. Feed / Discovery / Briefing
| File:line | Role | Current | Issue | → |
|---|---|---|---|---|
| `page-header.tsx:43-50` (shared) | Page description | `Text supporting` = 12px | page intro at 12px | `text-sm`/`text-base` |
| `feed/page.tsx:26/30` | Upsell title / body | `text-base` / `text-sm` | under spec | `text-lg` / `text-base` |
| `feed-scanner.tsx:368` | Pane title | `text-[15px]` | far under h2 | `text-lg`/`text-2xl` |
| `feed-scanner.tsx:583+` (several) | Form helper / disclaimer sentences | `text-xs` | prose-as-meta | `text-sm` |
| `feed-scan-progress.tsx:77/92/107` | Heading / chips / counter | `text-[1.35rem]`/`text-[0.65rem]` | off-scale / below floor | `text-2xl` / `text-xs` |
| `feed/opportunity-detail.tsx:102/138` | Tweet & angle body | `text-[15px]` | inconsistent w/ row | `text-base` |
| `feed/opportunity-detail.tsx:123/136` | Card titles (h3) | `text-sm` | under 18px | `text-lg` |
| `feed/opportunity-row.tsx:82/97-100` | Tweet body / angle preview | `text-sm`/`text-xs` | too small | `text-base`/`text-sm` |
| `briefing-view.tsx:149/208/224` | h2 section titles | `text-xl` (20px) | under 24px | `text-2xl` |
| `briefing-view.tsx:48` | h3 upsell title | `text-base` | under 18px | `text-lg` |
| `briefing-view.tsx:174-180/190/228` | Tweet preview / angle / coaching insight | 12–14px | too small/inconsistent | `text-base` |
| `briefing-view.tsx:212-216` | Stat numbers | `text-sm` | no hierarchy | `text-lg`+ tabular-nums |
| `briefing-settings-card.tsx:71-77` | Explanatory paragraph | `Text supporting` = 12px | too small | `text-sm` |
| `author-dossier.tsx:61/77` | h3 title / dossier sentence | `text-sm` | under spec | `text-lg`/`text-base` |
| `author-dossier.tsx:84-118` | Detail rows (mixed meta + sentences) | `text-xs` | sentences at meta | split: sentences `text-sm` |

### 3. Drafts / Compose / Voice / Research
| File:line | Role | Current | Issue | → |
|---|---|---|---|---|
| `pane-chrome.tsx:210/122/82/66` (shared) | Eyebrow / note / h2 / tab | `text-[10.5px]`/`[11.5px]`/`[22px]`/`[13px]` | off-scale/below floor | `text-xs`/`text-sm`/`text-2xl`/`text-sm` |
| `drafts-list.tsx:52` | Panel title | `text-[15px]` plain h2 | too small, not Heading | `Heading l=3` `text-lg` |
| `draft-detail.tsx:240` | Draft text (primary) | `text-[15px]` | under body | `text-base` |
| `draft-detail.tsx:186` | Error explanation | `text-xs` | actionable prose | `text-sm` |
| `variant-compare-panel.tsx:43/66/92` | Eyebrow / A/B stats / footnote | `text-[11px]` | below floor | `text-xs`/`text-sm` |
| `compose-ladder.tsx:68/128` | Panel / detail title | `text-[15px]`/`text-xl` | inconsistent h2 | `text-lg`/`text-2xl` |
| `compose-ladder.tsx:412/471` | Generated copy (published) | `text-sm` | primary too small | `text-base` |
| `compose-ladder.tsx:110` | Row meta | `text-[11px]` | below floor | `text-xs` |
| `voice-studio.tsx:261/277/302` | Card title / config data | `text-base`/`text-xs` | under spec | `text-lg`/`text-sm` |
| `voice-drift-panel.tsx:172/216/190` | Diff content / checkbox / phrase delta | `text-xs` | primary decision content | `text-sm` |
| `research-agent.tsx:208` | Panel h2 | `text-[15px]` `Heading l=2` | 9px under spec | `Heading l=3` `text-lg` |
| `profile-detail.tsx:119/102/128/150` | Reasoning / meta / tag / likes | `text-[15px]`/`text-[11px]`/`text-[0.65rem]` | too small/below floor | `text-base`/`text-xs` |
| `profile-row.tsx:49` | Followers meta | `font-mono text-[11px]` | below floor | `text-xs` |

### 4. Settings / Onboarding / Shell
| File:line | Role | Current | Issue | → |
|---|---|---|---|---|
| `wizard-ui.tsx:40` (+building/ready steps) | Onboarding h1 | `text-[2.1rem] sm:text-[2.5rem]` raw h1 | 3rd h1 size, off-scale | route via `Heading l=1` |
| `settings/page.tsx:68`,`default-model-card.tsx:33`,`account-data-controls.tsx:80` | Card title h3 | `Heading l=3 text-base` | fragile override, under 18px | `text-lg` (token fix) |
| `model-eval.tsx:75` | Card title (shadcn) | `CardTitle text-base` | two card systems | migrate to `ds/Card` |
| `settings/page.tsx:105/140` etc. | Row primary label | `text-sm` | acts as body, one step low | `text-base` |
| `settings/page.tsx:106/146` etc. | Row meta muted | `text-xs muted` | **a11y floor** | `text-sm` |
| `goal-step.tsx:47`,`voice-step.tsx:90` | Radio label / hint | `text-[15px]`/`text-[13px]` | ad-hoc micro-scale | `text-base`/`text-sm` |
| `building-step.tsx:120/129` | Title / status | `text-[15px]`/`text-[11.5px]` | below floor | `text-base`/`text-xs` |
| `niche-step.tsx:21/73/101` | Chip / caption / input | `text-[12.5px]`/`[11.5px]`/`[13px]` | off-scale, input <14px | `text-xs`/`text-sm` |
| `voice-step.tsx:113`,`ready-step.tsx:54/57/75` | Captions / values / chips | `text-[11px]…[13.5px]` | below floor/off-scale | `text-xs`/`text-sm` |
| `ready-step.tsx:103` | Safety disclaimer (permanent guardrail) | `text-[11.5px] muted/70` | smallest+lowest-contrast for critical copy | `text-sm`, higher contrast |
| `onboarding-flow.tsx:54/176` | Step badge / Sign out | `text-[9px]`/`text-[11px]` | illegible / control below floor | grow badge, `text-xs` |
| `sidebar-nav.tsx:24` | Primary nav item | `text-sm` | persistent UI one step low | `text-base` |
| `sidebar-history.tsx:142/191` | Section header / empty hint | `text-[10px]`/`text-xs muted` | below floor / prose-as-meta | `text-xs`/`text-sm` |
| `sidebar-footer.tsx:51` | User name / handle | `text-sm`/`text-xs` | consistent, borderline | name `text-base` |

### 5. DS / UI primitives (the root-cause layer)
| Primitive | Current default | Scale role | → |
|---|---|---|---|
| `dark-chrome.source.ts:27` scale | `base:14, ratio:1.2` | generates ALL sizes | recalibrate to `design.md` steps |
| `Text` (default `type=body`) | 14px | body 16px | token fix |
| `Text type="supporting"` | 12px | sm 14px | token fix (pin at 14, not 16) |
| `Heading l=1/2/3` | 24/20/17px | 32/24/18px | token fix |
| `ui/card.tsx CardTitle` | **no size class** | h3 18px | add `text-lg font-semibold` |
| `ui/input.tsx` | `text-sm` 14px | body 16px | `text-base` |
| `ui/button.tsx size=sm` | `text-xs` 12px | button label | `text-sm` |
| `ds/Button` | constant 14px (padding-only sizes) | — | needs per-size font-size (upstream) |
| `ui/dialog.tsx DialogTitle` | `text-lg` 18px | h3 | ✅ already correct — the model to copy |
| `Badge` (ds & ui), `ChatMessageMetadata`, `Tooltip` | 12px | xs meta | ✅ keep (pin after token fix) |

---

## Suggested sequencing

1. **Tier 0** token recalibration + rebuild → screenshot every surface (biggest visual delta, do first).
2. **Tier 1** shared components (`pane-chrome`, `CardTitle`, `page-header`, `sidebar-nav`, `ui/input`).
3. **Tier 2** primary-content bumps to `text-base`.
4. **Tier 3** a11y-floor + onboarding normalization.
5. Run `a11y-check` on changed UI and re-verify the muted-foreground floor (`design.md:326-328`).

After Tier 0+1 the app should already read as consistent; Tiers 2–3 are polish and bug-closure.
