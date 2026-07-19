"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Loader2, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  FRESH_AGE_MS,
  HIGH_VELOCITY_THRESHOLD,
} from "../../../shared/feedFilters";
import { RANKING_CHANGELOG_MAX_AGE_MS } from "../../../shared/rankingChangelog";
import {
  scanNowAction,
  markNotificationAlertOpenedAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { FeedScanProgress } from "@/components/app/feed-scan-progress";
import { trackClient } from "@/lib/analytics/client";
import { type Opportunity } from "@/components/app/opportunity-card";
import { OpportunityRow } from "@/components/app/feed/opportunity-row";
import { OpportunityDetail } from "@/components/app/feed/opportunity-detail";
import { ScannerSettingsDialog } from "@/components/app/feed/scanner-settings-dialog";
import { TrendRadarStrip } from "@/components/app/feed/trend-radar-strip";
import { MasterDetail } from "@/components/app/split/master-detail";
import { SplitPageShell } from "@/components/app/split/split-page-shell";
import {
  FilterChips,
  PaneEyebrow,
} from "@/components/app/split/pane-chrome";
import { OatmealEmptyState } from "@/components/app/oatmeal-empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { opportunityMatchesTopic } from "../../../shared/trends";

const SCAN_TIMEOUT_MS = 45_000;

type EnabledSource = "following" | "lists" | "watched" | "search";

const DEFAULT_SOURCES: EnabledSource[] = ["following"];

type QuickFilter = "all" | "watched" | "fresh" | "velocity";

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watched", label: "Watched only" },
  { value: "fresh", label: "< 1h old" },
  { value: "velocity", label: "High velocity" },
];

export function FeedScanner() {
  const sessionToken = useSessionToken();
  const searchParams = useSearchParams();
  const topicSlug = searchParams.get("topic");
  // Always-on clock for freshness + trend radar. Lazy initializer keeps
  // Date.now() out of the render body (interval is the only in-effect update).
  const [nowMs, setNowMs] = useState(() => Date.now());
  const settings = useQuery(
    api.scanner.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken ? { sessionToken } : "skip"
  );
  const radar = useQuery(
    api.trends.radar,
    sessionToken ? { sessionToken, nowMs, limit: 3 } : "skip"
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [changelogDismissed, setChangelogDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const scanBaselineRef = useRef<number>(0);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    const opportunityId = searchParams.get("opportunity");
    const alertId = searchParams.get("alert");
    if (!opportunityId || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    setSelectedId(opportunityId);
    if (alertId) {
      // Server mutation schedules notification_alert_opened — don't double-fire client.
      void markNotificationAlertOpenedAction(alertId);
    }
  }, [searchParams]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const parsedKeywords = () => settings?.keywords ?? [];

  const activeTopic =
    topicSlug && radar?.topics
      ? (radar.topics.find((t) => t.slug === topicSlug) ?? null)
      : null;

  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return undefined;
    return opportunities.filter((opp) => {
      if (activeTopic) {
        if (
          !opportunityMatchesTopic(opp.text, activeTopic, String(opp._id))
        ) {
          return false;
        }
      }
      if (quickFilter === "watched") return opp.source === "watched";
      if (quickFilter === "fresh") {
        if (nowMs === 0) return true;
        return nowMs - opp.postedAt < FRESH_AGE_MS;
      }
      if (quickFilter === "velocity") {
        return (opp.velocity ?? 0) >= HIGH_VELOCITY_THRESHOLD;
      }
      return true;
    });
  }, [opportunities, quickFilter, nowMs, activeTopic]);

  const rows: Opportunity[] = (filteredOpportunities ?? []).map((opp) => ({
    ...(opp as unknown as Opportunity),
    _id: String(opp._id),
  }));
  const selected = rows.find((o) => o._id === selectedId) ?? null;

  const selectOpportunity = (opp: Opportunity) => {
    setSelectedId(opp._id);
    trackClient("opportunity_opened", {
      opportunityId: opp._id,
      source: opp.source,
      score: opp.score,
    });
  };

  const beginScanTracking = () => {
    scanBaselineRef.current = settings?.lastScanAt ?? 0;
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;
    const lastScanAt = settings?.lastScanAt;
    const completed =
      lastScanAt !== undefined && lastScanAt > scanBaselineRef.current;
    if (completed) {
      setScanning(false);
      if (settings?.lastScanError) {
        toast.error(settings.lastScanError);
      } else if ((settings?.lastScanCount ?? 0) === 0) {
        toast.message(
          "Scan complete — no matching tweets in your feed right now"
        );
      } else {
        toast.success(
          `Feed scan complete — ${settings?.lastScanCount} opportunit${settings?.lastScanCount === 1 ? "y" : "ies"} found`
        );
      }
    }
  }, [
    scanning,
    settings?.lastScanAt,
    settings?.lastScanError,
    settings?.lastScanCount,
  ]);

  useEffect(() => {
    if (!scanning) return;
    const timeout = window.setTimeout(() => {
      setScanning(false);
      toast.message("Scan is taking longer than usual — check back shortly");
    }, SCAN_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [scanning]);

  const scanNow = () => {
    beginScanTracking();
    startTransition(async () => {
      await scanNowAction();
    });
  };

  const busy = pending || scanning;
  const enabledSources = settings?.enabledSources ?? DEFAULT_SOURCES;
  const scannerOn = settings?.enabled ?? false;

  const showRankingChangelog =
    !changelogDismissed &&
    !!settings?.rankingChangelog &&
    !!settings?.rankingChangelogAt &&
    nowMs - settings.rankingChangelogAt <= RANKING_CHANGELOG_MAX_AGE_MS;

  const list = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {showRankingChangelog && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:mx-6">
          <p className="flex-1 text-muted-foreground">
            {settings!.rankingChangelog}
          </p>
          <button
            type="button"
            onClick={() => setChangelogDismissed(true)}
            aria-label="Dismiss ranking update"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mx-4 mt-4 sm:mx-6">
        {radar && radar.topics.length > 0 ? (
          <TrendRadarStrip
            topics={radar.topics}
            corpusSize={radar.corpusSize}
            demo={radar.demo}
            activeTopicSlug={topicSlug}
          />
        ) : null}
      </div>

      {/* Scroll body */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {opportunities && opportunities.length > 0 && (
          <FilterChips
            value={quickFilter}
            onValueChange={setQuickFilter}
            options={QUICK_FILTERS}
          />
        )}

        <PaneEyebrow className="text-primary">
          Opportunities
          {activeTopic ? ` · ${activeTopic.label}` : ""}
          {!scanning &&
            filteredOpportunities !== undefined &&
            ` · ${filteredOpportunities.length}${quickFilter !== "all" && opportunities ? ` of ${opportunities.length}` : ""}`}
        </PaneEyebrow>

        {scanning ? (
          <FeedScanProgress
            keywords={parsedKeywords()}
            enabledSources={enabledSources}
          />
        ) : filteredOpportunities === undefined ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : rows.length === 0 ? (
          quickFilter !== "all" && (opportunities?.length ?? 0) > 0 ? (
            <OatmealEmptyState
              title="No matches for this filter"
              description='Try "All" to see every opportunity from the last scan.'
              isCompact
            />
          ) : activeTopic && (opportunities?.length ?? 0) > 0 ? (
            <OatmealEmptyState
              title={`No conversations around ${activeTopic.label}`}
              description="Clear the topic filter or scan again for fresher threads."
              isCompact
            />
          ) : settings?.lastScanError ? (
            <OatmealEmptyState
              title="Scan failed"
              description={settings.lastScanError}
              isCompact
            />
          ) : settings?.lastScanAt ? (
            <OatmealEmptyState
              title="No matching tweets"
              description="Last scan found nothing for your keywords. Try broader topics like ai, saas, startup."
              isCompact
            />
          ) : (
            <OatmealEmptyState
              title="No opportunities yet"
              description="Enable the scanner or hit Scan now to surface reply-worthy threads."
              isCompact
            />
          )
        ) : (
          <div className="space-y-3">
            {rows.map((opp) => (
              <OpportunityRow
                key={opp._id}
                opportunity={opp}
                selected={opp._id === selectedId}
                onSelect={() => selectOpportunity(opp)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const emptyDetail = (
    <div className="flex h-full items-center justify-center border-l border-border bg-canvas px-8">
      <OatmealEmptyState
        title="Select an opportunity"
        description="See the full conversation, score, and suggested angle."
        isCompact
        className="w-full max-w-sm border-0 bg-oatmeal-100/60"
      />
    </div>
  );

  return (
    <>
      <SplitPageShell
        eyebrow="Discovery"
        title="Feed scanner"
        description="Live conversation discovery across your sources. Nothing auto-posts — every reply still needs your click."
        headerActions={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <span
                className={
                  scannerOn
                    ? "size-1.5 rounded-full bg-success"
                    : "size-1.5 rounded-full bg-muted-foreground"
                }
              />
              {scanning ? "Scanning…" : scannerOn ? "Live" : "Paused"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={scanNow}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              {scanning ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Scan now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="w-full sm:w-auto"
            >
              <SlidersHorizontal />
              Sources
            </Button>
          </>
        }
      >
        <MasterDetail
          list={list}
          detail={
            selected ? (
              <OpportunityDetail
                opportunity={selected}
                onDismissed={() => setSelectedId(null)}
              />
            ) : null
          }
          emptyDetail={emptyDetail}
          hasSelection={!!selected}
          onBack={() => setSelectedId(null)}
          autoSaveId="feed-scanner"
          backLabel="Opportunities"
        />
      </SplitPageShell>

      <ScannerSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        scanning={scanning}
        onKeywordsScanBegin={beginScanTracking}
      />
    </>
  );
}
