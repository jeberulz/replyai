import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Feed scanner: surface fresh reply opportunities for users who enabled it.
// Suggestions only — publishing always requires an explicit human click.
crons.interval("scan feeds", { minutes: 30 }, internal.scanner.scanAll, {});

// Drop expired AI response cache entries daily.
crons.interval("prune cache", { hours: 24 }, internal.cache.prune, {});

export default crons;
