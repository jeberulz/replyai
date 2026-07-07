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
import { XLogo } from "@/components/app/x-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { buildXIntentUrl } from "../../../../shared/xPublish";

export type Draft = {
  _id: string;
  text: string;
  kind: "reply" | "quote";
  status: "draft" | "scheduled" | "published" | "failed";
  publishMode?: "threaded" | "standalone" | "url_quote";
  targetTweetId?: string;
  targetTweetUrl?: string;
  scheduledFor?: number;
  createdAt: number;
  error?: string;
  publishedTweetId?: string;
  publishedAt?: number;
};

export type DraftStatus = Draft["status"];

export function draftKindLabel(draft: Pick<Draft, "kind" | "publishMode">): string {
  if (draft.publishMode === "standalone") return "Standalone tweet";
  if (draft.publishMode === "url_quote") return "Quote (link card)";
  return draft.kind === "quote" ? "Quote tweet" : "Reply";
}

export const draftStatusMeta: Record<
  DraftStatus,
  {
    icon: LucideIcon;
    label: string;
    variant: "secondary" | "warning" | "success" | "destructive";
  }
> = {
  draft: { icon: FileText, label: "Draft", variant: "secondary" },
  scheduled: { icon: Clock, label: "Scheduled", variant: "warning" },
  published: { icon: CheckCircle2, label: "Published", variant: "success" },
  failed: { icon: XCircle, label: "Failed", variant: "destructive" },
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
    draft.status === "failed" && draft.publishMode !== "standalone";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30 sm:flex-row sm:items-center",
        selected && "border-primary/60 ring-1 ring-primary/40",
        pending && "opacity-50"
      )}
    >
      <div className="flex w-full items-start gap-3 sm:min-w-0 sm:flex-1 sm:items-center">
        <Badge variant={meta.variant} className="shrink-0">
          <meta.icon className="size-3" />
          {meta.label}
        </Badge>
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
              variant="outline"
              size="sm"
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
            >
              <XLogo className="size-3.5" />
              Reply on X
            </Button>
          )}
          {canRetryStandalone && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
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
            >
              Post as tweet
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
