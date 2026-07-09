# Build Plan: Dashboard Typography Scale

## Purpose

Fix the inconsistent and undersized typography across the in-app dashboard
experience while preserving ReplyPilot's Dark Chrome density, hierarchy, and
workflow speed.

This plan covers app surfaces only. The landing page at `src/app/page.tsx` is
explicitly out of scope.

## Problem Summary

The app currently mixes three typography systems:

- Dark Chrome guidance in `design.md`, which expects app body text at `1rem`,
  secondary text at `0.875rem`, and metadata at `0.75rem`.
- Astryx-generated theme tokens from `src/theme/dark-chrome.source.ts`, which
  currently use `scale: { base: 14, ratio: 1.2 }`. This makes `text-base`
  14px, `text-sm` 12px, and `text-xs` 10px.
- Raw Tailwind overrides across feature components, including `text-[15px]`,
  `text-[22px]`, `text-[11.5px]`, `text-[10.5px]`, `text-[10px]`, and
  `text-[0.65rem]`.

The result is that important reading content, such as tweets, reply drafts,
compose options, feed opportunities, and research explanations, often renders
one step too small. Metadata and micro-labels are sometimes smaller than
12px, which is fragile on dark surfaces.

## Goals

1. Make the app typography scale consistent across dashboard pages.
2. Increase primary reading text to 16px without making the UI feel loose.
3. Keep controls compact and predictable at 14px.
4. Keep metadata readable at 12px minimum.
5. Reserve serif typography for page and major pane identity, not routine card
   titles.
6. Reduce custom arbitrary text sizes in feature components.
7. Keep existing product guardrails unchanged: no auto-publish, 3 options per
   generation, reasons instead of fake scores, and human click on every send.

## Non-Goals

- Do not redesign the landing page.
- Do not change route structure or navigation labels.
- Do not change product copy except where a text-size change exposes wrapping.
- Do not introduce new design systems or visual themes.
- Do not change publishing, scheduling, Convex auth, or API behavior.

## Target App Scale

Use a fixed scale for app surfaces:

| Role | Size | Line height | Font | Usage |
|---|---:|---:|---|---|
| Page title | 32px | 1.05-1.15 | Instrument Serif 400 | Main app page headers |
| Pane title | 22px | 1.15-1.25 | Instrument Serif 400 | Right workbench/detail titles |
| Section title | 18px | 1.3 | Inter 600 | Major card groups and modules |
| Card title | 16px | 1.35 | Inter 600 | Card headings, list pane headings |
| Body | 16px | 1.5 | Inter 400 | Tweet text, reply text, draft text, explanations |
| UI/control | 14px | 1.35-1.45 | Inter 500-600 | Buttons, tabs, nav, selects, row labels |
| Supporting | 14px | 1.5 | Inter 400 | Secondary descriptions and helper text |
| Metadata | 12px | 1.35 | Inter/Geist Mono 500 | Timestamps, counts, status captions |
| Kicker | 11-12px | 1.2 | Geist Mono 600 | Uppercase section labels only |

## Phase 1: Theme Source Of Truth

### Files

- `src/theme/dark-chrome.source.ts`
- Generated outputs from `npm run astryx:theme`:
  - `src/theme/dark-chrome.css`
  - `src/theme/dark-chrome.js`
  - `src/theme/dark-chrome.d.ts`
  - `src/theme/dark-chrome.variants.d.ts`
- `src/app/globals.css`
- `design.md`

### Work

1. Update the Astryx typography scale so app `text-base` resolves to 16px,
   `text-sm` resolves to 14px, and `text-xs` resolves to 12px.
2. Rebuild the Dark Chrome theme with `npm run astryx:theme`.
3. Add body-level text defaults in `src/app/globals.css` if needed:
   `font-family`, `line-height`, `font-kerning`, and stable numeric rendering.
4. Update `design.md` if the implementation reveals any conflict between the
   current prose and the agreed app scale.

### Notes

Do not hand-edit generated theme files. Edit `src/theme/dark-chrome.source.ts`
and regenerate.

Astryx CLI requires Node >=22.13. Prefer:

```bash
npm run astryx:theme
```

If the shell Node is too old, use `nvm use 24` first.

### Acceptance Criteria

- `text-base` in the app maps to 16px.
- `text-sm` maps to 14px.
- `text-xs` maps to 12px.
- Default `Text type="supporting"` is no longer 12px on dark cards.
- The landing page remains visually unchanged except for shared global effects
  that are explicitly intended.

## Phase 2: Shared Shell Cleanup

### Files

- `src/components/app/page-header.tsx`
- `src/components/app/split/pane-chrome.tsx`
- `src/components/app/sidebar/sidebar-nav.tsx`
- `src/components/app/sidebar/sidebar-projects.tsx`
- `src/components/app/sidebar/sidebar-history.tsx`
- `src/components/app/sidebar/sidebar-footer.tsx`
- `src/components/app/score-badge.tsx`

### Work

1. Keep `PageHeader` page titles at 32px serif.
2. Keep `PaneTitleRow` at 22px serif.
3. Change list pane headings currently at `text-[15px]` to `text-base
   font-semibold`.
4. Raise `PaneEyebrow` from `text-[10.5px]` to a tokenized 11-12px rule.
5. Raise `PaneActionBar` notes from `text-[11.5px]` to a readable metadata or
   supporting style.
6. Ensure sidebar nav is 14px, library item titles are at least 13-14px, and
   section labels are not below 11px.
7. Ensure score badges are readable but do not dominate list item titles.

### Acceptance Criteria

- Split-pane pages share one title/eyebrow/action-bar hierarchy.
- Sidebar library item titles are more readable than their score badge.
- No shared shell component uses arbitrary sub-12px text.
- Density remains close to the screenshots: no oversized row heights or loose
  list spacing.

## Phase 3: Primary Reading Surfaces

### Files

- `src/components/app/chat/chat-home.tsx`
- `src/components/app/chat/analysis-thread.tsx`
- `src/components/app/chat/reply-workbench.tsx`
- `src/components/app/chat/reply-preview.tsx`
- `src/components/app/chat/blocks/tweet-block.tsx`
- `src/components/app/chat/blocks/score-block.tsx`
- `src/components/app/options-panel.tsx`
- `src/components/app/option-card.tsx`

### Work

1. Promote tweet bodies, generated replies, quote tweets, preview text, and
   option bodies to `text-base leading-6` or equivalent.
2. Keep tweet metadata, character counts, model/voice selectors, and progress
   annotations at metadata size.
3. Keep the empty dashboard intro readable, but do not enlarge card-heavy
   analytics widgets unnecessarily.
4. Ensure the 3-option guardrail remains visible and unchanged.

### Acceptance Criteria

- Source tweet content is consistently 16px.
- Generated reply/quote option content is consistently 16px.
- Metadata remains visually subordinate but readable at 12px minimum.
- No reply generation UI changes the number of options or publishing behavior.

## Phase 4: Split-View Feature Pages

### Files

- `src/components/app/compose-ladder.tsx`
- `src/components/app/drafts-list.tsx`
- `src/components/app/drafts/draft-row.tsx`
- `src/components/app/drafts/draft-detail.tsx`
- `src/components/app/drafts/variant-compare-panel.tsx`
- `src/components/app/feed-scanner.tsx`
- `src/components/app/feed/opportunity-row.tsx`
- `src/components/app/feed/opportunity-detail.tsx`
- `src/components/app/feed/trend-radar-strip.tsx`
- `src/components/app/research-agent.tsx`
- `src/components/app/research/profile-row.tsx`
- `src/components/app/research/profile-detail.tsx`

### Work

1. Replace list pane titles at `text-[15px]` with `text-base font-semibold`.
2. Promote primary content:
   - compose output bodies
   - draft text
   - opportunity tweet text
   - opportunity suggested angle
   - research profile explanation text
3. Normalize helper copy to 14px.
4. Keep dense metadata at 12px, but remove `text-[10px]`, `text-[11px]`, and
   `text-[0.65rem]` unless the use is a truly decorative/nonessential label.
5. Preserve split-pane heights and scroll behavior.

### Acceptance Criteria

- Compose, drafts, feed, and research use the same list/detail hierarchy.
- Primary reading text is 16px across these pages.
- Helper copy is not smaller than 14px when it affects user decisions.
- No layout regressions in the desktop split view or mobile stacked view.

## Phase 5: Settings, Voice, Briefing, And Analytics Polish

### Files

- `src/components/app/voice-studio.tsx`
- `src/components/app/voice-drift-panel.tsx`
- `src/components/app/briefing-view.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/components/app/default-model-card.tsx`
- `src/components/app/account-data-controls.tsx`
- `src/components/app/notification-settings-card.tsx`
- `src/components/app/briefing-settings-card.tsx`
- `src/components/app/chat/engagement-window-card.tsx`
- `src/components/app/chat/reply-pacing-card.tsx`
- `src/components/app/chat/personal-analytics-card.tsx`

### Work

1. Convert card titles to the app card-title role: 16px or 18px sans semibold.
2. Use serif only for page and pane identity, not dense card titles.
3. Keep large numeric stats in Geist Mono with tabular numbers.
4. Ensure voice profile detail grids remain dense but readable.
5. Ensure settings forms and labels remain clear at 14-16px.

### Acceptance Criteria

- Voice cards no longer feel like mini page headers.
- Settings and briefing retain their current structure but inherit the improved
  scale.
- Analytics cards remain compact and scannable.

## Phase 6: Visual QA

### Required Viewports

- Desktop wide: 2048x1130 or close equivalent
- Laptop: 1440x900
- Tablet: 1024x768
- Mobile: 390x844

### Pages To Capture

- `/dashboard` empty state
- `/analysis/[id]` active workbench
- `/compose`
- `/drafts`
- `/feed`
- `/research`
- `/voice`
- `/briefing`
- `/settings`

### Checks

1. Text does not wrap inside buttons unexpectedly.
2. Sidebar remains dense but readable.
3. Right workbench panes do not feel oversized.
4. Tweet/reply/draft content is clearly more readable than metadata.
5. Muted text on cards is not used below 12px.
6. Split views keep usable scroll regions.
7. Mobile stacked views do not become cramped after text increases.

## Verification

Run the standard checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Also run visual verification with the app server:

```bash
npm run dev
```

Then capture the required pages with Playwright or browser screenshots.

## Suggested Implementation Sequence

1. Open a branch, for example `docs/dashboard-typography-plan` for this doc or
   `feat/dashboard-typography-scale` for implementation.
2. Implement Phase 1 alone and inspect the app. Theme changes will have broad
   blast radius.
3. Implement Phase 2 and verify split shells.
4. Implement Phases 3 and 4 in small commits by surface.
5. Implement Phase 5 last.
6. Run full checks and visual QA.

## Risk Notes

- Raising Astryx base scale may change every DS component at once. Expect
  button, badge, input, and segmented-control sizing to shift. Adjust component
  sizes only where visual density breaks.
- The existing `design.md` has one internal conflict: it says generated replies
  and tweets should use sans in one section and serif in another. For app
  consistency, this plan chooses Inter/sans for tweet, reply, and draft bodies,
  reserving Instrument Serif for page and pane titles.
- Do not fix unrelated UI polish while doing this pass. Typography consistency
  should remain the reviewable scope.

## Definition Of Done

- App typography tokens match the target scale.
- No app surface relies on `text-xs` for primary content.
- No app surface uses sub-12px text for meaningful metadata.
- Primary tweet/reply/draft/opportunity content renders at 16px.
- Controls render consistently at 14px unless intentionally compact.
- Serif use is limited to page and major pane identity.
- Screenshots confirm density and hierarchy across desktop and mobile.
- Full check suite passes.
