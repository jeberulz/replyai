---
name: ReplyPilot AI
last_updated: 2026-07-04
---

# ReplyPilot AI Strategy

## Target problem

Founders and indie builders know replies drive X growth, but finding the *right* conversation before the ~2-hour reply window closes requires hours of manual scrolling across a noisy algorithmic feed. The crux: relevance and timing are coupled — a viral tweet in the wrong niche is worthless, and a perfect niche tweet discovered six hours late is too.

## Our approach

Win on **curated discovery + timing**, not voice-matched generation. Pull from multiple intentional sources (lists, watched accounts, keyword search) — not the raw home timeline alone — rank by a transparent heuristic that weights topic fit highest, and always require a human click to send. Learn which surfaces actually produce sent replies and downstream engagement, then tighten the funnel from there.

## Who it's for

**Primary:** Solo founders, indie hackers, and AI builders who post daily and treat replies as their main growth lever — they're hiring ReplyPilot to surface the 10 conversations worth joining today without living on X.

## Key metrics

- **Reply use rate (north star)** — % of generated replies sent with no or minor edits, per active user per week; measured from `generatedReplies.editedBeforeSend` + publish events
- **Opportunity → analyze conversion** — % of feed opportunities the user opens and runs through Analyze; measured from `opportunities.status` transitions
- **Time-to-first-reply** — minutes from opportunity surfaced to draft copied or sent; measured client-side + draft timestamps
- **Reply response rate** — ratio of sent replies that receive a reply back within 48h; measured via periodic X API poll on published reply IDs
- **Week-2 retention** — users active in week 2 after signup; Convex user activity queries

## Tracks

### Relevance engine (feed scanner v2)

Multi-source ingestion (X lists, watched accounts, keyword search) fused into one ranked opportunity queue with semantic + keyword relevance, timing/velocity scoring, and hard filters (already-replied, dismissed, off-niche).

_Why it serves the approach:_ Competitors don't win on generation — they win on *where* they point you. Our wedge dies if the feed is noisy or late.

### Research agent (profile discovery)

An agent that finds accounts and tweets worth learning from in the user's niche — similar authors, high-performing posts in topic clusters, and "add to watch list" recommendations — so growth becomes a repeatable system, not random scrolling.

_Why it serves the approach:_ SuperX/TweetHunter treat lists as the unit of engagement strategy. We automate list-building so users spend time replying, not researching who to follow.

### Voice-grounded generation (existing core)

Analyze URL → score → 3 options with reasons → voice profile → human send. Keep generation excellent but secondary to discovery.

_Why it serves the approach:_ Generation is table stakes; discovery is the bet. Still must be good enough that the north-star metric holds.

### Outcome feedback loop

Track which opportunity sources, scores, and authors correlate with sent replies and responses; per-user weight tuning over time.

_Why it serves the approach:_ Static keyword lists and generic heuristics decay. Closed-loop learning is how relevance stays sharp without fake ML scores in the UI.

## Not working on

- Auto-posting or auto-replies (permanent platform constraint; X API reply restrictions since Feb 2026 reinforce this)
- Multi-account / agency workflows in v1
- Fake-precision engagement predictions ("92% chance to go viral")

## Marketing

**One-liner:** Find the right X conversation before the window closes — then reply in your voice with one click.

**Key message:** Competitors help you write. ReplyPilot helps you find what to reply to, when it still matters, from people worth engaging.
