"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Radar,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { deleteDraftAction, retryDraftAsStandaloneAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { PageHeader } from "@/components/app/page-header";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, timeAgo } from "@/lib/utils";
import { buildXIntentUrl } from "../../../shared/xPublish";

function draftKindLabel(draft: {
  kind: "reply" | "quote";
  publishMode?: "threaded" | "standalone" | "url_quote";
}): string {
  if (draft.publishMode === "standalone") return "Standalone tweet";
  if (draft.publishMode === "url_quote") return "Quote (link card)";
  return draft.kind === "quote" ? "Quote tweet" : "Reply";
}

function formatDuration(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </div>
        {value === null ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <div className="mt-2 font-mono text-[1.75rem] leading-none tabular-nums text-foreground">
            {value}
          </div>
        )}
        {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

const draftStatusMeta = {
  draft: { icon: FileText, label: "Draft", variant: "secondary" as const },
  scheduled: { icon: Clock, label: "Scheduled", variant: "warning" as const },
  published: { icon: CheckCircle2, label: "Published", variant: "success" as const },
  failed: { icon: XCircle, label: "Failed", variant: "destructive" as const },
};

export function Dashboard({ displayName }: { displayName: string }) {
  const sessionToken = useSessionToken();
  const stats = useQuery(api.usage.stats, sessionToken ? { sessionToken } : "skip");
  const analyses = useQuery(
    api.analyses.listRecent,
    sessionToken ? { sessionToken, limit: 5 } : "skip"
  );
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken ? { sessionToken, limit: 4 } : "skip"
  );
  const drafts = useQuery(api.drafts.list, sessionToken ? { sessionToken } : "skip");
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Your reply desk"
        title={`Welcome back, ${displayName.split(" ")[0]}`}
        description="Here's what's worth replying to right now."
      >
        <Button asChild>
          <Link href="/analyze">
            <Search /> Analyze a tweet
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Used with no edits"
          value={
            stats ? (stats.noEditRate === null ? "—" : `${stats.noEditRate}%`) : null
          }
          hint="North-star: replies good enough to send as-is"
        />
        <StatCard
          label="Time to publish"
          value={
            stats
              ? stats.medianSecondsToPublish === null
                ? "—"
                : formatDuration(stats.medianSecondsToPublish)
              : null
          }
          hint="Median, draft → send"
        />
        <StatCard label="Published" value={stats ? stats.published : null} />
        <StatCard
          label="Analyses this month"
          value={stats ? stats.analyses : null}
        />
        <StatCard
          label="Options generated"
          value={stats ? stats.generations : null}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trending conversations from the feed scanner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Trending conversations</CardTitle>
                <CardDescription>
                  High-opportunity tweets from your feed scanner
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/feed">
                  All <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities === undefined ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : opportunities.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Radar className="size-6" />
                No opportunities yet. Enable the feed scanner to surface them.
                <Button variant="outline" size="sm" asChild>
                  <Link href="/feed">Open feed scanner</Link>
                </Button>
              </div>
            ) : (
              opportunities.map((opp) => (
                <Link
                  key={opp._id}
                  href={`/analyze?url=${encodeURIComponent(opp.tweetUrl)}`}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                >
                  <ScoreBadge value={opp.score} reason={opp.reason} />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm">{opp.text}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      @{opp.authorHandle} · {formatCount(opp.authorFollowers)}{" "}
                      followers · {timeAgo(opp.postedAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent analyses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent analyses</CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyses === undefined ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : analyses.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No analyses yet.{" "}
                <Link href="/analyze" className="text-primary hover:underline">
                  Paste your first tweet URL
                </Link>
                .
              </div>
            ) : (
              analyses.map((analysis) => (
                <Link
                  key={analysis._id}
                  href={`/analysis/${analysis._id}`}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/40"
                >
                  <ScoreBadge
                    value={analysis.score.value}
                    reason={analysis.score.reason}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm">
                      @{analysis.tweet.authorHandle}: {analysis.tweet.text}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {analysis.topic} · {timeAgo(analysis.createdAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drafts & published — live status via Convex reactivity */}
      <Card>
        <CardHeader>
          <CardTitle>Drafts &amp; published</CardTitle>
          <CardDescription>
            Scheduled posts publish automatically; statuses update live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drafts === undefined ? (
            <Skeleton className="h-16 w-full" />
          ) : drafts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing here yet. Save or publish an option from a results page.
            </p>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft) => {
                const meta = draftStatusMeta[draft.status];
                return (
                  <div
                    key={draft._id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Badge variant={meta.variant} className="shrink-0">
                      <meta.icon className="size-3" />
                      {meta.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-sm">{draft.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {draftKindLabel(draft)} ·{" "}
                        {draft.status === "scheduled" && draft.scheduledFor
                          ? `publishes ${new Date(draft.scheduledFor).toLocaleString()}`
                          : draft.status === "failed" && draft.error
                            ? draft.error
                            : timeAgo(draft.createdAt)}
                      </div>
                    </div>
                    {draft.status === "failed" &&
                      draft.kind === "reply" &&
                      draft.publishMode !== "standalone" &&
                      draft.targetTweetId && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            window.open(
                              buildXIntentUrl({
                                text: draft.text,
                                inReplyTo: draft.targetTweetId,
                              }),
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          Reply on X
                        </Button>
                      )}
                    {draft.status === "failed" &&
                      draft.publishMode !== "standalone" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              try {
                                await retryDraftAsStandaloneAction(String(draft._id));
                                toast.success("Retrying as standalone tweet…");
                              } catch {
                                toast.error("Retry failed");
                              }
                            })
                          }
                        >
                          Post as tweet
                        </Button>
                      )}
                    {draft.status !== "published" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() =>
                          startTransition(() =>
                            deleteDraftAction(String(draft._id))
                          )
                        }
                      >
                        {pending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
