"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteDraftAction,
  retryDraftAsStandaloneAction,
  updateDraftAction,
} from "@/app/actions";
import { XLogo } from "@/components/app/x-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Pane,
  PaneActionBar,
  PaneBody,
  PaneEyebrow,
  PaneHeader,
  PaneTabPill,
  PaneTitleRow,
} from "@/components/app/split/pane-chrome";
import { cn } from "@/lib/utils";
import { buildXIntentUrl } from "../../../../shared/xPublish";
import {
  draftKindLabel,
  draftStatusMeta,
  draftSubline,
  type Draft,
} from "./draft-row";

function TimelineStep({
  color,
  title,
  sub,
  connector,
  titleClass,
}: {
  color: string;
  title: string;
  sub: string;
  connector: boolean;
  titleClass?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", color)} />
        {connector && <span className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className={cn("pb-4", !connector && "pb-0")}>
        <p className={cn("text-sm font-semibold", titleClass)}>{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export function DraftDetail({
  draft,
  onDeleted,
}: {
  draft: Draft;
  onDeleted: () => void;
}) {
  const meta = draftStatusMeta[draft.status];
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text);

  const canReplyOnX =
    draft.status === "failed" &&
    draft.kind === "reply" &&
    draft.publishMode !== "standalone" &&
    Boolean(draft.targetTweetId);
  const canRetryStandalone =
    draft.status === "failed" && draft.publishMode !== "standalone";
  const editable = draft.status !== "published";

  const save = () =>
    startTransition(async () => {
      await updateDraftAction(draft._id, text);
      setEditing(false);
      toast.success("Draft updated");
    });

  const remove = () =>
    startTransition(async () => {
      await deleteDraftAction(draft._id);
      onDeleted();
    });

  const retryStandalone = () =>
    startTransition(async () => {
      try {
        await retryDraftAsStandaloneAction(draft._id);
        toast.success("Retrying as standalone tweet…");
      } catch {
        toast.error("Retry failed");
      }
    });

  return (
    <Pane>
      <PaneHeader
        tab={
          <PaneTabPill icon={<meta.icon className="size-3.5" />}>
            {draftKindLabel(draft)}
          </PaneTabPill>
        }
        actions={
          editable ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label="Delete draft"
              className="transition-colors hover:text-foreground"
            >
              <Trash2 className="size-[17px]" />
            </button>
          ) : undefined
        }
      />
      <PaneTitleRow title="Draft detail">
        <Badge variant={meta.variant}>
          <meta.icon className="size-3" />
          {meta.label}
        </Badge>
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        {draft.status === "failed" && draft.error && (
          <div className="flex gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">
                Publish failed
              </p>
              <p className="text-xs leading-snug text-destructive/90">
                {draft.error}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <PaneEyebrow>The draft</PaneEyebrow>
          <Card>
            <CardContent className="space-y-2 p-4">
              {draft.targetTweetUrl && draft.kind === "reply" && (
                <a
                  href={draft.targetTweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#1d9bf0] hover:underline"
                >
                  Replying to this tweet
                  <ExternalLink className="size-3" />
                </a>
              )}
              {editing ? (
                <div className="space-y-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={save} disabled={pending}>
                      <Check /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setText(draft.text);
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-normal">
                  {draft.text}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <PaneEyebrow>Status</PaneEyebrow>
          <Card>
            <CardContent className="p-4">
              <TimelineStep
                color="bg-success"
                title="Drafted"
                sub={`${draftKindLabel(draft)} · saved`}
                connector
              />
              {draft.status === "scheduled" && (
                <TimelineStep
                  color="bg-warning"
                  title="Scheduled"
                  sub={draftSubline(draft)}
                  connector={false}
                  titleClass="text-warning"
                />
              )}
              {draft.status === "failed" && (
                <>
                  <TimelineStep
                    color="bg-destructive"
                    title="Publish attempted"
                    sub="Blocked by the X API"
                    connector
                    titleClass="text-destructive"
                  />
                  <TimelineStep
                    color="bg-primary"
                    title="Retry available"
                    sub="Use a fallback below"
                    connector={false}
                    titleClass="text-primary"
                  />
                </>
              )}
              {draft.status === "published" && (
                <TimelineStep
                  color="bg-success"
                  title="Published"
                  sub={draftSubline(draft)}
                  connector={false}
                  titleClass="text-success"
                />
              )}
              {draft.status === "draft" && (
                <TimelineStep
                  color="bg-muted-foreground"
                  title="Saved as draft"
                  sub="Not scheduled yet"
                  connector={false}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </PaneBody>

      <PaneActionBar
        note={
          <>
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Nothing publishes automatically — you choose how this goes out.
          </>
        }
      >
        {canReplyOnX && (
          <Button
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
            <XLogo className="size-3.5" />
            Reply on X
          </Button>
        )}
        {canRetryStandalone && (
          <Button
            variant={canReplyOnX ? "outline" : "default"}
            onClick={retryStandalone}
            disabled={pending}
          >
            Post as tweet
          </Button>
        )}
        {draft.status === "published" && draft.publishedTweetId && (
          <Button asChild>
            <a
              href={`https://x.com/i/web/status/${draft.publishedTweetId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink /> Open on X
            </a>
          </Button>
        )}
        {editable && !editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil /> Edit
          </Button>
        )}
        {editable && (
          <Button variant="outline" onClick={remove} disabled={pending}>
            <Trash2 /> Delete
          </Button>
        )}
      </PaneActionBar>
    </Pane>
  );
}
