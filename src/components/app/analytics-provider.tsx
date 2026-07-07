"use client";

import { useEffect } from "react";
import { identifyClient } from "@/lib/analytics/client";

/**
 * Identifies the current user to PostHog once per mount. PostHog itself is
 * initialized earlier (before hydration) in src/instrumentation-client.ts;
 * this component only needs to know who's logged in, which requires a
 * server-provided prop. No-ops if analytics isn't configured — see
 * initAnalyticsClient's guard.
 */
export function AnalyticsProvider({ userId }: { userId: string }) {
  useEffect(() => {
    identifyClient(userId);
  }, [userId]);
  return null;
}
