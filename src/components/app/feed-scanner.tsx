"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Download,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  FRESH_AGE_MS,
  HIGH_VELOCITY_THRESHOLD,
} from "../../../shared/feedFilters";
import { RANKING_CHANGELOG_MAX_AGE_MS } from "../../../shared/rankingChangelog";
import {
  fetchOwnedListsAction,
  saveEngageListsAction,
  scanNowAction,
  updateEnabledSourcesAction,
  updateScannerAction,
  updateSearchKeywordsAction,
  updateWatchedHandlesAction,
  markNotificationAlertOpenedAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { FeedScanProgress } from "@/components/app/feed-scan-progress";
import { trackClient } from "@/lib/analytics/client";
import { type Opportunity } from "@/components/app/opportunity-card";
import { OpportunityRow } from "@/components/app/feed/opportunity-row";
import { OpportunityDetail } from "@/components/app/feed/opportunity-detail";
import { TrendRadarStrip } from "@/components/app/feed/trend-radar-strip";
import { MasterDetail } from "@/components/app/split/master-detail";
import { SplitPageShell } from "@/components/app/split/split-page-shell";
import {
  FilterChips,
  PaneEyebrow,
} from "@/components/app/split/pane-chrome";
import { OatmealEmptyState } from "@/components/app/oatmeal-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { timeAgo } from "@/lib/utils";
import { opportunityMatchesTopic } from "../../../shared/trends";

const SCAN_TIMEOUT_MS = 45_000;

type EnabledSource = "following" | "lists" | "watched" | "search";

const DEFAULT_SOURCES: EnabledSource[] = ["following"];
const MAX_ENGAGE_LISTS = 5;

const SOURCE_ROWS: { source: EnabledSource; label: string }[] = [
  { source: "following", label: "Following timeline" },
  { source: "lists", label: "Engage lists" },
  { source: "watched", label: "Watched accounts" },
  { source: "search", label: "Keyword search" },
];

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
  const [draftKeywords, setDraftKeywords] = useState<string | null>(null);
  const [draftSearchKeywords, setDraftSearchKeywords] = useState<string | null>(
    null
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

  const savedKeywords = settings?.keywords.join(", ") ?? "";
  const keywords = draftKeywords ?? savedKeywords;
  const keywordsDirty = draftKeywords !== null && draftKeywords !== savedKeywords;

  const savedSearchKeywords = settings?.searchKeywords?.join(", ") ?? "";
  const searchKeywords = draftSearchKeywords ?? savedSearchKeywords;
  const searchKeywordsDirty =
    draftSearchKeywords !== null && draftSearchKeywords !== savedSearchKeywords;

  const parsedKeywords = () =>
    keywords.split(",").map((k) => k.trim()).filter(Boolean);
  const parsedSearchKeywords = () =>
    searchKeywords.split(",").map((k) => k.trim()).filter(Boolean);

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

  const setEnabled = (enabled: boolean) => {
    startTransition(async () => {
      await updateScannerAction({ enabled, keywords: parsedKeywords() });
      toast.success(enabled ? "Feed scanner enabled" : "Feed scanner paused");
    });
  };

  const saveKeywords = () => {
    beginScanTracking();
    startTransition(async () => {
      await updateScannerAction({
        enabled: settings?.enabled ?? true,
        keywords: parsedKeywords(),
      });
      setDraftKeywords(null);
    });
  };

  const saveSearchKeywords = () => {
    startTransition(async () => {
      await updateSearchKeywordsAction(parsedSearchKeywords());
      setDraftSearchKeywords(null);
      toast.success("Discovery search terms saved");
    });
  };

  const scanNow = () => {
    beginScanTracking();
    startTransition(async () => {
      await scanNowAction();
    });
  };

  const busy = pending || scanning;

  const enabledSources = settings?.enabledSources ?? DEFAULT_SOURCES;
  const engageListIds = settings?.engageListIds ?? [];
  const engageListNames = settings?.engageListNames ?? [];
  const watchedHandles = settings?.watchedHandles ?? [];

  const toggleSource = (source: EnabledSource, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...enabledSources, source]))
      : enabledSources.filter((s) => s !== source);
    startTransition(async () => {
      await updateEnabledSourcesAction(next);
    });
  };

  const [ownedLists, setOwnedLists] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const openImport = () => {
    setImporting(true);
    startTransition(async () => {
      const result = await fetchOwnedListsAction();
      setImporting(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOwnedLists(result.lists);
      setSelectedListIds(new Set(engageListIds));
    });
  };

  const toggleListSelection = (id: string) => {
    setSelectedListIds((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      if (prev.size >= MAX_ENGAGE_LISTS) {
        toast.message(`You can import up to ${MAX_ENGAGE_LISTS} lists`);
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const confirmListSelection = () => {
    const lists = (ownedLists ?? []).filter((l) => selectedListIds.has(l.id));
    startTransition(async () => {
      await saveEngageListsAction(lists);
      toast.success("Engage lists updated");
      setOwnedLists(null);
    });
  };

  const removeSavedList = (id: string) => {
    const lists = engageListIds
      .map((listId, i) => ({ id: listId, name: engageListNames[i] ?? listId }))
      .filter((l) => l.id !== id);
    startTransition(async () => {
      await saveEngageListsAction(lists);
    });
  };

  const [handleDraft, setHandleDraft] = useState("");

  const addHandle = () => {
    const handle = handleDraft.trim().replace(/^@/, "");
    if (!handle) return;
    const exists = watchedHandles.some(
      (h) => h.toLowerCase() === handle.toLowerCase()
    );
    const next = exists ? watchedHandles : [...watchedHandles, handle];
    startTransition(async () => {
      await updateWatchedHandlesAction(next);
    });
    setHandleDraft("");
  };

  const removeHandle = (handle: string) => {
    const next = watchedHandles.filter((h) => h !== handle);
    startTransition(async () => {
      await updateWatchedHandlesAction(next);
    });
  };

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

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sources &amp; settings</DialogTitle>
            <DialogDescription>
              Runs every 30 minutes when enabled
              {settings?.lastScanAt &&
                ` · last scan ${timeAgo(settings.lastScanAt)}`}
              {scanning && " · scanning now"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Scanner enabled</Label>
              {settings === undefined ? (
                <Skeleton className="h-5 w-9" />
              ) : (
                <Switch
                  checked={settings?.enabled ?? false}
                  onCheckedChange={setEnabled}
                  disabled={busy}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Topics you care about</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="keywords"
                  value={keywords}
                  placeholder="ai, startup, product, design"
                  onChange={(e) => setDraftKeywords(e.target.value)}
                  disabled={scanning}
                />
                <Button
                  variant="outline"
                  onClick={saveKeywords}
                  disabled={busy || !keywordsDirty}
                  className="w-full sm:w-auto"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Comma-separated filter keywords. Following-timeline tweets must
                match at least one — list, watched, and search sources use their
                own discovery rules.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-keywords">Discovery search terms</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="search-keywords"
                  value={searchKeywords}
                  placeholder="ai agents, startup growth"
                  onChange={(e) => setDraftSearchKeywords(e.target.value)}
                  disabled={scanning}
                />
                <Button
                  variant="outline"
                  onClick={saveSearchKeywords}
                  disabled={busy || !searchKeywordsDirty}
                  className="w-full sm:w-auto"
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used when the Keyword search source is on — up to 3 terms queried
                per scan via X recent search.
              </p>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <Label>Sources</Label>
              {SOURCE_ROWS.map((row) => (
                <div
                  key={row.source}
                  className="flex items-center justify-between"
                >
                  <Label htmlFor={`source-${row.source}`} className="font-normal">
                    {row.label}
                  </Label>
                  {settings === undefined ? (
                    <Skeleton className="h-5 w-9" />
                  ) : (
                    <Switch
                      id={`source-${row.source}`}
                      data-testid={`source-switch-${row.source}`}
                      checked={enabledSources.includes(row.source)}
                      onCheckedChange={(checked) =>
                        toggleSource(row.source, checked)
                      }
                      disabled={busy}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Engage lists</Label>
              {engageListNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {engageListNames.map((name, i) => (
                    <Badge
                      key={engageListIds[i] ?? name}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeSavedList(engageListIds[i])}
                        disabled={busy}
                        aria-label={`Remove ${name}`}
                        className="rounded-full p-0.5 hover:bg-background/60"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {enabledSources.includes("lists") && engageListIds.length === 0 && (
                <p className="text-xs text-warning">
                  Import at least one list for this source to work.
                </p>
              )}
              {settings?.needsListScope ? (
                <p className="text-xs text-muted-foreground">
                  <a
                    href="/api/auth/login"
                    className="underline underline-offset-2"
                  >
                    Reconnect your X account
                  </a>{" "}
                  to import lists.
                </p>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openImport}
                  disabled={importing || busy}
                >
                  {importing ? <Loader2 className="animate-spin" /> : <Download />}
                  Import from X
                </Button>
              )}
              {ownedLists !== null && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Up to 5 lists.</p>
                  {ownedLists.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No lists found on your X account.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {ownedLists.map((listItem) => (
                        <label
                          key={listItem.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedListIds.has(listItem.id)}
                            onChange={() => toggleListSelection(listItem.id)}
                            className="size-3.5"
                          />
                          {listItem.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={confirmListSelection}
                      disabled={busy}
                    >
                      Save selection
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOwnedLists(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label htmlFor="watched-handle">Watched accounts</Label>
              {watchedHandles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {watchedHandles.map((handle) => (
                    <Badge
                      key={handle}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      @{handle}
                      <button
                        type="button"
                        onClick={() => removeHandle(handle)}
                        disabled={busy}
                        aria-label={`Remove @${handle}`}
                        className="rounded-full p-0.5 hover:bg-background/60"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="watched-handle"
                  value={handleDraft}
                  placeholder="@handle"
                  onChange={(e) => setHandleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHandle();
                    }
                  }}
                  disabled={busy}
                />
                <Button
                  variant="outline"
                  onClick={addHandle}
                  disabled={busy || !handleDraft.trim()}
                >
                  <Plus />
                  Add
                </Button>
              </div>
              {enabledSources.includes("watched") &&
                watchedHandles.length === 0 && (
                  <p className="text-xs text-warning">
                    Add at least one account to watch.
                  </p>
                )}
            </div>

            <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              The scanner only suggests. Every reply requires your explicit click
              to send — permanently, by design. Nothing is ever auto-posted.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
