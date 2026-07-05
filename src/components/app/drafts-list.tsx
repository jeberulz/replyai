"use client";

import { useTransition } from "react";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { deleteDraftAction, retryDraftAsStandaloneAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
import { buildXIntentUrl } from "../../../shared/xPublish";

function draftKindLabel(draft: {
  kind: "reply" | "quote";
  publishMode?: "threaded" | "standalone" | "url_quote";
}): string {
  if (draft.publishMode === "standalone") return "Standalone tweet";
  if (draft.publishMode === "url_quote") return "Quote (link card)";
  return draft.kind === "quote" ? "Quote tweet" : "Reply";
}

const draftStatusMeta = {
  draft: { icon: FileText, label: "Draft", variant: "secondary" as const },
  scheduled: { icon: Clock, label: "Scheduled", variant: "warning" as const },
  published: { icon: CheckCircle2, label: "Published", variant: "success" as const },
  failed: { icon: XCircle, label: "Failed", variant: "destructive" as const },
};

/** Drafts & published list — live status via Convex reactivity. */
export function DraftsList() {
  const sessionToken = useSessionToken();
  const drafts = useQuery(api.drafts.list, sessionToken ? { sessionToken } : "skip");
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="pt-6">
        {drafts === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : drafts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing here yet. Save or publish an option from an analysis.
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
  );
}
