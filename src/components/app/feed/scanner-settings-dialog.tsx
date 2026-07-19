"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Download, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import {
  fetchOwnedListsAction,
  saveEngageListsAction,
  updateEnabledSourcesAction,
  updateScannerAction,
  updateSearchKeywordsAction,
  updateWatchedHandlesAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, timeAgo } from "@/lib/utils";
import { rpType } from "@/theme/typography";

type EnabledSource = "following" | "lists" | "watched" | "search";

const DEFAULT_SOURCES: EnabledSource[] = ["following"];
const MAX_ENGAGE_LISTS = 5;

const SOURCE_ROWS: {
  source: EnabledSource;
  label: string;
  description: string;
}[] = [
  {
    source: "following",
    label: "Following timeline",
    description: "Home timeline tweets that match your topics.",
  },
  {
    source: "lists",
    label: "Engage lists",
    description: "Posts from X lists you import here.",
  },
  {
    source: "watched",
    label: "Watched accounts",
    description: "Activity from handles you pin.",
  },
  {
    source: "search",
    label: "Keyword search",
    description: "X recent search using discovery terms.",
  },
];

function RemovableChip({
  label,
  onRemove,
  disabled,
  removeLabel,
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
  removeLabel: string;
}) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 pl-2.5 pr-0.5">
      <span className={rpType.sm}>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={removeLabel}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>
    </Badge>
  );
}

export function ScannerSettingsDialog({
  open,
  onOpenChange,
  scanning,
  onKeywordsScanBegin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanning: boolean;
  onKeywordsScanBegin: () => void;
}) {
  const sessionToken = useSessionToken();
  const settings = useQuery(
    api.scanner.settings,
    sessionToken ? { sessionToken } : "skip"
  );
  const [pending, startTransition] = useTransition();
  const busy = pending || scanning;

  const [draftKeywords, setDraftKeywords] = useState<string | null>(null);
  const [draftSearchKeywords, setDraftSearchKeywords] = useState<string | null>(
    null
  );
  const [ownedLists, setOwnedLists] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(
    new Set()
  );
  const [importing, setImporting] = useState(false);
  const [handleDraft, setHandleDraft] = useState("");

  const savedKeywords = settings?.keywords.join(", ") ?? "";
  const keywords = draftKeywords ?? savedKeywords;
  const keywordsDirty =
    draftKeywords !== null && draftKeywords !== savedKeywords;

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

  const enabledSources = settings?.enabledSources ?? DEFAULT_SOURCES;
  const engageListIds = settings?.engageListIds ?? [];
  const engageListNames = settings?.engageListNames ?? [];
  const watchedHandles = settings?.watchedHandles ?? [];

  const setEnabled = (enabled: boolean) => {
    startTransition(async () => {
      await updateScannerAction({ enabled, keywords: parsedKeywords() });
      toast.success(enabled ? "Feed scanner enabled" : "Feed scanner paused");
    });
  };

  const saveKeywords = () => {
    onKeywordsScanBegin();
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

  const toggleSource = (source: EnabledSource, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...enabledSources, source]))
      : enabledSources.filter((s) => s !== source);
    startTransition(async () => {
      await updateEnabledSourcesAction(next);
    });
  };

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

  const statusLine = [
    "Runs every 30 minutes when enabled",
    settings?.lastScanAt ? `last scan ${timeAgo(settings.lastScanAt)}` : null,
    scanning ? "scanning now" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-6 pb-4 pt-6 pr-12">
          <p className={cn(rpType.xsUpper, "text-primary")}>Scanner</p>
          <DialogTitle className={cn(rpType.titleSerif, "text-foreground")}>
            Sources &amp; settings
          </DialogTitle>
          <DialogDescription className={cn(rpType.sm, "text-muted-foreground")}>
            {statusLine}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="sources"
          className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4"
        >
          <TabsList className="grid h-10 w-full shrink-0 grid-cols-3 rounded-md bg-muted p-1 shadow-none">
            <TabsTrigger
              value="sources"
              className="rounded-sm shadow-none data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              Sources
            </TabsTrigger>
            <TabsTrigger
              value="topics"
              className="rounded-sm shadow-none data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              Topics
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="rounded-sm shadow-none data-[state=active]:bg-card data-[state=active]:shadow-none"
            >
              Accounts
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pt-4">
            <TabsContent value="sources" className="mt-0 space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/40 px-3 py-3">
                <div className="min-w-0 space-y-0.5">
                  <Label className={cn(rpType.smMedium, "text-foreground")}>
                    Scanner enabled
                  </Label>
                  <p className={cn(rpType.xs, "text-muted-foreground")}>
                    Pause discovery without losing your sources.
                  </p>
                </div>
                {settings === undefined ? (
                  <Skeleton className="h-5 w-9 shrink-0" />
                ) : (
                  <Switch
                    checked={settings?.enabled ?? false}
                    onCheckedChange={setEnabled}
                    disabled={busy}
                    aria-label="Scanner enabled"
                  />
                )}
              </div>

              <div className="space-y-2">
                <p className={cn(rpType.xsUpper, "text-muted-foreground")}>
                  Active sources
                </p>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {SOURCE_ROWS.map((row) => (
                    <li
                      key={row.source}
                      className="flex items-center justify-between gap-3 px-3 py-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <Label
                          htmlFor={`source-${row.source}`}
                          className={cn(rpType.smMedium, "text-foreground")}
                        >
                          {row.label}
                        </Label>
                        <p className={cn(rpType.xs, "text-muted-foreground")}>
                          {row.description}
                        </p>
                      </div>
                      {settings === undefined ? (
                        <Skeleton className="h-5 w-9 shrink-0" />
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
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="topics" className="mt-0 space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="keywords"
                  className={cn(rpType.smMedium, "text-foreground")}
                >
                  Topics you care about
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="keywords"
                    value={keywords}
                    placeholder="ai, startup, product, design"
                    onChange={(e) => setDraftKeywords(e.target.value)}
                    disabled={scanning}
                    className="shadow-none"
                  />
                  <Button
                    variant={keywordsDirty ? "default" : "outline"}
                    onClick={saveKeywords}
                    disabled={busy || !keywordsDirty}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    Save topics
                  </Button>
                </div>
                <p className={cn(rpType.xs, "text-muted-foreground")}>
                  Comma-separated. Following-timeline tweets must match at least
                  one — list, watched, and search use their own rules.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="search-keywords"
                  className={cn(rpType.smMedium, "text-foreground")}
                >
                  Discovery search terms
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="search-keywords"
                    value={searchKeywords}
                    placeholder="ai agents, startup growth"
                    onChange={(e) => setDraftSearchKeywords(e.target.value)}
                    disabled={scanning}
                    className="shadow-none"
                  />
                  <Button
                    variant={searchKeywordsDirty ? "default" : "outline"}
                    onClick={saveSearchKeywords}
                    disabled={busy || !searchKeywordsDirty}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    Save search
                  </Button>
                </div>
                <p className={cn(rpType.xs, "text-muted-foreground")}>
                  Used when Keyword search is on — up to 3 terms per scan via X
                  recent search.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="mt-0 space-y-6">
              <div className="space-y-2">
                <p className={cn(rpType.smMedium, "text-foreground")}>
                  Engage lists
                </p>
                {engageListNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {engageListNames.map((name, i) => (
                      <RemovableChip
                        key={engageListIds[i] ?? name}
                        label={name}
                        onRemove={() => {
                          const id = engageListIds[i];
                          if (id) removeSavedList(id);
                        }}
                        disabled={busy}
                        removeLabel={`Remove ${name}`}
                      />
                    ))}
                  </div>
                )}
                {enabledSources.includes("lists") &&
                  engageListIds.length === 0 && (
                    <p className={cn(rpType.xs, "text-warning")}>
                      Import at least one list for this source to work.
                    </p>
                  )}
                {settings?.needsListScope ? (
                  <p className={cn(rpType.xs, "text-muted-foreground")}>
                    <a
                      href="/api/auth/login"
                      className="text-foreground underline underline-offset-2"
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
                    className="h-10"
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
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <p className={cn(rpType.xs, "text-muted-foreground")}>
                      Up to {MAX_ENGAGE_LISTS} lists.
                    </p>
                    {ownedLists.length === 0 ? (
                      <p className={cn(rpType.xs, "text-muted-foreground")}>
                        No lists found on your X account.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {ownedLists.map((listItem) => (
                          <label
                            key={listItem.id}
                            className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-1 text-sm text-foreground hover:bg-accent/60"
                          >
                            <input
                              type="checkbox"
                              checked={selectedListIds.has(listItem.id)}
                              onChange={() =>
                                toggleListSelection(listItem.id)
                              }
                              className="size-4 accent-[var(--primary)]"
                            />
                            {listItem.name}
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={confirmListSelection}
                        disabled={busy}
                        className="h-10"
                      >
                        Save selection
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOwnedLists(null)}
                        className="h-10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-5">
                <Label
                  htmlFor="watched-handle"
                  className={cn(rpType.smMedium, "text-foreground")}
                >
                  Watched accounts
                </Label>
                {watchedHandles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {watchedHandles.map((handle) => (
                      <RemovableChip
                        key={handle}
                        label={`@${handle}`}
                        onRemove={() => removeHandle(handle)}
                        disabled={busy}
                        removeLabel={`Remove @${handle}`}
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
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
                    className="shadow-none"
                  />
                  <Button
                    variant={handleDraft.trim() ? "default" : "outline"}
                    onClick={addHandle}
                    disabled={busy || !handleDraft.trim()}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
                {enabledSources.includes("watched") &&
                  watchedHandles.length === 0 && (
                    <p className={cn(rpType.xs, "text-warning")}>
                      Add at least one account to watch.
                    </p>
                  )}
              </div>
            </TabsContent>
          </div>

          <p
            className={cn(
              rpType.xs,
              "mt-4 flex shrink-0 items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground"
            )}
          >
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
            The scanner only suggests. Every reply requires your explicit click
            to send — permanently, by design. Nothing is ever auto-posted.
          </p>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
