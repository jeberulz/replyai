<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ReplyPilot AI — project notes

- **Product source of truth**: `PRD.md` (v3). Read it before building or
  changing any feature — it defines the bet (conversation discovery + timing
  is the wedge, not voice-matched generation), scope (single account in v1, no
  agencies), the north-star metric (% of generated replies used with no/minor
  edits), and permanent constraints. When code and PRD disagree, the PRD wins
  unless the user says otherwise. Supporting docs: `README.md` (build/run,
  architecture), `design.md` (Dark Chrome design system).
- **Product guardrails from the PRD** (don't regress): generate **3** options
  per request with a "generate more" button, never 10; show a short *reason* an
  option is worth sending, never fake-precision scores (e.g. "92% engagement")
  until real data backs them; keep discovery + timing signals sharp — they are
  the differentiator.
- **Layout**: `src/app` (Next App Router) · `convex/` (schema + functions) ·
  `shared/` (scoring + voice logic imported by both sides) · `tests/` (vitest).
- **Auth**: session token in an httpOnly cookie, validated by every Convex
  function via `requireUser(ctx, sessionToken)` (`convex/helpers.ts`). Never
  add a Convex query/mutation that skips it.
- **Demo mode**: missing `X_CLIENT_ID`/`ANTHROPIC_API_KEY` must never break a
  flow — every integration has a deterministic fallback (`shared/demoData.ts`,
  demo branches in `src/lib/ai.ts` / `src/lib/x.ts`). Keep it that way.
- **Platform rule (permanent)**: no auto-publish path. Every post requires an
  explicit user click on that specific text.
- **Checks**: `npm run typecheck && npm run lint && npm test && npm run build`.
- `convex/_generated` is checked in; `npx convex dev` regenerates it.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
