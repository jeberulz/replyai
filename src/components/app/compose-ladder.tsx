"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Check, Copy, Loader2, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  generateMoreComposeAction,
  publishComposeStandaloneAction,
  saveComposeDraftAction,
  startComposeAction,
} from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { OatmealEmptyState } from "@/components/app/oatmeal-empty-state";
import { MasterDetail } from "@/components/app/split/master-detail";
import { SplitPageShell } from "@/components/app/split/split-page-shell";
import { FilterChips, PaneEyebrow } from "@/components/app/split/pane-chrome";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { Heading } from "@/components/ds/heading";
import { Skeleton } from "@/components/ds/skeleton";
import { Text } from "@/components/ds/text";
import { cn } from "@/lib/utils";
import type {
  ComposeFormat,
  TopicCluster,
} from "../../../shared/compose";

const FORMAT_FILTERS: { value: ComposeFormat; label: string }[] = [
  { value: "standalone", label: "Standalone" },
  { value: "thread", label: "Thread" },
  { value: "longform", label: "Long-form" },
];

type ClusterView = TopicCluster;

export function ComposeLadder() {
  const sessionToken = useSessionToken();
  const clustersQuery = useQuery(
    api.compose.listClusters,
    sessionToken ? { sessionToken } : "skip"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ComposeFormat>("standalone");
  const [pending, startTransition] = useTransition();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const clusters: ClusterView[] = useMemo(
    () => (clustersQuery?.clusters as ClusterView[] | undefined) ?? [],
    [clustersQuery]
  );
  const selected =
    clusters.find((c) => c.id === selectedId) ?? clusters[0] ?? null;

  const run = useQuery(
    api.compose.getRun,
    sessionToken && activeRunId
      ? { sessionToken, runId: activeRunId as Id<"composeRuns"> }
      : "skip"
  );

  const list = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {clustersQuery === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : clusters.length === 0 ? (
          <OatmealEmptyState
            title="No topic clusters yet"
            description="Publish replies that get a reply-back — they show up here to compound into posts."
            isCompact
          />
        ) : (
          clusters.map((cluster) => {
            const active = (selected?.id ?? null) === cluster.id;
            return (
              <Card
                key={cluster.id}
                padding={3}
                onClick={() => {
                  setSelectedId(cluster.id);
                  setActiveRunId(null);
                }}
                className={cn(
                  "cursor-pointer transition-colors hover:border-muted-foreground/30",
                  active && "border-primary/60 ring-1 ring-primary/40"
                )}
              >
                <div className="text-sm font-medium">{cluster.topic}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {cluster.reason}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{cluster.replies.length} replies</span>
                  <span>·</span>
                  <span>{cluster.unusedAngles.length} unused angles</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  // Guard: do not build detail JSX when selected is null (empty/loading).
  const detail = selected ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <PaneEyebrow>Topic cluster</PaneEyebrow>
        <Heading level={2} className="mt-1 text-xl">
          {selected.topic}
        </Heading>
        <Text size="sm" className="mt-2 text-muted-foreground">
          {selected.reason}
        </Text>
        {selected.unusedAngles.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.unusedAngles.slice(0, 6).map((angle) => (
              <Badge key={angle} variant="neutral" label={angle} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="space-y-3">
          <PaneEyebrow>Format</PaneEyebrow>
          <FilterChips
            value={format}
            onValueChange={(v) => {
              setFormat(v);
              setActiveRunId(null);
            }}
            options={FORMAT_FILTERS}
          />
          <Text size="sm" className="text-muted-foreground">
            {format === "standalone"
              ? "Short original post — publish via the existing API path with a human click."
              : format === "thread"
                ? "4–8 post thread saved as a multi-part draft (copy-out / per-post publish)."
                : "Article / long-form — copy to clipboard only (no API publish)."}
          </Text>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            label={pending ? "Generating…" : "Generate 3 options"}
            icon={
              pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )
            }
            isDisabled={pending}
            className="min-h-11 w-full sm:w-auto"
            onClick={() => {
              startTransition(async () => {
                const result = await startComposeAction({
                  format,
                  cluster: selected,
                });
                if (result.error && !result.runId) {
                  toast.error(result.error);
                  return;
                }
                if (result.error) {
                  toast.error(result.error);
                } else {
                  toast.success("Options ready");
                }
                if (result.runId) setActiveRunId(result.runId);
              });
            }}
          />
          {activeRunId && run?.status === "complete" ? (
            <Button
              variant="secondary"
              label="Generate more"
              isDisabled={pending}
              className="min-h-11 w-full sm:w-auto"
              onClick={() => {
                startTransition(async () => {
                  const result = await generateMoreComposeAction({
                    runId: activeRunId,
                    format,
                    cluster: selected,
                  });
                  if (result.error && !result.runId) {
                    toast.error(result.error);
                    return;
                  }
                  if (result.runId) setActiveRunId(result.runId);
                  toast.success("New options ready");
                });
              }}
            />
          ) : null}
        </div>

        {run === undefined && activeRunId ? (
          <Skeleton className="h-40 w-full" />
        ) : run?.status === "failed" ? (
          <Card padding={4}>
            <Text size="sm" className="text-destructive">
              {run.error ?? "Generation failed"}
            </Text>
          </Card>
        ) : run?.status === "complete" && run.outputs ? (
          <ComposeOptions
            runId={run._id}
            format={format}
            outputs={run.outputs}
            pending={pending}
            startTransition={startTransition}
          />
        ) : (
          <Card padding={4} className="border-dashed">
            <div className="flex items-start gap-3">
              <PenLine className="mt-0.5 size-4 text-muted-foreground" />
              <Text className="text-muted-foreground">
                Generate options from this cluster. Reasons only — no fake
                engagement scores. Every send needs your click.
              </Text>
            </div>
          </Card>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <PaneEyebrow>Source replies</PaneEyebrow>
          {selected.replies.map((reply) => (
            <div
              key={reply.draftId}
              className="rounded-md border border-border px-3 py-2 text-base"
            >
              <p className="line-clamp-3">{reply.replyText}</p>
              {reply.targetAuthorHandle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  re: @{reply.targetAuthorHandle}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <SplitPageShell
      eyebrow="Compound posts"
      title="Compose ladder"
      description="Winning replies → original posts"
      headerActions={
        clustersQuery?.demo ? (
          <Badge variant="neutral" label="Demo clusters" />
        ) : undefined
      }
    >
      <MasterDetail
        list={list}
        detail={detail}
        emptyDetail={
          <div className="flex h-full items-center justify-center p-8">
            <OatmealEmptyState
              title="Pick a topic"
              description="Select a cluster to generate a standalone, thread, or long-form draft."
              isCompact
              className="max-w-sm border-0 bg-transparent"
            />
          </div>
        }
        hasSelection={!!selected}
        onBack={() => {
          setSelectedId(null);
          setActiveRunId(null);
        }}
        autoSaveId="compose-ladder"
        backLabel="Compose"
      />
    </SplitPageShell>
  );
}

function ComposeOptions({
  runId,
  format,
  outputs,
  pending,
  startTransition,
}: {
  runId: string;
  format: ComposeFormat;
  outputs: {
    standalone: Array<{ category: string; content: string; reason: string }>;
    thread: Array<{ category: string; posts: string[]; reason: string }>;
    longform: Array<{
      category: string;
      title: string;
      content: string;
      reason: string;
    }>;
  };
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  if (format === "standalone") {
    return (
      <div className="space-y-3">
        {outputs.standalone.map((opt, i) => (
          <OptionCard
            key={`${opt.category}-${i}`}
            category={opt.category}
            reason={opt.reason}
            body={opt.content}
            pending={pending}
            primaryLabel="Publish standalone"
            onPrimary={() => {
              startTransition(async () => {
                try {
                  await publishComposeStandaloneAction({
                    runId,
                    text: opt.content,
                  });
                  toast.success("Publishing… confirm in Drafts");
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Publish failed"
                  );
                }
              });
            }}
            secondaryLabel="Save draft"
            onSecondary={() => {
              startTransition(async () => {
                await saveComposeDraftAction({
                  runId,
                  format: "standalone",
                  text: opt.content,
                });
                toast.success("Saved to drafts");
              });
            }}
          />
        ))}
      </div>
    );
  }

  if (format === "thread") {
    return (
      <div className="space-y-3">
        {outputs.thread.map((opt, i) => {
          const joined = opt.posts.join("\n\n");
          return (
            <OptionCard
              key={`${opt.category}-${i}`}
              category={opt.category}
              reason={opt.reason}
              body={
                  <ol className="list-decimal space-y-2 pl-4 text-base leading-6">
                  {opt.posts.map((post, j) => (
                    <li key={j}>{post}</li>
                  ))}
                </ol>
              }
              pending={pending}
              primaryLabel="Copy thread"
              onPrimary={async () => {
                await navigator.clipboard.writeText(joined);
                toast.success("Thread copied");
              }}
              secondaryLabel="Save draft"
              onSecondary={() => {
                startTransition(async () => {
                  await saveComposeDraftAction({
                    runId,
                    format: "thread",
                    text: joined,
                    threadPosts: opt.posts,
                  });
                  toast.success("Thread draft saved");
                });
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {outputs.longform.map((opt, i) => (
        <OptionCard
          key={`${opt.category}-${i}`}
          category={opt.category}
          reason={opt.reason}
          body={
            <div className="space-y-2">
              <p className="text-base font-semibold">{opt.title}</p>
              <pre className="whitespace-pre-wrap font-sans text-base leading-6 text-muted-foreground">
                {opt.content}
              </pre>
            </div>
          }
          pending={pending}
          primaryLabel="Copy for Articles"
          onPrimary={async () => {
            await navigator.clipboard.writeText(
              `${opt.title}\n\n${opt.content}`
            );
            toast.success("Copied — paste into X Articles");
          }}
          secondaryLabel="Save draft"
          onSecondary={() => {
            startTransition(async () => {
              await saveComposeDraftAction({
                runId,
                format: "longform",
                text: opt.content,
                title: opt.title,
              });
              toast.success("Long-form draft saved (copy-out only)");
            });
          }}
        />
      ))}
    </div>
  );
}

function OptionCard({
  category,
  reason,
  body,
  pending,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  category: string;
  reason: string;
  body: ReactNode;
  pending: boolean;
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Card padding={4} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral" label={category} />
        <Text size="sm" className="text-muted-foreground">
          {reason}
        </Text>
      </div>
      <div className="text-base leading-6">{body}</div>
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button
          variant="primary"
          label={primaryLabel}
          icon={
            primaryLabel.toLowerCase().includes("copy") ? (
              copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )
            ) : undefined
          }
          isDisabled={pending}
          className="min-h-11 w-full sm:w-auto"
          onClick={() => {
            void Promise.resolve(onPrimary()).then(() => {
              if (primaryLabel.toLowerCase().includes("copy")) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            });
          }}
        />
        <Button
          variant="secondary"
          label={secondaryLabel}
          isDisabled={pending}
          className="min-h-11 w-full sm:w-auto"
          onClick={onSecondary}
        />
      </div>
    </Card>
  );
}
