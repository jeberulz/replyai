import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Feed scanner: surface fresh reply opportunities for users who enabled it.
// Suggestions only — publishing always requires an explicit human click.
crons.interval("scan feeds", { minutes: 15 }, internal.scannerActions.scanAll, {});

// Reply-back tracker: observe replies to published drafts during their 48h
// outcome window. Suggestions/publishing remain human-approved only.
crons.interval("poll reply outcomes", { minutes: 15 }, internal.outcomes.pollDue, {});

// Drop expired AI response cache entries daily.
crons.interval("prune cache", { hours: 24 }, internal.cache.prune, {});

// Recover abandoned staged analysis pipelines so users can retry instead of
// watching a dead spinner.
crons.interval(
  "sweep stale analysis pipelines",
  { minutes: 5 },
  internal.analyses.failStalePipelines,
  {}
);

// Recompute per-user ranking weights from opportunity funnel outcomes.
crons.weekly(
  "recompute ranking weights",
  { dayOfWeek: "monday", hourUTC: 4, minuteUTC: 0 },
  internal.ranking.recomputeAll,
  {}
);

export default crons;
