"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runResearchAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { OatmealEmptyState } from "@/components/app/oatmeal-empty-state";
import { ProfileDetail } from "@/components/app/research/profile-detail";
import {
  ProfileRow,
  type ResearchProfile,
} from "@/components/app/research/profile-row";
import { MasterDetail } from "@/components/app/split/master-detail";
import { SplitPageShell } from "@/components/app/split/split-page-shell";
import { FilterChips, PaneEyebrow } from "@/components/app/split/pane-chrome";
import { Button } from "@/components/ds/button";
import { Skeleton } from "@/components/ds/skeleton";
import { Spinner } from "@/components/ds/spinner";
import { TextInput } from "@/components/ds/text-input";
import { Text } from "@/components/ds/text";
import { cn, timeAgo } from "@/lib/utils";
import { rpType } from "@/theme/typography";

const RUN_TIMEOUT_MS = 90_000;

type StatusFilter = "suggested" | "watching";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "watching", label: "Watching" },
];

type CuratorState =
  | typeof undefined
  | {
      locked: boolean;
      run: {
        status: "running" | "complete" | "failed";
        newSuggestionCount: number;
        prunedCount: number;
        error?: string;
        createdAt: number;
      } | null;
    };

/** Monthly curator status strip — plain-language, no fake scores. */
function CuratorStrip({ curator }: { curator: CuratorState }) {
  if (curator === undefined) return null;

  const shell =
    "rounded-xl border border-border bg-muted/40 px-4 py-3 sm:px-5";

  if (curator.locked) {
    return (
      <div className={shell}>
        <PaneEyebrow>Monthly curator</PaneEyebrow>
        <Text size="sm" className="mt-1 text-muted-foreground">
          Auto-refreshes your watchlist every month — prunes quiet accounts and
          suggests replacements. Available on the Pro plan.
        </Text>
      </div>
    );
  }

  const run = curator.run;

  if (!run) {
    return (
      <div className={shell}>
        <PaneEyebrow>Monthly curator</PaneEyebrow>
        <Text size="sm" className="mt-1 text-muted-foreground">
          Your first monthly refresh runs on the 1st — it prunes quiet accounts
          and suggests replacements for you to review.
        </Text>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-2">
        <PaneEyebrow>Monthly curator</PaneEyebrow>
        {run.status === "complete" && (
          <Text size="sm" className="tabular-nums text-muted-foreground">
            {timeAgo(run.createdAt)}
          </Text>
        )}
      </div>
      {run.status === "running" ? (
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Refreshing your watchlist…
        </div>
      ) : run.status === "failed" ? (
        <Text size="sm" className="mt-1 text-muted-foreground">
          Last refresh didn&apos;t finish{run.error ? ` — ${run.error}` : "."}
        </Text>
      ) : (
        <Text size="sm" className="mt-1 tabular-nums text-muted-foreground">
          {run.prunedCount} quiet {run.prunedCount === 1 ? "account" : "accounts"}{" "}
          pruned · {run.newSuggestionCount} new{" "}
          {run.newSuggestionCount === 1 ? "suggestion" : "suggestions"}
        </Text>
      )}
    </div>
  );
}

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
  const curator = useQuery(
    api.research.latestCuratorRun,
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
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <CuratorStrip curator={curator} />

        <div className="space-y-4">
          <div className="space-y-1">
            <PaneEyebrow>New search</PaneEyebrow>
            <Text size="sm" className="text-muted-foreground">
              Find accounts worth engaging with in your niche — suggest only,
              never auto-follow.
            </Text>
          </div>
          <TextInput
            label="Search query"
            value={query}
            onChange={setQuery}
            placeholder="AI founders sharing shipping stories"
            isDisabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="space-y-1">
            <TextInput
              label="Seed account (optional)"
              value={seedHandle}
              onChange={setSeedHandle}
              placeholder="@handle"
              isDisabled={busy}
            />
            <Text size="sm" className="text-muted-foreground">
              We also expand from your watched accounts and recent analysis topics.
            </Text>
          </div>
          <Button
            label={busy ? "Researching…" : "Run research"}
            icon={
              busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )
            }
            onClick={submit}
            isDisabled={busy || remaining === 0}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterChips
              value={filter}
              onValueChange={setFilter}
              options={STATUS_FILTERS}
            />
            {!running && suggestedCount > 0 && (
              <Text size="sm" className="tabular-nums text-muted-foreground">
                {suggestedCount} suggested
              </Text>
            )}
          </div>

          {running ? (
            <div
              className="flex items-center gap-3 rounded-xl border border-border py-10 pl-5 text-sm text-muted-foreground"
              aria-busy="true"
            >
              <Spinner size="md" />
              Searching recent posts and ranking profiles…
            </div>
          ) : profiles === undefined && runId ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton height={96} radius={3} index={0} />
              <Skeleton height={96} radius={3} index={1} />
            </div>
          ) : filtered.length === 0 ? (
            runStatus?.status === "failed" ? (
              <OatmealEmptyState
                title="Research failed"
                description={runStatus.error ?? "Something went wrong. Try again."}
                isCompact
              />
            ) : filter === "watching" ? (
              <OatmealEmptyState
                title="No watched accounts"
                description="No watched accounts from this run yet."
                isCompact
              />
            ) : runStatus?.status === "complete" ? (
              <OatmealEmptyState
                title="No profiles matched"
                description="Try broader terms in your search query."
                isCompact
              />
            ) : (
              <OatmealEmptyState
                title="Run a search"
                description="Suggested accounts appear here after research completes."
                isCompact
              />
            )
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
    <div className="flex h-full items-center justify-center border-l border-border bg-canvas px-8">
      <OatmealEmptyState
        title="Select a profile"
        description="See why it's worth watching and sample recent posts."
        isCompact
        className="max-w-sm border-0 bg-transparent"
      />
    </div>
  );

  return (
    <SplitPageShell
      eyebrow="Account discovery"
      title="Research"
      description="Find accounts worth engaging with in your niche — suggest only, never auto-follow."
      headerActions={
        remaining === undefined ? null : (
          <Text
            type="supporting"
            color="secondary"
            display="block"
            className={cn(rpType.sm, "tabular-nums text-muted-foreground")}
          >
            {remaining} run{remaining === 1 ? "" : "s"} left today
          </Text>
        )
      }
    >
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
    </SplitPageShell>
  );
}
