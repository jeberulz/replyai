"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  Check,
  Copy,
  Loader2,
  Pencil,
  Send,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  publishAction,
  rewriteAction,
  saveDraftAction,
  saveEditAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const REWRITE_DIRECTIONS = [
  "shorter",
  "funnier",
  "more controversial",
  "more educational",
  "stronger hook",
  "simpler",
  "more human",
];

export type Option = {
  _id: string;
  kind: "reply" | "quote";
  category: string;
  content: string;
  reason: string;
  editedBeforeSend?: boolean;
};

export function OptionCard({
  option,
  analysisId,
  targetTweetId,
  isDemo,
}: {
  option: Option;
  analysisId: string;
  targetTweetId: string;
  isDemo: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.content);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const content = editing ? draft : option.content;
  const overLimit = content.length > 280;

  const copy = async () => {
    await navigator.clipboard.writeText(option.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copied to clipboard");
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

  const publish = (scheduledFor?: number) => {
    startTransition(async () => {
      try {
        await publishAction({
          text: option.content,
          kind: option.kind,
          analysisId,
          replyId: option._id,
          targetTweetId,
          scheduledFor,
        });
        setScheduleOpen(false);
        toast.success(
          scheduledFor
            ? "Scheduled — it will publish at the chosen time"
            : isDemo
              ? "Published (demo mode — simulated)"
              : "Publishing to X…"
        );
      } catch {
        toast.error("Publish failed");
      }
    });
  };

  const saveAsDraft = () => {
    startTransition(async () => {
      await saveDraftAction({
        text: option.content,
        kind: option.kind,
        analysisId,
        replyId: option._id,
        targetTweetId,
      });
      toast.success("Saved to drafts");
    });
  };

  return (
    <Card className={cn(pending && "opacity-60")}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="accent" className="capitalize">
              {option.category}
            </Badge>
            {option.editedBeforeSend && (
              <Badge variant="outline">edited</Badge>
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
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={pending || overLimit}>
                <Check /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(option.content);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {option.content}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Why this works:</span>{" "}
          {option.reason}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check /> : <Copy />} Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            disabled={editing}
          >
            <Pencil /> Edit
          </Button>

          <Select onValueChange={rewrite} value="">
            <SelectTrigger className="h-8 w-auto gap-1 rounded-md px-3 text-xs font-medium">
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

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={saveAsDraft} disabled={pending}>
              Save draft
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={pending}
            >
              <CalendarClock /> Schedule
            </Button>
            <Button size="sm" onClick={() => publish()} disabled={pending || overLimit}>
              <Send /> {option.kind === "quote" ? "Quote tweet" : "Reply"}
            </Button>
          </div>
        </div>
      </CardContent>

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
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!scheduleAt || pending}
              onClick={() => {
                const timestamp = new Date(scheduleAt).getTime();
                if (Number.isNaN(timestamp) || timestamp <= Date.now()) {
                  toast.error("Pick a time in the future");
                  return;
                }
                publish(timestamp);
              }}
            >
              <CalendarClock /> Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
