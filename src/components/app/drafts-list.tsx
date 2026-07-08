"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { MasterDetail } from "@/components/app/split/master-detail";
import { FilterChips } from "@/components/app/split/pane-chrome";
import { Skeleton } from "@/components/ui/skeleton";
import { DraftRow, type Draft } from "@/components/app/drafts/draft-row";
import { DraftDetail } from "@/components/app/drafts/draft-detail";

type StatusFilter = "all" | "scheduled" | "published" | "failed";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

/** Drafts & published queue — split list + detail. Live status via Convex. */
export function DraftsList() {
  const sessionToken = useSessionToken();
  const drafts = useQuery(
    api.drafts.list,
    sessionToken ? { sessionToken } : "skip"
  );
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows: Draft[] = useMemo(
    () =>
      (drafts ?? []).map((d) => ({
        ...(d as unknown as Draft),
        _id: String(d._id),
      })),
    [drafts]
  );

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((d) => d.status === filter)),
    [rows, filter]
  );

  const selected = rows.find((d) => d._id === selectedId) ?? null;

  const list = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-4">
        <h2 className="text-[15px] font-semibold">Drafts &amp; published</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {drafts === undefined ? "" : `${drafts.length} items`}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <FilterChips
          value={filter}
          onValueChange={setFilter}
          options={STATUS_FILTERS}
        />
        <p className="text-xs text-muted-foreground">
          Scheduled posts publish automatically; statuses update live.
        </p>

        {drafts === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nothing here yet. Save or publish an option from an analysis."
              : "No drafts match this filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((draft) => (
              <DraftRow
                key={draft._id}
                draft={draft}
                selected={draft._id === selectedId}
                onSelect={() => setSelectedId(draft._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const emptyDetail = (
    <div className="flex h-full items-center justify-center border-l border-border bg-canvas px-8 text-center text-sm text-muted-foreground">
      Select a draft to see its content, status, and publishing options.
    </div>
  );

  return (
    <div className="-mx-4 h-[calc(100dvh-3rem)] overflow-hidden md:-mx-10 md:h-[calc(100dvh-4rem)]">
      <MasterDetail
        list={list}
        detail={
          selected ? (
            <DraftDetail
              key={selected._id}
              draft={selected}
              onDeleted={() => setSelectedId(null)}
            />
          ) : null
        }
        emptyDetail={emptyDetail}
        hasSelection={!!selected}
        onBack={() => setSelectedId(null)}
        autoSaveId="drafts-queue"
        backLabel="Drafts"
      />
    </div>
  );
}
