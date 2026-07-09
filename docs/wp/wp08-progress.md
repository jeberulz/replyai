# WP8 Progress — Hot-window notifications

## Defaults (locked for this WP)

| Setting | Value |
|---|---|
| Daily cap | 5 push alerts / user / local day |
| Quiet hours | 22:00–08:00 |
| Timezone default | UTC |
| Score threshold | 70 |
| Young window | 2 hours |
| Golden-15 | `watched` or `list` source, posted ≤15m ago, score ≥ threshold |
| Sources when enabled | all four on (`following`, `lists`, `watched`, `search`) |
| Master switch | off until user opts in **and** grants browser push permission |
| Pro gate | `hasProAccess` (demo counts as Pro) |
| Push without VAPID | no network push (demo-safe) |
| Copy | golden-15: "Reply in the next ~15 min — window is still young." — no fake ML % |

## 2026-07-09 — Verification

- `npm run typecheck && npm run lint && npm test && npm run build` — pass (lint: 4 existing generated-file warnings only).
- `npm run security:audit` — pass (70 public Convex functions, 5 new notification endpoints auth-gated via `requireUser`).
- `npx convex codegen` blocked (no `CONVEX_DEPLOYMENT`); `convex/_generated/api.d.ts` updated manually for `notifications` + `notificationsActions`.

## 2026-07-09 — Review fix

- `fix(wp8): remove Date.now from settings query` — `settings` query uses `notificationSettingsDefaults()` (no wall-clock); server blocks `masterEnabled` without `permissionGrantedAt`; Switch disabled until push subscription exists.

## 2026-07-09 — Orchestrator review fixes (#1–#6)

1. VAPID: `pushConfigured` requires SUBJECT; incomplete VAPID leaves alerts queued (no suppress) so digest can drain.
2. open→send: `markAlertSent` requires `status === "opened"` + `openedAt`.
3. Deep links: relative `/feed?…` by default; `APP_URL` for digest absolute; SW resolves relative against origin.
4. Cap: `dueQueuedAlerts` takes `min(limit, remaining)`.
5. Cron scan: `by_status_created` index; `usersWithQueuedAlerts` pages queued rows (no full collect).
6. `expireStaleQueued` cron every 6h via `expireStaleQueuedAlerts` (24h TTL, batched).
Bonus: removed double `notification_alert_opened` client track; push 404/410 only suppresses.
