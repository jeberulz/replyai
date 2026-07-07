# Visual Identity Brief — ReplyPilot AI

> Built from brand-context.md, target-audience.md, brand-positioning.md, brand-strategy.md, and the existing `design.md` ("Dark Chrome") system already implemented in this codebase. Color, typography, and imagery are adopted from `design.md` rather than re-derived — the real gap this brief fills is logo/mark direction, which `design.md` never defines.

## 01 — Identity Strategy Statement

ReplyPilot AI's visual identity should read as a precision instrument for people who already have good taste in tools — closer to Linear or Arc than to a typical "AI SaaS" product. The existing Dark Chrome system already gets the hard part right: pure black and charcoal instead of the purple-gradient AI cliché, one restrained orange accent instead of a rainbow of feature-colored buttons, editorial serif headlines instead of rounded friendly sans-everywhere. Every visual decision from here — especially the logo — should protect that restraint rather than decorate it.

## 02 — Logo Direction

**Primary direction:** A wordmark-led lockup, not a symbol-first mark. "ReplyPilot AI" is dense enough that a separate icon competes for attention rather than adding it — Linear, Arc, and Vercel all resolve this the same way, with a small geometric mark that earns its place as a standalone favicon/avatar, paired with a precise, custom-feeling wordmark.

**Character:** Quiet confidence, not cleverness. The mark should feel engineered, not designed-to-impress.

**Style notes:** Geometric, constructed, single-weight strokes at 1.5px (matching `design.md`'s explicit exception: "1.5px only for the brand icon"). No gradients, no dimensional shading, no rounded-mascot energy.

**What to avoid — this is the important part:** No sparkle/wand icons, no chat-bubble icons, no circuit-board or robot imagery, no arrow-cursor motifs. These are the exact clichés that make a product look like "another AI copilot" — which the brand-naming evaluation already flagged as a risk this brand needs to actively work against visually, not reinforce.

**A more original mark direction, tied to the actual differentiator:** Rather than a "pilot" motif (steering wheel, compass, plane — all Copilot-adjacent), consider a mark built around the **reply window** concept itself — an aperture, a closing bracket, a countable interval. This ties the mark to what the brand actually sells (timing, not autopilot assistance) instead of the naming cliché the evaluation already flagged as a tension.

**3 Logo References:**
- **Linear** — borrow the restraint: a single geometric shape, monochrome-first, that works identically at 16px and 160px without needing detail.
- **Vercel** — borrow the confidence of doing almost nothing: a stark, high-contrast mark with no decoration, entirely typographic in most contexts.
- **Arc** — borrow the point of view: Arc's mark has a specific personality (the swoosh) without breaking geometric restraint — proof that "quiet confidence" doesn't have to mean "generic."

## 03 — Color Palette *(adopted from `design.md` — not re-derived)*

Primary: `--primary` orange `#ff4400`, used sparingly per the existing 60/30/10 rule — micro-labels, active dots, focus rings, and the brand mark itself. Never as a background wash. Surfaces run pure black (`#000000`, outer chrome) to charcoal (`#181818`, canvas/app default) to card (`#232323`) to popover (`#2e2e2e`) — depth through surface steps and 1px borders, never shadows or gradients. The warm "oatmeal" neutral ramp exists specifically for editorial moments (blockquotes, voice-profile samples) — don't reach for it in structural UI.

**One thing worth a decision, not a default:** the palette description explicitly calls it "Ghostbase orange," and the system is documented as "adapted from Ghostbase's visual language." That's a real, already-made call to review, not something for this brief to relitigate — see the open flags below.

## 04 — Typography *(adopted from `design.md`)*

Instrument Serif (400 only, true italic for emphasis) for headings and editorial moments — this is doing real brand work, not just decoration, since it's the one element that most separates ReplyPilot from a typical sans-everywhere AI tool. Inter for everything functional: nav, buttons, forms, and — deliberately — the generated reply/tweet text itself, so AI output reads as interface, not as false editorial authorship. Geist Mono for anything numeric: scores, timestamps, counts, always tabular. The logo wordmark should either use a custom face or a tightly-tracked cut of Inter — never Instrument Serif, which is reserved for reading, not marks.

## 05 — Imagery & Photography Style

This is a text/UI-first product — there's no packaging, no lifestyle photography need. Where imagery appears (marketing site, social previews, OG cards), it should be product screenshots and UI moments themselves, dark-mode-native, never stock photography of people at laptops. If illustration is ever needed (empty states, onboarding), it should follow the existing empty-state pattern in `design.md`: oatmeal-tinted panel, 45° hairline liner pattern, one instructive sentence — not decorative illustration.

## 06 — Iconography & Illustration

Line icons only, thin-to-regular weight, matching the 1px structural border language already established. Functional, not expressive — icons here support fast scanning (feed rows, action bars), they don't carry brand personality on their own. The brand mark is the one place allowed a heavier 1.5px stroke; everything else stays at UI weight.

## 07 — Design Principles

**Restraint is the brand, not a constraint on it.** One accent color, one accent per view, no more than one solid primary button on screen — every restriction in `design.md` is already a brand decision, not just a UI rule.

**Editorial, not conversational.** The serif/sans split exists to make ReplyPilot feel like a precise writing instrument, not a chat interface — this should extend to marketing copy and the logo's tone, not just in-app typography.

**Numbers earn trust by being honest, not by looking impressive.** Tabular mono for every live number is a visual expression of the "earned trust, never borrowed" value — a manufactured-looking score would break this system as much as it would break the brand's stated ethics.

**Depth through structure, not effects.** No shadows beyond one permitted popover shadow, no glow, no blur, no gradients — every dimensional cue comes from surface-step contrast and 1px borders. This is a harder discipline than it sounds and should be defended in every new component, including the logo.

## 08 — Brand Expressions

**In-app screens** (per the PRD: Login, Dashboard, Analyze, Results, Voice, Settings) — Dark Chrome charcoal canvas throughout, already specified in `design.md`; the identity work here is mainly ensuring the logo mark reads correctly at nav-bar scale (small, monochrome-capable) against `#181818`.

**Landing/marketing site** — pure-black chrome gutters, centered charcoal canvas, Instrument Serif hero, white pill CTAs, diagonal stripe dividers — already specified. Logo here can carry slightly more presence (header, left-aligned) than the in-app nav treatment.

**Social/OG cards** — dark-mode-native product screenshots per the imagery direction above; the brand mark should work as a small watermark without needing the full wordmark.

**Favicon/app icon** — this is where the not-yet-designed mark matters most: needs to read at 16–32px, monochrome or near-monochrome, no gradient (gradients break entirely at favicon scale).

**Presentations/pitch decks** — pure black background per the chrome tier, Instrument Serif for section titles, sparse orange accent use exactly as the in-app rules dictate — resist the urge to loosen the palette for a "friendlier" investor deck.

## Open Flags

1. **"Writing tool" framing vs. the discovery/timing positioning.** `design.md` frames ReplyPilot as *"a writing tool for X"* and calls the reply composer the "flagship component" — but `brand-strategy.md` and `brand-positioning.md` both establish that writing is the commoditized part competitors already own, and discovery + timing is the actual wedge. The visual system doesn't contradict this (it's genuinely differentiated regardless), but its own stated rationale does. Worth deciding whether `design.md`'s framing language should be updated to match the strategy, even if the visual decisions themselves stay exactly as-is.

2. **"Adapted from Ghostbase" origin vs. "Earned trust, never borrowed."** `design.md` is explicit that Dark Chrome is extracted and adapted from another product's (Ghostbase) compiled CSS and visual language. The visual result is strong, but it sits oddly next to a brand value that's specifically about not borrowing credibility. This isn't a legal question (the doc already notes licensing care around fonts) — it's a brand-authenticity question worth a deliberate yes/no, not a default.
