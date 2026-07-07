# Brand Guidelines — ReplyPilot AI

> Synthesizes brand-context.md, target-audience.md, brand-positioning.md, brand-strategy.md, brand-naming.md (evaluation), brand-identity.md, brand-voice.md, and brand-messaging.md. See "Open Items Carried Forward" at the end for unresolved decisions.

## PART 1 — Brand Foundation

### About This Guide

This document synthesizes every brand decision made across strategy, identity, voice, and messaging into one reference. It's written for whoever needs to apply the brand consistently right now — currently the founder, and any designer or copywriter who joins later. When a decision here conflicts with something newer, the newer decision wins, but update this doc rather than letting it silently go stale.

### Brand Essence

**Mission**: Help serious X repliers find the right conversation at the right moment and reply with something worth sending — without becoming a slower version of the voice-generation tools that already exist.

**Vision**: To become the discovery layer serious builders can't grow on X without — built on precision, timing, and trust that isn't borrowed from anyone else's playbook. *(Rests on an ambition inferred from the PRD roadmap, not yet explicitly confirmed — see Open Items below.)*

**Values**:
- **Quality Over Volume** — rewards replies used with no edits, not replies published.
- **Earned Trust, Never Borrowed** — no score ships without real data; no reply sends without a human click.
- **Timing Is the Product** — writing is solved elsewhere; knowing the right moment isn't.
- **Built for One Person Doing the Work** — single account, real workflow, no agency compromises.

**Brand Personality**: Sharp, direct, confident, casual (in delivery), serious (in substance).

**Positioning Statement**: ReplyPilot AI owns conversation discovery and timing in the X growth category — the problem voice-generation tools never touched.

## PART 2 — Visual Identity

### Logo

**Status: direction specified, not yet designed.** No finished mark exists. What follows is the brief to design against, not a finished asset's usage rules.

**Primary direction**: Wordmark-led, not symbol-first — "ReplyPilot AI" is dense enough that a competing icon would fight it. Once a companion mark exists, it should center on the **reply-window concept** (aperture, bracket, closing interval) — deliberately *not* a pilot/compass/steering motif, which invites unwanted comparison to the Copilot family of products.

**Logo variations (to design)**: full wordmark (marketing/landing use), wordmark + mark lockup (app header), mark-only (favicon, avatar, small watermark).

**Clear space rule (apply once designed)**: minimum clear space equal to the cap-height of the wordmark on all sides — standard practice until the actual mark dictates otherwise.

**Minimum size (apply once designed)**: mark-only must remain legible down to 16px (favicon scale) — this is the hardest constraint and should be tested first, since gradients or fine detail break entirely at that size.

**Incorrect usage** — non-negotiable regardless of final design:
- Don't use sparkle/wand, chat-bubble, robot/circuit, or arrow-cursor iconography — the exact clichés that read as "generic AI copilot," which the brand-naming evaluation flagged as a risk to actively avoid.
- Don't add gradients, drop shadows, glow, or blur — the entire visual system is built on flat surfaces and 1px borders.
- Don't recolor the mark outside the approved orange accent or monochrome.
- Don't stretch, distort, or round the mark into mascot-like softness.
- Don't place the wordmark in Instrument Serif — that face is reserved for reading, not marks.

### Color Palette

*Digital-only product — no print applications exist, so CMYK/Pantone values are not applicable. All colors below are already implemented in `design.md` / `globals.css`, not newly proposed.*

**Primary**

| Color Name | Hex | Role |
|---|---|---|
| Chrome black | `#000000` | Outer gutters, full-screen AI moments |
| Canvas charcoal | `#181818` | App default, landing canvas |
| Brand orange | `#ff4400` | Micro-labels, active dots, focus rings, brand mark — used sparingly, never as a wash |

**Secondary (surface tiers)**

| Color Name | Hex | Role |
|---|---|---|
| Card | `#232323` | Cards, panels |
| Popover | `#2e2e2e` | Menus, dropdowns, tooltips |
| Border | `#353535` | All structural 1px separation |
| Muted | `#282828` | Quiet fills, skeletons |

**Background/neutral — "oatmeal" warm ramp**

| Color Name | Hex | Role |
|---|---|---|
| Oatmeal 100 | `#1d140f` | Editorial background tints |
| Oatmeal 600 | `#b49c8b` | Warm text on tinted surfaces |
| Foreground | `#fafafa` | Primary text (never pure `#fff`) |

**Color usage rules**: Accent orange follows 60/30/10 — labels and tiny cues only, never a CTA block (primary CTAs are white pills). Never mix the oatmeal ramp with standard charcoal surfaces in the same component. Contrast: `#fafafa` on `#000`/`#181818` clears AAA; `#a1a1aa` clears AA at normal text size only — verify before using it below 0.875rem on `#232323`.

### Typography

**Primary typeface**: Instrument Serif (400 only, true italic for emphasis) — headings only (H1/H2, landing hero, section titles). Never body copy, never bold (the browser fake-bolds it, which breaks visually).

**Secondary typeface**: Inter — everything else: nav, buttons, forms, body copy, and generated reply/tweet text itself.

**Mono**: Geist Mono — scores, timestamps, handles, counts, always tabular.

**Type hierarchy**

| Level | Typeface | Size | Usage |
|---|---|---|---|
| Display | Instrument Serif | `clamp(2.5rem, 6vw, 4.5rem)` | Landing hero only |
| H1 | Instrument Serif | `2rem` | Page titles |
| H2 | Instrument Serif | `1.5rem` | Section titles |
| H3 | Inter (semibold) | `1.125rem` | Card titles — serif stops at H2 |
| Body | Inter | `1rem` / 1.5 line-height | Everywhere, including reply previews |
| Small | Inter | `0.875rem` | Secondary UI text |
| Meta | Geist Mono | `0.75rem`, uppercase, +0.05em tracking | Badges, meta rows |

**Typography rules**: Prose never exceeds 65ch (reply preview cards cap at ~55ch). Numbers that update (scores, counts) are always mono with tabular figures. Fallback stack if brand fonts fail to load: `system-ui, sans-serif` for Inter, `Georgia, serif` for Instrument Serif.

### Imagery

**Photography style**: None needed — this is a text/UI-first product. Where imagery appears, use dark-mode-native product screenshots, never stock photography of people at laptops.

**Illustration style**: Reserved for empty states only — oatmeal-tinted panel, 45° hairline liner pattern, one instructive sentence. Not decorative.

**Iconography**: Line icons, thin-to-regular weight, matching the 1px border language. Functional, not expressive — the brand mark is the one exception allowed heavier (1.5px) weight.

**What to avoid**: Gradient blobs, glassmorphism, generic "AI slop" iconography (sparkles, neural-network graphics, glowing orbs), stock photography.

## PART 3 — Verbal Identity

### Brand Voice

**Voice Essence**: *ReplyPilot AI sounds like a sharp builder who's done the homework — direct, economical, and unimpressed by hype.*

**Tone dimensions**: Casual-but-not-sloppy (formality); calm confidence over hype-energy; authoritative-but-accessible (expertise); respectful-not-intimate (warmth).

**Voice qualities**:
- **Direct** — Do: "Feed scanning is live." / Don't: "We're thrilled to announce an exciting new capability..."
- **Confident, not boastful** — Do: "Every option comes with a reason." / Don't: "Our revolutionary AI delivers world-class results."
- **Economical** — Do: "Three options. Not ten." / Don't: padding the same idea into three sentences.
- **Transparent** — Do: "We don't show engagement scores yet — no data to back them." / Don't: implying precision that isn't real.

### Writing Style

Short-to-medium sentences, clipped for emphasis. One em-dash per paragraph max, no ellipses, effectively no exclamation marks. Sentence case everywhere, including headlines. Numerals for anything countable (3 options, 2-hour window). Contractions always. Active voice almost without exception.

### Vocabulary

**We say**: reply, window, timing, worth replying, discovery, conversation, ship, builder, signal, moment, precise, sharp, earn (trust), reason, your voice, surface.

**We don't say**: revolutionary, game-changing, supercharge, unlock, seamless, effortless, 10x, next-level, cutting-edge, growth hacking, leverage, synergy, "engagement" used vaguely.

## PART 4 — Messaging

**Core Message**: ReplyPilot AI helps founders and builders who grow on X find the conversation worth replying to before the window closes, by ranking discovery and timing signals instead of just generating text.

**Value Proposition**: ReplyPilot AI finds the X conversations worth a builder's next fifteen minutes and hands them a reply that already sounds like them. Built for founders, indie hackers, and AI builders who know replies drive growth but don't have hours to scan for the right one. Every other tool in this category solved writing; ReplyPilot AI solves finding the right moment.

**Tagline**: *"Reply before the window closes."* — **Recommended**, pending final sign-off. Use as hero headline, social bio, and ad copy without modification; alternates ("Fifteen minutes. The right reply.") are approved for secondary/supporting placements.

**Key Messages**:
1. **Find the moment, not just the words** — Proof: Conversation Score ranks tweets by audience size, topic relevance, timing, and growth velocity.
2. **Three options, not ten** — Proof: every option ships with a stated reason, never a fake confidence score.
3. **Sounds like you, not like a tool** — Proof: Voice Training imports vocabulary, sentence length, and formatting from real tweets.
4. **You always click send** — Proof: publishing requires an explicit click on the specific reply, every time.

## PART 5 — Brand in Use

### Digital

**Website**: Pure-black chrome gutters framing a centered charcoal canvas; Instrument Serif hero headline; white pill CTAs (never orange-block CTAs); diagonal hairline stripe dividers between sections; orange reserved for micro-labels only.

**Social media (X — the product's own platform)**: Bio uses the tagline alone. Posts should model the brand's own promise — economical, no emoji-heavy energy, no exclamation marks. This is the one channel where the brand should practice its "don't waste the reader's time" ethos most visibly.

**Email**: Direct, specific subject lines ("Feed scanning is live"), zero filler, no exclamation marks.

### Presentations *(replaces "Print" — no physical touchpoints exist in v1)*

Pure black background per the chrome tier, Instrument Serif for section titles, sparse orange accent exactly as in-app rules dictate. Resist loosening the palette for a "friendlier" investor deck — restraint is the brand, not a constraint to relax under pressure.

**Business cards / letterhead**: Not applicable — no physical/print touchpoints exist for this product at this stage.

### Brand Don'ts

- [ ] Never use sparkle/wand, chat-bubble, or robot iconography anywhere, including the eventual logo.
- [ ] Never use gradients, drop shadows (beyond the one permitted popover shadow), glow, or blur.
- [ ] Never use a fake or unbacked engagement score or percentage.
- [ ] Never auto-publish a reply without an explicit user click.
- [ ] Never use more than one exclamation mark per page.
- [ ] Never write in passive voice to avoid ownership of a mistake.
- [ ] Never lead marketing copy with "AI-powered" or "AI writing assistant" framing.
- [ ] Never message toward agency/multi-account use — v1 is single-account only.

## PART 6 — Contacts & Assets

**Brand guardian**: The founder, currently — no formal brand role exists yet at this stage.

**Asset location**: `.agents/` in this repository — `brand-context.md`, `target-audience.md`, `brand-positioning.md`, `brand-strategy.md`, `brand-identity.md`, `brand-voice.md`, `brand-messaging.md`, and this guidelines doc. `design.md` at the repo root holds the implemented visual system.

**Questions**: The founder, until a team or contractor is brought on.

---

## Open Items Carried Forward

These surfaced during earlier steps and haven't been resolved — worth deciding before this guide is treated as fully locked:

1. **Logo is a brief, not a finished asset** — the specific clear-space and minimum-size values above are standard defaults, not measurements off a real file.
2. **"Writing tool" framing in `design.md`** vs. the discovery/timing positioning established in strategy — the visual system itself doesn't conflict, but its own stated rationale does.
3. **"Adapted from Ghostbase" origin** vs. the "Earned trust, never borrowed" value — a brand-authenticity question worth a deliberate answer.
4. **5-year vision ambition** — inferred from the PRD roadmap, never explicitly confirmed.
5. **Tagline is recommended, not formally locked** — worth an explicit sign-off before it's treated as final across channels.
