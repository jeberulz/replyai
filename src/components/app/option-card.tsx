"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Send,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import {
  publishAction,
  rewriteAction,
  saveDraftAction,
  saveEditAction,
} from "@/app/actions";
import { trackClient } from "@/lib/analytics/client";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { TextArea } from "@/components/ds/text-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReplyPacingWarning } from "@/components/app/reply-pacing/reply-pacing-warning";
import { DuplicateReplyWarning } from "@/components/app/reply-pacing/duplicate-reply-warning";
import { cn } from "@/lib/utils";
import {
  measureObservedEdit,
  type ObservedEditBucket,
} from "../../../shared/editDistance";
import { buildXIntentUrl } from "../../../shared/xPublish";
import type { Id } from "../../../convex/_generated/dataModel";

const REWRITE_DIRECTIONS = [
  "shorter",
  "funnier",
  "more controversial",
  "more educational",
  "stronger hook",
  "simpler",
  "more human",
];

type PublishMode = "threaded" | "standalone" | "url_quote";

export type Option = {
  _id: string;
  kind: "reply" | "quote";
  category: string;
  content: string;
  reason: string;
  baselineContent?: string;
  editDistanceNormalized?: number;
  editBucket?: ObservedEditBucket;
};

export function OptionCard({
  option,
  analysisId,
  targetTweetId,
  targetTweetUrl,
  isDemo,
}: {
  option: Option;
  analysisId: string;
  targetTweetId: string;
  targetTweetUrl: string;
  isDemo: boolean;
}) {
  const sessionToken = useSessionToken();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.content);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [watchingDraftId, setWatchingDraftId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const notifiedRef = useRef<string | null>(null);

  const watchedDraft = useQuery(
    api.drafts.get,
    sessionToken && watchingDraftId
      ? {
          sessionToken,
          draftId: watchingDraftId as Id<"savedDrafts">,
        }
      : "skip"
  );

  const openReplyOnX = useCallback(
    (text: string) => {
      if (!targetTweetId) return;
      window.open(
        buildXIntentUrl({ text, inReplyTo: targetTweetId }),
        "_blank",
        "noopener,noreferrer"
      );
    },
    [targetTweetId]
  );

  const publishStandalone = useCallback(
    (text: string, replyId: string) => {
      startTransition(async () => {
        try {
          const newDraftId = await publishAction({
            text,
            kind: option.kind,
            analysisId,
            replyId,
            publishMode: "standalone",
          });
          notifiedRef.current = null;
          setWatchingDraftId(newDraftId);
        } catch {
          toast.error("Publish failed");
        }
      });
    },
    [analysisId, option.kind, startTransition]
  );

  useEffect(() => {
    if (!watchedDraft || !watchingDraftId) return;
    if (notifiedRef.current === watchingDraftId) return;

    if (watchedDraft.status === "published") {
      notifiedRef.current = watchingDraftId;
      const mode = watchedDraft.publishMode;
      toast.success(
        mode === "standalone"
          ? "Posted to X as a standalone tweet"
          : mode === "url_quote"
            ? "Quoted on X (link card)"
            : "Published to X"
      );
    } else if (watchedDraft.status === "failed" && watchedDraft.error) {
      notifiedRef.current = watchingDraftId;
      const isReply =
        watchedDraft.kind === "reply" &&
        watchedDraft.publishMode !== "standalone" &&
        Boolean(targetTweetId);

      if (isReply) {
        toast.error(watchedDraft.error, {
          action: {
            label: "Reply on X",
            onClick: () => openReplyOnX(watchedDraft.text),
          },
          cancel: {
            label: "Post as tweet",
            onClick: () => publishStandalone(watchedDraft.text, option._id),
          },
        });
      } else if (
        targetTweetId &&
        watchedDraft.publishMode !== "standalone"
      ) {
        toast.error(watchedDraft.error, {
          action: {
            label: "Post as tweet",
            onClick: () => publishStandalone(watchedDraft.text, option._id),
          },
        });
      } else {
        toast.error(watchedDraft.error);
      }
    }
  }, [
    watchedDraft,
    watchingDraftId,
    targetTweetId,
    option._id,
    option.kind,
    openReplyOnX,
    publishStandalone,
  ]);

  const content = editing ? draft : option.content;
  const observedEdit = measureObservedEdit(
    option.baselineContent ?? option.content,
    content
  );
  const currentEditBucket = observedEdit.bucket;
  const overLimit = content.length > 280;
  const canThread = Boolean(targetTweetId);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copied to clipboard");
    trackClient("option_selected", {
      analysisId,
      replyId: option._id,
      kind: option.kind,
      category: option.category,
      action: "copied",
      editBucket: currentEditBucket,
      editDistanceNormalized: observedEdit.normalizedEditDistance,
    });
  };

  const rewrite = (direction: string) => {
    startTransition(async () => {
      try {
        await rewriteAction({ replyId: option._id, analysisId, direction });
        toast.success(`Rewritten: ${direction}`);
      } catch {
        toast.error("Rewrite failed");
      }
    });
  };

  const saveEdit = () => {
    startTransition(async () => {
      await saveEditAction({ replyId: option._id, analysisId, content: draft });
      setEditing(false);
      toast.success("Edit saved");
    });
  };

  const defaultPublishMode = (): PublishMode =>
    option.kind === "quote" ? "url_quote" : "threaded";

  const publish = (
    publishMode: PublishMode = defaultPublishMode(),
    scheduledFor?: number
  ) => {
    startTransition(async () => {
      try {
        const draftId = await publishAction({
          text: content,
          kind: option.kind,
          analysisId,
          replyId: option._id,
          targetTweetId:
            publishMode === "standalone" ? undefined : targetTweetId,
          targetTweetUrl:
            publishMode === "standalone" ? undefined : targetTweetUrl,
          scheduledFor,
          publishMode,
          category: option.category,
        });
        setScheduleOpen(false);
        if (scheduledFor) {
          toast.success("Scheduled — it will publish at the chosen time");
        } else if (isDemo) {
          toast.success("Published (demo mode — simulated)");
        } else {
          notifiedRef.current = null;
          setWatchingDraftId(draftId);
          toast.message("Publishing to X…");
        }
      } catch {
        toast.error("Publish failed");
      }
    });
  };

  const saveAsDraft = () => {
    startTransition(async () => {
      await saveDraftAction({
        text: content,
        kind: option.kind,
        analysisId,
        replyId: option._id,
        targetTweetId,
        targetTweetUrl,
        category: option.category,
      });
      toast.success("Saved to drafts");
    });
  };

  return (
    <Card
      data-testid={`option-card-${option._id}`}
      padding={4}
      className={cn(pending && "opacity-60")}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="info"
              label={option.category}
              className="capitalize"
            />
            {currentEditBucket !== "no_edit" && (
              <Badge
                variant="neutral"
                label={
                  currentEditBucket === "minor_edit"
                    ? "minor edits"
                    : "major edits"
                }
              />
            )}
          </div>
          <span
            className={cn(
              "text-xs tabular-nums",
              overLimit ? "font-semibold text-destructive" : "text-muted-foreground"
            )}
          >
            {content.length}/280
          </span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <TextArea
              label="Edit option"
              isLabelHidden
              value={draft}
              onChange={(value) => setDraft(value)}
              rows={4}
              hasAutoFocus
              size="sm"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                label="Save"
                icon={<Check className="size-3.5" />}
                onClick={saveEdit}
                isDisabled={pending || overLimit}
                className="w-full sm:w-auto"
              />
              <Button
                size="sm"
                variant="ghost"
                label="Cancel"
                onClick={() => {
                  setDraft(option.content);
                  setEditing(false);
                }}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Why this works:</span>{" "}
          {option.reason}
        </p>

        <div className="space-y-2 border-t pt-3">
          <ReplyPacingWarning />
          <DuplicateReplyWarning text={content} />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              label="Copy"
              icon={
                copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )
              }
              onClick={copy}
              className="flex-1 sm:flex-none"
            />
            <Button
              size="sm"
              variant="secondary"
              label="Edit"
              icon={<Pencil className="size-3.5" />}
              onClick={() => setEditing(true)}
              isDisabled={editing}
              className="flex-1 sm:flex-none"
            />

            <Select onValueChange={rewrite} value="">
              <SelectTrigger className="h-8 w-full gap-1 rounded-md px-3 text-xs font-medium sm:w-auto">
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
                <SelectValue placeholder="Rewrite" />
              </SelectTrigger>
              <SelectContent>
                {REWRITE_DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button
              size="sm"
              variant="ghost"
              label="Save draft"
              onClick={saveAsDraft}
              isDisabled={pending}
              className="w-full sm:w-auto"
            />
            <Button
              size="sm"
              variant="secondary"
              label="Schedule"
              icon={<CalendarClock className="size-3.5" />}
              onClick={() => setScheduleOpen(true)}
              isDisabled={pending}
              className="w-full sm:w-auto"
            />
            {canThread && (
              <Button
                size="sm"
                variant="secondary"
                label="Post as tweet"
                icon={<Send className="size-3.5" />}
                onClick={() => publish("standalone")}
                isDisabled={pending || overLimit}
                className="w-full sm:w-auto"
              />
            )}
            {canThread && option.kind === "reply" && (
              <Button
                size="sm"
                variant="secondary"
                label="Reply on X"
                icon={<ExternalLink className="size-3.5" />}
                onClick={() => openReplyOnX(content)}
                isDisabled={pending || overLimit}
                className="w-full sm:w-auto"
              />
            )}
            <Button
              size="sm"
              variant="primary"
              label={option.kind === "quote" ? "Quote on X" : "Reply"}
              icon={<Send className="size-3.5" />}
              onClick={() => publish()}
              isDisabled={pending || overLimit}
              tooltip={
                option.kind === "quote"
                  ? "Posts your text with the tweet linked — shows as a quote card"
                  : undefined
              }
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule this {option.kind}</DialogTitle>
            <DialogDescription>
              It publishes automatically at the chosen time. You approved this
              specific text by scheduling it — nothing else is ever auto-posted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`schedule-${option._id}`}>Publish at</Label>
            <Input
              id={`schedule-${option._id}`}
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              label="Cancel"
              onClick={() => setScheduleOpen(false)}
            />
            <Button
              label="Schedule"
              icon={<CalendarClock className="size-3.5" />}
              isDisabled={!scheduleAt || pending}
              onClick={() => {
                const timestamp = new Date(scheduleAt).getTime();
                if (Number.isNaN(timestamp) || timestamp <= Date.now()) {
                  toast.error("Pick a time in the future");
                  return;
                }
                publish(defaultPublishMode(), timestamp);
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
