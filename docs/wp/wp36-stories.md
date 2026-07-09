# WP36 Stories — Voice-drift agent

**Definition of done** (Phase 2 program; product §5.2 P2 + §7.2.5): Re-measure
the user's recent voice from published examples (and/or fetched X timeline when
token present); **propose never auto-apply** profile updates with a **style diff**
view in Voice Studio.

**Depends on:** WP17 voice fidelity on `main` (`shared/voice.ts`, trained profiles).

**Parallel-safe with:** WP14 if limited to voice profile tables + voice studio UI.

## File boundary

**Owns:**

- `shared/voiceDrift.ts` (new — diff + demo fixtures)
- `convex/voiceDrift.ts` + optional `voiceDriftRuns` schema
- `convex/voiceDriftActions.ts` (or section in existing actions file) — fetch/measure
- Voice Studio UI: drift suggestion card + apply/reject controls
- `tests/voiceDrift.test.ts`

**May touch additively:**

- `convex/voiceProfiles.ts` — apply accepted suggestion mutation only
- `convex/crons.ts` — optional quarterly trigger (MVP: on-demand only is OK)
- `src/lib/x.ts` — read recent user tweets if token available; demo fallback required

**Do not touch:** drafts variant groups (WP14), compose (WP23), generation guardrails core.

## Defaults

- **Never auto-apply** style changes — user clicks Apply on specific fields.
- Diff shows: tone labels, avg sentence length band, example phrase deltas (human-readable).
- Input priority: (1) recent published draft text from app, (2) optional X timeline fetch.
- On-demand run from Voice Studio; cron quarterly is optional stretch (S5).
- Demo: deterministic drift suggestion from fixture examples when no X key.
- Record run in `voiceDriftRuns` (status, error, suggestion payload) mirroring `researchRuns` pattern.
- Usage/fair-use: one drift run counts as generation or analysis bucket — document in progress.

## Stories

- [x] **WP36-S1 — Shared drift diff + demo**
  - Compare stored profile style vs newly measured style from example set.
  - Vitest: no drift, minor drift, major drift fixtures.

- [ ] **WP36-S2 — Schema + run records**
  - Additive `voiceDriftRuns` (or reuse pattern on existing table).
  - Internal write on run complete/fail; account delete/export.

- [ ] **WP36-S3 — Measure action**
  - Convex action: gather examples (DB + optional X read), compute suggestion object.
  - Demo path when `ANTHROPIC_API_KEY` / X missing — never throw to user.
  - Optional LLM one-paragraph summary of diff (zod-validated); skip if no key.

- [ ] **WP36-S4 — Voice Studio UI**
  - “Check for voice drift” button; shows diff + Apply / Dismiss.
  - Apply patches profile style/examples per user selection only.

- [ ] **WP36-S5 — Verification (+ optional cron)**
  - Manual demo + trained profile path; checks green.
  - Optional: quarterly cron stub behind feature flag — skip if timeboxed.
