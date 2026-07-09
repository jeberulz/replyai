"use client";

import { useState, useTransition } from "react";
import { useMutation } from "convex/react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  GitCompareArrows,
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
import { ReplyPacingWarning } from "@/components/app/reply-pacing/reply-pacing-warning";
import { DuplicateReplyWarning } from "@/components/app/reply-pacing/duplicate-reply-warning";
import { VariantComparePanel } from "@/components/app/drafts/variant-compare-panel";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { IconButton } from "@/components/ds/icon-button";
import { TextArea } from "@/components/ds/text-area";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
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
  const sessionToken = useSessionToken();
  const trackDraft = useMutation(api.variants.trackDraft);
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
  const canTrackVariant =
    Boolean(draft.analysisId) &&
    (draft.kind === "reply" || draft.kind === "quote") &&
    !draft.variantGroupId;

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

  const trackAsVariant = () => {
    if (!sessionToken) return;
    startTransition(async () => {
      try {
        const result = await trackDraft({
          sessionToken,
          draftId: draft._id as Id<"savedDrafts">,
        });
        toast.success(`Tracked as variant ${result.variantLabel}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not track variant"
        );
      }
    });
  };
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
            <IconButton
              label="Delete draft"
              icon={<Trash2 className="size-[17px]" />}
              variant="ghost"
              size="sm"
              onClick={remove}
              isDisabled={pending}
            />
          ) : undefined
        }
      />
      <PaneTitleRow title="Draft detail">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={meta.variant}
            label={meta.label}
            icon={<meta.icon className="size-3" />}
          />
          {draft.variantLabel && (
            <Badge variant="info" label={`Variant ${draft.variantLabel}`} />
          )}
        </div>
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
          <Card padding={3}>
            <div className="space-y-2">
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
                  <TextArea
                    label="Draft text"
                    isLabelHidden
                    value={text}
                    onChange={(value) => setText(value)}
                    rows={4}
                    hasAutoFocus
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      label="Save"
                      icon={<Check className="size-3.5" />}
                      onClick={save}
                      isDisabled={pending}
                      className="w-full sm:w-auto"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      label="Cancel"
                      onClick={() => {
                        setText(draft.text);
                        setEditing(false);
                      }}
                      className="w-full sm:w-auto"
                    />
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-normal">
                  {draft.text}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-2">
          <PaneEyebrow>Status</PaneEyebrow>
          <Card padding={3}>
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
          </Card>
        </div>

        {draft.variantGroupId && (
          <div className="space-y-2">
            <PaneEyebrow>Variant comparison</PaneEyebrow>
            <VariantComparePanel draftId={draft._id} />
          </div>
        )}
      </PaneBody>

      <PaneActionBar
        note={
          <>
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Nothing publishes automatically — you choose how this goes out.
          </>
        }
      >
        <ReplyPacingWarning className="w-full" />
        {draft.kind === "reply" && draft.status !== "published" && (
          <DuplicateReplyWarning text={text} className="w-full" />
        )}
        {canReplyOnX && (
          <Button
            label="Reply on X"
            icon={<XLogo className="size-3.5" />}
            className="w-full sm:w-auto"
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
          />
        )}
        {canRetryStandalone && (
          <Button
            variant={canReplyOnX ? "secondary" : "primary"}
            label="Post as tweet"
            onClick={retryStandalone}
            isDisabled={pending}
            className="w-full sm:w-auto"
          />
        )}
        {canTrackVariant && (
          <Button
            variant="secondary"
            label="Track as A/B variant"
            icon={<GitCompareArrows className="size-3.5" />}
            onClick={trackAsVariant}
            isDisabled={pending}
            className="w-full sm:w-auto"
          />
        )}
        {draft.status === "published" && draft.publishedTweetId && (
          <Button
            label="Open on X"
            icon={<ExternalLink className="size-3.5" />}
            href={`https://x.com/i/web/status/${draft.publishedTweetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          />
        )}
        {editable && !editing && (
          <Button
            variant="secondary"
            label="Edit"
            icon={<Pencil className="size-3.5" />}
            onClick={() => setEditing(true)}
            className="w-full sm:w-auto"
          />
        )}
        {editable && (
          <Button
            variant="secondary"
            label="Delete"
            icon={<Trash2 className="size-3.5" />}
            onClick={remove}
            isDisabled={pending}
            className="w-full sm:w-auto"
          />
        )}
      </PaneActionBar>
    </Pane>
  );
}
