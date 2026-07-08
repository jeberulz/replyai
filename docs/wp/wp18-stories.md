# WP18 Stories - Score integrity & relevance

Definition of done from `docs/PRODUCT_STRATEGY.md` §14:

Displayed score matches displayed reason (adjustments explained or internal-only);
audience-normalized velocity; semantic relevance on manual analyses;
classifier-based brand-safety screen.

## Stories

- [ ] WP18-S1 - Restore score and reason integrity
  - Acceptance criteria:
    - User-visible `scoreConversation` output only contains adjustments that the
      reason string can honestly explain, or the adjustment stays internal-only.
    - Curated-source, saturated-thread, and learned-ranking adjustments do not
      create a displayed score/reason mismatch in manual analyses or scanner
      surfaces.
    - Focused tests lock the displayed-score vs displayed-reason contract.

- [ ] WP18-S2 - Normalize velocity by audience context
  - Acceptance criteria:
    - Growth velocity is normalized against author follower band instead of a
      single global viral threshold.
    - Small-account opportunities can earn meaningful velocity credit without
      overpowering relevance and timing.
    - Focused tests cover follower-band normalization and preserve score bounds.

- [ ] WP18-S3 - Run semantic relevance for manual analyses
  - Acceptance criteria:
    - Manual analysis scoring uses semantic relevance when the classifier can run
      instead of defaulting to an assumed `0.5`.
    - Demo mode and missing AI keys remain deterministic via the existing demo
      classifier path.
    - Focused tests cover classifier, fallback, and no-key behavior for manual
      analysis scoring.

- [ ] WP18-S4 - Replace regex-only political blocking with classifier-based brand safety
  - Acceptance criteria:
    - Brand-safety screening uses the semantic classifier path as the final
      decision-maker for political/news tangents and broader unsafe contexts,
      rather than only an English/US-centric hard-zero regex.
    - The cheap regex may remain as an input signal or prefilter, but safe
      niche-relevant policy/brand tweets are not forced to zero solely by regex.
    - Focused tests cover political tangents, non-political tragedy/outrage
      content, and allowed niche-relevant edge cases.

- [ ] WP18-S5 - Final verification and reviewer map
  - Acceptance criteria:
    - `docs/wp/wp18-stories.md` is fully checked and
      `docs/wp/wp18-progress.md` records the implementation decisions and
      verification trail.
    - `npm run typecheck && npm run lint && npm test && npm run evals && npm run build`
      pass in the WP18 worktree.
    - The final branch state contains only WP18-scoped code, test, and working
      artifact changes.
