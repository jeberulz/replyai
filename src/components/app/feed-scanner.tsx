"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Download, Loader2, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  FRESH_AGE_MS,
  HIGH_VELOCITY_THRESHOLD,
} from "../../../shared/feedFilters";
import {
  fetchOwnedListsAction,
  saveEngageListsAction,
  scanNowAction,
  updateEnabledSourcesAction,
  updateScannerAction,
  updateSearchKeywordsAction,
  updateWatchedHandlesAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { FeedScanProgress } from "@/components/app/feed-scan-progress";
import {
  OpportunityCard,
  type Opportunity,
} from "@/components/app/opportunity-card";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn, timeAgo } from "@/lib/utils";

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

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "watched", label: "Watched only" },
  { id: "fresh", label: "< 1h old" },
  { id: "velocity", label: "High velocity" },
];

export function FeedScanner() {
  const sessionToken = useSessionToken();
  const settings = useQuery(
    api.scanner.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken ? { sessionToken } : "skip"
  );
  const [draftKeywords, setDraftKeywords] = useState<string | null>(null);
  const [draftSearchKeywords, setDraftSearchKeywords] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [scanning, setScanning] = useState(false);
  const [freshNowMs, setFreshNowMs] = useState(0);
  const [pending, startTransition] = useTransition();
  const scanBaselineRef = useRef<number>(0);

  useEffect(() => {
    if (quickFilter !== "fresh") return;
    setFreshNowMs(Date.now());
    const id = window.setInterval(() => setFreshNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [quickFilter]);

  const savedKeywords = settings?.keywords.join(", ") ?? "";
  const keywords = draftKeywords ?? savedKeywords;
  const keywordsDirty = draftKeywords !== null && draftKeywords !== savedKeywords;

  const savedSearchKeywords = settings?.searchKeywords?.join(", ") ?? "";
  const searchKeywords = draftSearchKeywords ?? savedSearchKeywords;
  const searchKeywordsDirty =
    draftSearchKeywords !== null && draftSearchKeywords !== savedSearchKeywords;

  const parsedKeywords = () =>
    keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

  const parsedSearchKeywords = () =>
    searchKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return undefined;
    return opportunities.filter((opp) => {
      if (quickFilter === "watched") return opp.source === "watched";
      if (quickFilter === "fresh") {
        const now = freshNowMs || Date.now();
        return now - opp.postedAt < FRESH_AGE_MS;
      }
      if (quickFilter === "velocity") {
        return (opp.velocity ?? 0) >= HIGH_VELOCITY_THRESHOLD;
      }
      return true;
    });
  }, [opportunities, quickFilter, freshNowMs]);

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
        toast.message("Scan complete — no matching tweets in your feed right now");
      } else {
        toast.success(
          `Feed scan complete — ${settings?.lastScanCount} opportunit${settings?.lastScanCount === 1 ? "y" : "ies"} found`
        );
      }
    }
  }, [scanning, settings?.lastScanAt, settings?.lastScanError, settings?.lastScanCount]);

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
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set()
  );
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Live discovery"
        title="Feed scanner"
        description="Monitors your feed on a schedule and surfaces high-opportunity conversations before the reply window closes."
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Scanner settings</CardTitle>
              <CardDescription>
                Runs every 30 minutes when enabled
                {settings?.lastScanAt &&
                  ` · last scan ${timeAgo(settings.lastScanAt)}`}
                {typeof settings?.lastScanCount === "number" &&
                  settings.lastScanAt &&
                  ` · ${settings.lastScanCount} found`}
                {scanning && " · scanning now"}
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Topics you care about</Label>
            <div className="flex gap-2">
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
              >
                Save
              </Button>
              <Button variant="outline" onClick={scanNow} disabled={busy}>
                {scanning ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                {scanning ? "Scanning…" : "Scan now"}
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
            <div className="flex gap-2">
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
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used when the Keyword search source is on — up to 3 terms queried
              per scan via X recent search.
            </p>
          </div>

          <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            The scanner only suggests. Every reply requires your explicit click
            to send — permanently, by design. Nothing is ever auto-posted.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Sources</CardTitle>
          <CardDescription>
            Choose where the scanner looks for opportunities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SOURCE_ROWS.map((row) => (
            <div key={row.source} className="flex items-center justify-between">
              <Label htmlFor={`source-${row.source}`} className="font-normal">
                {row.label}
              </Label>
              {settings === undefined ? (
                <Skeleton className="h-5 w-9" />
              ) : (
                <Switch
                  id={`source-${row.source}`}
                  checked={enabledSources.includes(row.source)}
                  onCheckedChange={(checked) => toggleSource(row.source, checked)}
                  disabled={busy}
                />
              )}
            </div>
          ))}

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Engage lists</Label>
            {engageListNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {engageListNames.map((name, i) => (
                  <Badge key={engageListIds[i] ?? name} variant="secondary" className="gap-1 pr-1">
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
                <a href="/api/auth/login" className="underline underline-offset-2">
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
                {importing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
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
                    {ownedLists.map((list) => (
                      <label
                        key={list.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedListIds.has(list.id)}
                          onChange={() => toggleListSelection(list.id)}
                          className="size-3.5"
                        />
                        {list.name}
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={confirmListSelection} disabled={busy}>
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
                  <Badge key={handle} variant="secondary" className="gap-1 pr-1">
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
            {enabledSources.includes("watched") && watchedHandles.length === 0 && (
              <p className="text-xs text-warning">
                Add at least one account to watch.
              </p>
            )}
          </div>

          {enabledSources.includes("search") &&
            (settings?.searchKeywords?.length ?? 0) === 0 && (
              <p className="text-xs text-warning border-t border-border pt-4">
                Add discovery search terms above for keyword search to work.
              </p>
            )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
            Opportunities{" "}
            {!scanning &&
              filteredOpportunities !== undefined &&
              `(${filteredOpportunities.length}${quickFilter !== "all" && opportunities ? ` of ${opportunities.length}` : ""})`}
          </h2>
          {opportunities && opportunities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FILTERS.map((f) => (
                <Button
                  key={f.id}
                  type="button"
                  size="sm"
                  variant={quickFilter === f.id ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setQuickFilter(f.id)}
                  disabled={scanning}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {scanning ? (
          <FeedScanProgress
            keywords={parsedKeywords()}
            enabledSources={enabledSources}
          />
        ) : filteredOpportunities === undefined ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {quickFilter !== "all" && (opportunities?.length ?? 0) > 0 ? (
                <p>No opportunities match this filter. Try &ldquo;All&rdquo;.</p>
              ) : settings?.lastScanError ? (
                <p className="text-destructive">{settings.lastScanError}</p>
              ) : settings?.lastScanAt ? (
                <p>
                  Last scan found no tweets matching your keywords. Try broader
                  topics like <span className="text-foreground">ai, saas, startup</span>.
                </p>
              ) : (
                <p>
                  No opportunities surfaced yet. Enable the scanner or hit
                  &ldquo;Scan now&rdquo;.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              "space-y-4 transition-opacity duration-150",
              pending && "opacity-60"
            )}
          >
            {filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp._id}
                opportunity={{
                  ...(opp as unknown as Opportunity),
                  _id: String(opp._id),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
