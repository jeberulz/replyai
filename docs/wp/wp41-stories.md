# WP41 stories — Grok + Evaluation Lab program registration

WP41 is documentation-only. It registers the implementation packages; it does
not implement, enable, or route any production model behavior.

- [ ] **WP41-S1 — Register the official package rows.**
  - Audit `docs/PRODUCT_STRATEGY.md` §14 and confirm WP41 is the next
    never-used identifier after WP40.
  - Add WP41–WP51 rows with phase, explicit key files/areas, dependencies, and
    a verifiable Definition of Done.
  - Preserve the approved provider, rollout, authorization, demo, publishing,
    and eval compatibility decisions.
- [ ] **WP41-S2 — Publish the implementation program brief.**
  - Add one program brief under `docs/wp/` covering the dependency graph,
    collision matrix, routing ledger, owner/rollout gates, and wave gates.
  - Make package ownership and merge order explicit enough for independent
    implementation workers.
  - Record honestly that this runtime cannot enforce subagent model/effort
    routing and that all workers inherit the current runtime.
- [ ] **WP41-S3 — Reconcile and verify the docs package.**
  - Verify WP identifiers are unique and WP41–WP51 dependencies agree between
    §14 and the program brief.
  - Review the owned-file diff for scope, collision, and product-decision
    consistency; run `git diff --check`.
  - Record exact verification evidence and any remaining owner gates or
    UNKNOWNs in `docs/wp/wp41-progress.md`.

