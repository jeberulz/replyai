<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ReplyPilot AI — project notes

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
