"use client";

import { useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { retryDraftAsStandaloneAction } from "@/app/actions";
import { OfflineDraftBadge } from "@/components/app/drafts/offline-pending-banner";
import { XLogo } from "@/components/app/x-logo";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { cn, timeAgo } from "@/lib/utils";
import { buildXIntentUrl } from "../../../../shared/xPublish";

export type Draft = {
  _id: string;
  text: string;
  kind: "reply" | "quote" | "standalone" | "thread" | "longform";
  status: "draft" | "scheduled" | "published" | "failed";
  publishMode?: "threaded" | "standalone" | "url_quote";
  threadPosts?: string[];
  title?: string;
  targetTweetId?: string;
  targetTweetUrl?: string;
  scheduledFor?: number;
  createdAt: number;
  error?: string;
  publishedTweetId?: string;
  publishedAt?: number;
  analysisId?: string;
  variantGroupId?: string;
  variantLabel?: "A" | "B" | "C";
};

export type DraftStatus = Draft["status"];

export function draftKindLabel(draft: Pick<Draft, "kind" | "publishMode" | "title">): string {
  if (draft.kind === "standalone" || draft.publishMode === "standalone") {
    return "Standalone tweet";
  }
  if (draft.kind === "thread") return "Thread draft";
  if (draft.kind === "longform") {
    return draft.title ? `Long-form · ${draft.title}` : "Long-form / Article";
  }
  if (draft.publishMode === "url_quote") return "Quote (link card)";
  return draft.kind === "quote" ? "Quote tweet" : "Reply";
}

export const draftStatusMeta: Record<
  DraftStatus,
  {
    icon: LucideIcon;
    label: string;
    variant: "neutral" | "warning" | "success" | "error";
  }
> = {
  draft: { icon: FileText, label: "Draft", variant: "neutral" },
  scheduled: { icon: Clock, label: "Scheduled", variant: "warning" },
  published: { icon: CheckCircle2, label: "Published", variant: "success" },
  failed: { icon: XCircle, label: "Failed", variant: "error" },
};

export function draftSubline(draft: Draft): string {
  if (draft.status === "scheduled" && draft.scheduledFor) {
    return `publishes ${new Date(draft.scheduledFor).toLocaleString()}`;
  }
  if (draft.status === "failed" && draft.error) return draft.error;
  return timeAgo(draft.createdAt);
}

export function DraftRow({
  draft,
  selected,
  onSelect,
}: {
  draft: Draft;
  selected: boolean;
  onSelect: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const meta = draftStatusMeta[draft.status];
  const canReplyOnX =
    draft.status === "failed" &&
    draft.kind === "reply" &&
    draft.publishMode !== "standalone" &&
    Boolean(draft.targetTweetId);
  const canRetryStandalone =
    draft.status === "failed" &&
    (draft.kind === "reply" || draft.kind === "quote") &&
    draft.publishMode !== "standalone";
  const rowLabel = `Open ${draftStatusMeta[draft.status].label.toLowerCase()} ${draftKindLabel(draft)}`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={rowLabel}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      data-testid={`draft-row-${draft._id}`}
      padding={3}
      className={cn(
        "cursor-pointer transition-colors hover:border-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        selected && "border-primary/60 ring-1 ring-primary/40",
        pending && "opacity-50"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full items-start gap-3 sm:min-w-0 sm:flex-1 sm:items-center">
          <Badge
            variant={meta.variant}
            label={meta.label}
            icon={<meta.icon className="size-3" />}
            className="shrink-0"
          />
          <OfflineDraftBadge draftId={draft._id} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-medium">{draft.text}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {draftKindLabel(draft)} · {draftSubline(draft)}
            </div>
          </div>
        </div>
        {(canReplyOnX || canRetryStandalone) && (
          <div className="grid w-full gap-2 sm:w-auto sm:flex sm:flex-wrap sm:justify-end">
            {canReplyOnX && (
              <Button
                variant="secondary"
                size="sm"
                label="Reply on X"
                icon={<XLogo className="size-3.5" />}
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    buildXIntentUrl({
                      text: draft.text,
                      inReplyTo: draft.targetTweetId,
                    }),
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              />
            )}
            {canRetryStandalone && (
              <Button
                variant="secondary"
                size="sm"
                label="Post as tweet"
                isDisabled={pending}
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  startTransition(async () => {
                    try {
                      await retryDraftAsStandaloneAction(draft._id);
                      toast.success("Retrying as standalone tweet…");
                    } catch {
                      toast.error("Retry failed");
                    }
                  });
                }}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
