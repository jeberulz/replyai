"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runResearchAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { ProfileDetail } from "@/components/app/research/profile-detail";
import {
  ProfileRow,
  type ResearchProfile,
} from "@/components/app/research/profile-row";
import { MasterDetail } from "@/components/app/split/master-detail";
import { FilterChips, PaneEyebrow } from "@/components/app/split/pane-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const RUN_TIMEOUT_MS = 90_000;

type StatusFilter = "suggested" | "watching";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "watching", label: "Watching" },
];

/** Research tab — split list + detail, matching the drafts/feed layout. */
export function ResearchAgent() {
  const sessionToken = useSessionToken();
  const remaining = useQuery(
    api.research.remainingRunsToday,
    sessionToken ? { sessionToken } : "skip"
  );
  const latestRun = useQuery(
    api.research.latestRun,
    sessionToken ? { sessionToken } : "skip"
  );

  const [query, setQuery] = useState("");
  const [seedHandle, setSeedHandle] = useState("");
  const [activeRunId, setActiveRunId] = useState<Id<"researchRuns"> | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("suggested");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toastedRunRef = useRef<string | null>(null);

  const runId = activeRunId ?? latestRun?._id;
  const runStatus = useQuery(
    api.research.runStatus,
    sessionToken && runId ? { sessionToken, runId } : "skip"
  );
  const profiles = useQuery(
    api.research.listProfiles,
    sessionToken && runId ? { sessionToken, runId } : "skip"
  );

  const running = runStatus?.status === "running";

  useEffect(() => {
    if (!runStatus || runStatus.status === "running") return;
    const key = String(runStatus._id);
    if (toastedRunRef.current === key) return;
    toastedRunRef.current = key;
    if (runStatus.status === "complete") {
      toast.success(`Found ${runStatus.resultCount} profiles worth a look`);
    } else if (runStatus.status === "failed") {
      toast.error(runStatus.error ?? "Research run failed");
    }
  }, [runStatus]);

  useEffect(() => {
    if (!running) return;
    const timeout = window.setTimeout(() => {
      toast.message("Research is taking longer than usual — check back shortly");
    }, RUN_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [running]);

  const submit = () => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      toast.error("Describe who you want to find in a few words");
      return;
    }
    startTransition(async () => {
      try {
        const newRunId = await runResearchAction({
          query: trimmed,
          seedHandle: seedHandle.trim() || undefined,
        });
        setActiveRunId(newRunId as Id<"researchRuns">);
        setSelectedId(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not start research");
      }
    });
  };

  const busy = pending || running;

  const rows: ResearchProfile[] = useMemo(
    () =>
      (profiles ?? [])
        .map((p) => ({
          ...(p as unknown as ResearchProfile),
          _id: String(p._id),
        }))
        .filter((p) => p.status !== "passed"),
    [profiles]
  );

  const filtered = rows.filter((p) => p.status === filter);
  const selected = rows.find((p) => p._id === selectedId) ?? null;
  const suggestedCount = rows.filter((p) => p.status === "suggested").length;

  const list = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold">Research</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {remaining === undefined
            ? ""
            : `${remaining} run${remaining === 1 ? "" : "s"} left today`}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <PaneEyebrow>New search</PaneEyebrow>
            <p className="text-xs text-muted-foreground">
              Find accounts worth engaging with in your niche — suggest only,
              never auto-follow.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="research-query">Search query</Label>
            <Input
              id="research-query"
              placeholder="AI founders sharing shipping stories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seed-handle">Seed account (optional)</Label>
            <Input
              id="seed-handle"
              placeholder="@handle"
              value={seedHandle}
              onChange={(e) => setSeedHandle(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              We also expand from your watched accounts and recent analysis topics.
            </p>
          </div>
          <Button onClick={submit} disabled={busy || remaining === 0}>
            {busy ? <Loader2 className="animate-spin" /> : <Search />}
            {busy ? "Researching…" : "Run research"}
          </Button>
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterChips
              value={filter}
              onValueChange={setFilter}
              options={STATUS_FILTERS}
            />
            {!running && suggestedCount > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {suggestedCount} suggested
              </span>
            )}
          </div>

          {running ? (
            <div className="flex items-center gap-3 rounded-xl border border-border py-10 pl-5 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Searching recent posts and ranking profiles…
            </div>
          ) : profiles === undefined && runId ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {runStatus?.status === "failed" ? (
                <p className="text-destructive">{runStatus.error}</p>
              ) : filter === "watching" ? (
                <p>No watched accounts from this run yet.</p>
              ) : runStatus?.status === "complete" ? (
                <p>No profiles matched this query. Try broader terms.</p>
              ) : (
                <p>Run a search to see suggested accounts.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((profile) => (
                <ProfileRow
                  key={profile._id}
                  profile={profile}
                  selected={profile._id === selectedId}
                  onSelect={() => setSelectedId(profile._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const emptyDetail = (
    <div className="flex h-full items-center justify-center border-l border-border bg-canvas px-8 text-center text-sm text-muted-foreground">
      Select a profile to see why it&apos;s worth watching.
    </div>
  );

  return (
    <div className="-mx-4 h-[calc(100dvh-3rem)] overflow-hidden md:-mx-10 md:h-[calc(100dvh-4rem)]">
      <MasterDetail
        list={list}
        detail={
          selected ? (
            <ProfileDetail
              key={selected._id}
              profile={selected}
              onPassed={() => setSelectedId(null)}
            />
          ) : null
        }
        emptyDetail={emptyDetail}
        hasSelection={!!selected}
        onBack={() => setSelectedId(null)}
        autoSaveId="research-agent"
        backLabel="Research"
      />
    </div>
  );
}
