# The One-Take Content Engine

**One recording session every two weeks → 18 reels, 1 YouTube long-form, 1 podcast, 6 LinkedIn posts, 1 newsletter.**

Adapted from Eric Siu's (@ericosiu) clip-distribution model, restructured for a
solo operator with a full-time job and no guest roster. Source analysis:
`docs/marketing/ericosiu-teardown.md` (summary inline below).

---

## 1. The diagnosis

The current plan in `weekendmvp/content/social/reels/campaigns/2026-07-audience-growth/calendar.csv`
is **one idea per day, seven formats, recorded near-daily**. The `status` column
already shows the failure mode: a growing queue of `scripted` and `recorded`
rows waiting on production attention that a full-time job does not have.

The problem is not idea supply — there are 140 deep-researched ideas in
`weekendmvp/ideas/manifest.json`. The problem is that **posting cadence is
coupled to recording cadence**. Daily posting requires daily production.

Eric Siu's model decouples them: record long-form once, cut it into weeks of
clips, post daily at zero marginal cost. That is the fix.

## 2. Where we improve on Eric

Eric's model has four weaknesses. Each is addressable, and three of them we are
structurally better positioned to solve.

| Eric's weakness | Our fix |
|---|---|
| CTA is "search my show on YouTube" — unmeasurable, high friction, leaks most intent | Comment-keyword → auto-DM a **specific** idea page URL. Measurable, drives comments (the strongest Reels ranking signal), captures an owned DM thread. |
| Authority is borrowed from guests; collapses if bookings stop | Authority is generated from **shipped work + public numbers**. ReplyPilot is the running proof. |
| Episodes are interchangeable — no reason to come back | The Build Log block serialises. Episode 12 pays off episode 3. Compounding, not disposable. |
| Records loose and hunts for clips afterwards | Record **in clip-shaped blocks**. Cutting becomes mechanical, not editorial. |

The last one is the biggest operational win and is covered in §4.

## 3. Show format

**Name:** *The Build Sheet* (alt: *Weekend MVP Radio*)
**Cadence:** one recording session per 2 weeks. 26 sessions/year.
**Output per session:** ~18 clips = 18 days of daily posting (14 days of
schedule + 4 clips of buffer for a missed week).

Each episode is **themed**, not a random five. Themed episodes give the YouTube
long-form a searchable title, the newsletter a subject line, and the 18 clips a
shared topic cluster that the recommendation algorithm reads as a coherent
account.

**Episode = 5 ideas + 1 ReplyPilot build log.**

## 4. The core mechanic: record in blocks, not in a conversation

This is the part that makes the whole thing survivable.

Do **not** record a 60-minute freeform monologue and then hunt for clips. Record
~18 atomic blocks back to back in a single sitting. Each block:

- Opens on a hard hook. No "so", no "as I mentioned", no warm-up.
- Is fully self-contained. Never references another block.
- Runs 45–90 seconds spoken.
- Closes on a finished thought.
- Is separated by a clap or slate so cuts are findable in seconds.

The long-form YouTube episode is then the **assembly** of those blocks with
short bridges recorded at the end. You get the clips and the long-form from the
same take, and the edit involves no judgement calls — just cutting on slates.

If you fumble a block, restart the block. Never fix it in post.

## 5. Block taxonomy

Every block type maps to a section that **already exists** in each idea's MDX
file (`weekendmvp/content/ideas/<slug>.mdx`, structure enforced by
`ideas/SECTIONS.md`). The research is already written — blocks are a reading
order, not new work.

| Block | Source section | Hook shape | Existing 8-slide layout |
|---|---|---|---|
| **Pain Receipt** | The Problem | "X is still done by hand in 2026." | `idea-spotlight-8slide` |
| **Incumbent Gap** | Competitive Landscape | "CodeRabbit charges $15/dev. Here's what they won't build." | `pipeline-8slide` |
| **Revenue Math** | Business Model + Unit Economics | "$9/dev, 70% margin. Here's the path to $5k." | `receipt-8slide` |
| **Three-Screen MVP** | The Solution + Tech Stack | "Eight hours. Three screens. That's the whole build." | `stack-grid-8slide` |
| **Honest Critique** | Your Opportunity, inverted | "This scores 9/10 and I still wouldn't build it." | `digest-8slide` |
| **Build Log** | ReplyPilot progress | "I shipped X. It broke. Here's the number." | `receipt-8slide` |
| **Founder POV** | Cross-cutting thesis | Contrarian claim, no idea attached. | `wmv-default-8slide` |

The visual system for all seven already exists in
`weekendmvp/content/social/_layouts/`.

**Per episode:** 5 ideas × 3 blocks (rotate which three) = 15, plus 2 Build Log,
plus 1 Founder POV cold open = **18 clips**.

Use *Honest Critique* on at least one idea per episode. Publicly killing an idea
you researched is the single strongest credibility signal available to you, and
it is the format Eric cannot run at all.

## 6. Caption and CTA system

Caption template — the spoken hook, repeated verbatim as text:

```
[Hook, 4–9 words]

Full breakdown — competitors, real pricing, the 8-hour build:
comment "SHEET" and I'll DM it.
```

Rules:

- **No hashtags.** Eric uses none; the reach evidence supports it.
- **Keyword rotates per episode** (`SHEET`, `STACK`, `MATH`, `RECEIPT`) so DM
  volume attributes back to a specific episode with no analytics work.
- **Auto-DM delivers the specific page**, `weekendmvp.app/ideas/<slug>` — not a
  generic homepage. Requires IG's native keyword automation or ManyChat.
- **Link in bio** points at a per-episode landing page listing the five ideas
  plus the current ReplyPilot state.

Why this beats "search on YouTube": comments outrank every other engagement
signal on Reels, the DM is an owned channel, and every step is measurable.

## 7. ReplyPilot integration — proof, not advertisement

Do not run ReplyPilot as a sponsor slot. Run it as the **control group**.

The show's implicit claim is: *I evaluate ideas with real numbers.* The Build Log
block is where that claim gets tested in public — here is what the analysis
predicted, here is what actually happened when I built one.

This does three things at once:

1. Makes the idea segments credible (you are not a guy reading a spreadsheet).
2. Gives the show serialised narrative — the retention mechanic Eric's format
   entirely lacks.
3. Markets ReplyPilot without a single ad read.

Use a real number every episode, drawn from the metrics already defined in
`STRATEGY.md` — reply use rate, opportunity→analyze conversion, week-2
retention. Per the product guardrails in `AGENTS.md`, quote **measured** numbers
only. No projections stated as results.

## 8. Production spec

- **Record 4K landscape**, subject centred with generous headroom → crop 9:16
  for vertical, keep 16:9 for YouTube. One recording, both aspect ratios.
- **One camera, one lighting setup, one location.** Variation is the enemy of
  batching.
- **B-roll in a single pass:** after the talking-head take, do one ~10 minute
  screen capture walking the five idea pages and the ReplyPilot app. Cut from
  that pool for all 18 clips.
- **Batch caption burn-in** across all clips in one operation.

## 9. Time budget (honest)

| Task | Time |
|---|---|
| Prep: pick 5 ideas, write 18 hooks | 45 min |
| Record 18 blocks + bridges | 75 min |
| Screen-capture B-roll pass | 15 min |
| Batch edit + export 18 clips | 90 min |
| Caption, schedule, queue LinkedIn/newsletter | 30 min |
| **Total per 2 weeks** | **~4.25 h** |

≈ **2.1 hours per week** for daily posting across three platforms.

Writing the 18 hooks is the only genuinely creative work; everything else is
mechanical. **Editing is the bottleneck and the correct first thing to
outsource** (~$150–300/episode). Do it yourself for the first two episodes so
the brief is precise, then hand it off.

## 10. Distribution ladder — one recording, everything else

| Output | Effort after recording | Cadence |
|---|---|---|
| 18 Reels → IG, TikTok, YT Shorts (same files) | batch export | 1/day |
| 1 YouTube long-form (assembly, 40–55 min) | stitch on slates | 1/2 weeks |
| 1 podcast episode (audio rip) | export | 1/2 weeks |
| 6 LinkedIn text posts | transcribe Revenue Math + Incumbent Gap blocks | 3/week |
| 1 newsletter issue | episode as written digest | 1/2 weeks |
| 5 carousels | existing `_layouts/*-8slide` | 2–3/week |

The YouTube long-form is the searchable, compounding asset. The reels are
discovery. The newsletter is the owned list.

## 11. First three episodes (real slugs, ranked from `ideas/manifest.json`)

**Ep 1 — "Boring Money"** *(fintech / b2b — highest revenue goals in the set)*
- `quickbooks-escape-ramp` — 36/36, $10k/mo target, 8–10 h build
- `saas-financial-toolkit` — 36/36, 8 h
- `client-portal` — 36/36, 12 h
- `ai-chief-of-staff-consultants` — 36/36, 8–10 h
- `freelance-scope-creep-detector` — 35/36, 8 h
- Build Log: ReplyPilot — what discovery+timing actually measured this fortnight

**Ep 2 — "Tools for the People Building Tools"** *(developer-tools — the audience
most likely to convert on ReplyPilot)*
- `ai-agent-error-translator` — 36/36, 10 h
- `ai-coding-agent-dashboard` — 36/36, 8 h
- `ai-coding-classroom-assistant` — 36/36, 12 h
- `voice-desktop-workflow-macros` — 36/36, 8–10 h
- `helpdesk-workflow-migration-cloner` — 36/36, $10k/mo
- Build Log: ReplyPilot's own build — this episode's audience *is* the ICP

**Ep 3 — "The Shopify Tax"** *(ecommerce — tightest topic cluster)*
- `shopify-ai-support-context` — 36/36, 8 h
- `shopify-review-intelligence` — 36/36, timing 10/10
- `shopify-trust-scanner` — 36/36, 8–10 h
- `abandoned-cart-recovery`
- `ai-cart-rescue-emotional-emails`
- Build Log: ReplyPilot

## 12. Metrics — three only

1. **3-second hold rate** per reel. The only early metric that matters; it grades
   hook quality and nothing else.
2. **Keyword DM comments per reel.** Direct intent measurement, attributable per
   episode via the rotating keyword.
3. **`weekendmvp.app/ideas/*` sessions from Instagram → ReplyPilot signups.**
   The only number that connects content to the business.

Review after every second episode. Kill any block type whose hold rate trails
the others across four consecutive appearances.

## 13. What to stop doing

- Retire the daily one-idea-one-reel calendar with seven independently produced
  formats. It cannot survive a full-time job.
- Stop hand-maintaining `calendar.csv`. It should be **generated** from an
  episode manifest (see below).

## 14. Proposed tooling (not yet built)

Add `content/social/reels/episodes/<NN>/episode.json` to the weekendmvp repo:

```jsonc
{
  "episode": 1,
  "title": "Boring Money",
  "recordedAt": "2026-08-02",
  "keyword": "SHEET",
  "ideas": ["quickbooks-escape-ramp", "saas-financial-toolkit", "..."],
  "blocks": [
    {
      "type": "founder-pov",
      "slug": null,
      "timecode": "00:00:00",
      "hook": "Most startup ideas fail on arithmetic, not taste.",
      "caption": "...",
      "publishAt": "2026-08-04"
    }
  ]
}
```

Then a script — matching the existing `scripts/audit-ideas.js` / `ideas/gate.js`
conventions — that emits `calendar.csv`, per-clip caption files, and the
newsletter digest stub from one manifest. Keeps a single source of truth and
removes the hand-maintained spreadsheet entirely.

---

## Appendix: Eric Siu teardown (condensed)

Analysis of [@ericosiu](https://www.instagram.com/ericosiu/) (~117K followers).
Instagram blocks automated fetching, so this was reconstructed from ~22
search-indexed reel captions, profile metadata, and his publicly stated
playbook. Caption corpus skews 2024–early 2025.

- **~100% Reels, all cut from long-form podcast interviews.** No IG-native
  formats. Stated system: record long-form in person → full video to YouTube →
  chop for Reels/Shorts/TikTok → chop podcast into 5-min clips for a second
  channel. Marginal cost per post ≈ 0.
- **Rigid caption formula:** bare declarative hook (3–8 words) + `🎥 Search
  "Leveling Up with Eric Siu" on YouTube to watch the full interview`. Observed
  hooks: "Strategy is philosophy", "The Hormozi secret to holdco success", "Do
  this when you're stressed", "Bitcoin is the ultimate savings technology?",
  "Marriage is Prostitution".
- **No hashtags** in any indexed caption.
- **Search-based CTA, not a link** — dodges IG link suppression and manufactures
  branded YouTube search volume, at the cost of measurability and conversion.
- **Borrowed authority as a niche-expander:** guest credibility lets a marketing
  account post about Bitcoin, marriage, and Buffett, breaking the niche reach
  ceiling.
- **Funnel:** Reel → branded YouTube search → long-form/podcast → newsletter →
  Single Grain / Single Brain. Instagram sits three steps from revenue, which is
  why it is not conversion-optimised.
- **Weaknesses:** unattributable CTA, 100% format monoculture, no community
  layer (captions never invite a reply), guest-dependent topic range, and 117K
  followers is modest for the volume and guest quality — Instagram is evidently
  a repost target, not a tuned channel. His LinkedIn (7.7 posts/week, original
  writing) is where he is actually strategic.
