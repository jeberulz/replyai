"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { runResearchAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { PageHeader } from "@/components/app/page-header";
import {
  ProfileSuggestionCard,
  type ResearchProfile,
} from "@/components/app/profile-suggestion-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const RUN_TIMEOUT_MS = 90_000;

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
  const [pending, startTransition] = useTransition();
  const toastedRunRef = useRef<string | null>(null);

  const runId = activeRunId ?? latestRun?._id;
  const runStatus = useQuery(
    api.research.runStatus,
    sessionToken && runId ? { sessionToken, runId } : "skip"
  );
  const profiles = useQuery(
    api.research.listProfiles,
    sessionToken && runId
      ? { sessionToken, runId, status: "suggested" }
      : "skip"
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not start research");
      }
    });
  };

  const busy = pending || running;
  const suggested = (profiles ?? []).filter((p) => p.status === "suggested");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Discovery"
        title="Research"
        description="Find accounts worth engaging with in your niche — suggest only, never auto-follow."
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Who should you learn from?</CardTitle>
          <CardDescription>
            Describe the kind of creators you want to find. We search recent posts,
            score profiles, and suggest who to watch.
            {remaining !== undefined && (
              <> · {remaining} run{remaining === 1 ? "" : "s"} left today</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          Suggestions{" "}
          {!running && suggested.length > 0 && `(${suggested.length})`}
        </h2>

        {running ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Searching recent posts and ranking profiles…
            </CardContent>
          </Card>
        ) : profiles === undefined ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : suggested.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {runStatus?.status === "failed" ? (
                <p className="text-destructive">{runStatus.error}</p>
              ) : runStatus?.status === "complete" ? (
                <p>No profiles matched this query. Try broader terms.</p>
              ) : (
                <p>Run a search to see suggested accounts.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          suggested.map((p) => (
            <ProfileSuggestionCard
              key={p._id}
              profile={{
                ...(p as unknown as ResearchProfile),
                _id: String(p._id),
              }}
              disabled={pending}
            />
          ))
        )}
      </div>
    </div>
  );
}
