# WP11 Stories — Personal analytics v1

- [x] `WP11-S1` Shared outcome aggregation and angle attribution
  - Add shared helpers that derive personal-analytics cohorts from completed reply outcomes only, with deterministic grouping for category, chosen angle, and local publish hour.
  - Keep the analytics grounded in observed data already in the repo: WP7 reply outcomes, generated reply categories, analysis missing angles / scanner suggested angles, and WP20 edit-bucket metadata where useful for supporting context.
  - Add focused tests for category, angle, and time-of-day aggregation, including sparse-data behavior and honest null-rate handling.

- [x] `WP11-S2` Authorized analytics query on bounded real outcome history
  - Extend the Convex dashboard/query surface with a user-authorized personal analytics query that returns category, angle, and time-of-day insights from observed outcomes, without introducing fake predictions or breaking demo mode.
  - Bound the query to a clear recent-history window / item cap so it remains safe under Convex query guidance, and expose enough sample-size metadata for the UI to label thin data honestly.
  - Stay inside WP11 ownership boundaries: analytics modules/query wiring only, no generation, scanner, extension, or publish-behavior changes.

- [x] `WP11-S3` Dashboard personal-analytics section
  - Add a dashboard section that surfaces the strongest observed category, angle, and time-of-day takeaways in the existing Dark Chrome chat-home shell without replacing the chat-first flow.
  - Render honest empty and sparse states when the user does not yet have enough observed outcomes, and keep the copy firmly observational rather than predictive.
  - Reuse the new analytics query cleanly from the client, keeping the surface demo-safe and consistent with the existing dashboard modules.
