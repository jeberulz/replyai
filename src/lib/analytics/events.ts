/**
 * Canonical event catalog for the north-star funnel (PRD §5 success
 * metrics; docs/PRODUCT_STRATEGY.md §11 metrics & instrumentation).
 *
 * This is the ONE place event names and their property shapes are defined.
 * Every call site imports from here — no ad-hoc event-name strings anywhere
 * else in the app or in Convex functions. Pure types + constants only: no
 * imports, no side effects, so this file is safe to import from both
 * Next.js code (`@/lib/analytics/events`) and Convex functions (relative
 * import), regardless of runtime (browser, Node, or Convex's V8 isolate).
 *
 * Funnel order (docs/observability.md documents the PostHog funnel built
 * from these, in this order):
 *   1. opportunity_surfaced
 *   2. opportunity_opened
 *   3. generation_requested
 *   4. option_selected
 *   5. draft_saved
 *   6. published
 */

/** Feed-scanner source a surfaced/opened opportunity came from. */
export type FunnelSource = "following" | "list" | "watched" | "search";

export type OptionKind = "reply" | "quote" | "standalone" | "thread" | "longform";

export type PublishMode = "threaded" | "standalone" | "url_quote";
export type ObservedEditBucket = "no_edit" | "minor_edit" | "major_edit";

/** How the user acted on a specific generated option. */
export type OptionSelectedAction = "copied" | "saved" | "published";

/** What triggered a generation call. */
export type GenerationTrigger = "initial" | "more" | "compose";

export type NotificationAlertChannel = "push" | "digest";
export type NotificationAlertTier = "golden15" | "hot";
export type ShadowGrokAvailability =
  | "off"
  | "not_sampled"
  | "no_query"
  | "spend_blocked"
  | "circuit_open"
  | "provider_unavailable"
  | "hydration_failed"
  | "succeeded"
  | "failed";

export type AnalyticsEventProperties = {
  /** Fired once per user per scan run when new opportunities were inserted. */
  opportunity_surfaced: {
    count: number;
  };
  /** Fired when a user opens a specific opportunity to review it. */
  opportunity_opened: {
    opportunityId: string;
    source?: FunnelSource;
    score: number;
  };
  /** Fired when the analysis pipeline runs a generation call. */
  generation_requested: {
    analysisId: string;
    trigger: GenerationTrigger;
    kind?: OptionKind;
  };
  /** Fired when a user commits to a specific generated option. */
  option_selected: {
    analysisId?: string;
    replyId: string;
    kind: OptionKind;
    category: string;
    action: OptionSelectedAction;
    editBucket?: ObservedEditBucket;
    editDistanceNormalized?: number;
  };
  /** Fired when a generated option is explicitly saved to drafts. */
  draft_saved: {
    analysisId?: string;
    replyId?: string;
    kind: OptionKind;
  };
  /** Fired when a draft is actually published to X (incl. demo mode). */
  published: {
    draftId: string;
    kind: OptionKind;
    publishMode: PublishMode;
    scheduled: boolean;
    editBucket?: ObservedEditBucket;
    editDistanceNormalized?: number;
  };
  /** Fired when a hot-window alert is delivered (push or digest). */
  notification_alert_delivered: {
    alertId: string;
    opportunityId: string;
    tier: NotificationAlertTier;
    channel: NotificationAlertChannel;
    score: number;
    source?: FunnelSource;
  };
  /** Fired when a user opens an alert deep link. */
  notification_alert_opened: {
    alertId: string;
    opportunityId: string;
    tier: NotificationAlertTier;
  };
  /** Fired when a user publishes after opening an alert. */
  notification_alert_sent: {
    alertId: string;
    opportunityId: string;
    tier: NotificationAlertTier;
    draftId?: string;
  };
  /** Fired by the scanner's shadow-only Grok discovery path; never user-facing. */
  shadow_grok_discovery_sampled: {
    availability: ShadowGrokAvailability;
    sampled: boolean;
    candidateCount: number;
    costUsd: number;
    circuitOpen: boolean;
    evalRunId?: string;
  };
};

export type AnalyticsEvent = keyof AnalyticsEventProperties;

/** Ordered funnel step list — the order PostHog's funnel insight uses. */
export const FUNNEL_STEPS: readonly AnalyticsEvent[] = [
  "opportunity_surfaced",
  "opportunity_opened",
  "generation_requested",
  "option_selected",
  "draft_saved",
  "published",
];

/**
 * Single source of truth for the PostHog default ingestion host — used by
 * the server (src/lib/analytics/server.ts), client
 * (src/lib/analytics/client.ts), and Convex (convex/lib/analytics.ts)
 * adapters so the fallback can't drift between the three.
 */
export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
