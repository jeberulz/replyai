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
