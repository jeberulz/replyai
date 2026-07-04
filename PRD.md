# ReplyPilot AI — Product Requirements Document (v3)

## 1. The Bet

Growing on X comes from replies and quote tweets, not original posts.

The best repliers find the right conversation early and add something no one else said.

Today that's manual. You switch between X, ChatGPT, and notes apps. This costs time. The best reply window on a viral tweet is usually under two hours.

The bet: give someone a ranked list of tweets worth replying to, plus a reply that already sounds like them, and they'll ship more replies. Those replies will land better than what they'd write themselves under time pressure.

## 2. Why This, Why Now

Voice-matched tweet generation is already a commodity. Typefully, Tweethunter, and Hypefury all do some version of it.

Your wedge is conversation discovery plus timing. Most competitors help you write. Few help you find the right thing to reply to before the window closes.

Keep this in mind as you build. If discovery and timing aren't sharp, you've built a slower version of tools that already exist.

## 3. Who This Is For

Primary: founders, indie hackers, and AI builders who post daily and know replies drive growth, but don't have time to scan X all day.

Not in v1: agencies managing multiple accounts. Different permissions, different workflows. Build for one account first.

## 4. Full Feature Set

### Analyze Tweet

Input: tweet URL.

The system pulls the tweet, the thread, the author profile, engagement metrics, top replies, and images with OCR.

Output: a summary covering topic, author's stance, existing opinions, and missing angles.

### Generate Quote Tweets

Generate 3 options per request, not 10. Ten creates decision fatigue and makes each option feel disposable. Add a "generate more" button for users who want additional options.

Categories: contrarian, educational, story, founder, UX, humorous, prediction, question, data-driven.

Each option comes with a short reason it's worth sending. Skip fake-precision scores like "92% engagement" until you have real data behind them. A visibly wrong score kills trust fast.

### Generate Replies

Same logic as quote tweets, different format: short reply, insightful reply, debate reply, friendly reply, question, agreement with added value.

### Voice Profiles

Users create named profiles: tone, sentence length, formatting habits, emoji use.

Users switch profiles instantly per tweet.

### Voice Training

Connect X account. Import recent tweets and engagement data.

Build a voice profile from vocabulary, sentence length, formatting, punctuation, common phrases, and reading level.

Every generated reply and quote tweet runs through this profile.

### Conversation Score

Every analyzed tweet gets a "worth replying" score with a reason: audience size, topic relevance, reply timing, growth velocity.

### Rewrite

Users select a generated option and choose a direction: shorter, funnier, more controversial, more educational, stronger hook, simpler, more human.

### Feed Scanner

Connect X. Monitor the following feed, lists, and saved creators on a schedule.

Surface high-opportunity tweets with an opportunity score, author, reply count, velocity, and suggested angle.

Before you build this: confirm what X's current API terms say about automated monitoring and reply suggestions. Design it so a human clicks send on every single reply, always. Automation-flagged accounts get suspended, and that ends user trust faster than any competitor could.

### Publishing

Publish directly from the app, or schedule for later.

## 5. Success Metrics

North star: percentage of generated replies used with no edits or minor edits, per active user per week.

Not total replies published. That metric rewards volume and generic replies over quality.

Supporting metrics:

- Time from pasting a URL to copying or sending a reply
- Week-2 retention
- Ratio of replies sent to replies that got a response back — this tells you the product is actually helping, not just producing text

## 6. Monetization

Decide this before launch, since it shapes which features sit behind a paywall.

Options to evaluate:

- Usage-based credits per analysis, matching LLM cost directly
- Flat subscription with a daily cap
- Free tier with a few analyses per day, paid tier unlocks voice profiles and feed scanning

## 7. Tech Stack

Frontend: Next.js, React, TypeScript, Tailwind, shadcn/ui

AI: OpenAI or Anthropic API with structured outputs, prompt caching for repeated tweet context

Database: Convex

Store in Convex: users, voice profiles, tweet analyses, generated replies, saved drafts, usage, cached responses

Auth: X OAuth

Backend: Next.js Route Handlers and Server Actions, calling Convex functions directly

Background jobs: Convex scheduled functions for feed scanning, voice retraining, and cache refresh

Storage: Convex file storage for any images or attachments

## 8. Data Model (Convex Schema)

**users**
x_user_id, username, display_name, avatar, plan, created_at

**voiceProfiles**
user_id, name, style, embedding, examples, created_at

**tweetAnalyses**
user_id, tweet_url, tweet_id, summary, intent, topic, missing_angles, created_at

**generatedReplies**
analysis_id, type, content, score, style, edited_before_send, created_at

**savedDrafts**
user_id, text, status, published, created_at

**usage**
user_id, tokens, requests, month

Use Convex's built-in reactivity for the dashboard and results screens. No separate polling or websocket layer needed.

## 9. Screens

Login: sign in with X

Dashboard: recent analyses, trending conversations, voice profiles, usage

Analyze: paste URL, analyze button

Results: conversation summary, top opportunities, quote tweets, replies, rewrite, copy, publish

Voice: train voice, examples, editing

Settings: API keys, subscription, billing, connected accounts

## 10. Platform Risk

Automated reply suggestions and a feed scanner that scores tweets and prompts fast replies can look like automated engagement under X's terms.

Before shipping the feed scanner and publishing features:

- Review X's current API terms on monitoring and automated suggestions
- Keep a human decision point on every send, permanently
- Never auto-publish without an explicit click on that specific reply

## 11. Future Roadmap

- Browser extension that injects suggestions directly into X
- Real-time monitoring of trending conversations in selected niches
- Engagement prediction before publishing
- A/B testing for reply variants
- Team workspaces with shared voice profiles
- Support for LinkedIn, Threads, and Bluesky
- Personal analytics on which AI-generated posts performed best and why
- Opportunity Radar: alerts when influential accounts post about topics matching your expertise

## 12. What Changed From v1

| v1 | v3 | Reason |
|---|---|---|
| 10 generated options | 3, with a "generate more" button | Forces quality over volume, cuts decision fatigue |
| Fake engagement/virality scores at launch | Reasons instead of scores until real data exists | A wrong score kills trust the first time a user notices |
| Feed scanner with no ToS review | Feed scanner gated on a terms review, human-click-to-send always | Automation risk can get user accounts suspended |
| North star: replies published per week | North star: percent used with no edits | Rewards quality, not spam volume |
| No monetization model | Explicit decision point before launch | Shapes which features sit behind a paywall |
| Codex Database | Convex | Real, working backend with built-in reactivity and scheduled functions |
