"use client";

import { MessageCircle, Repeat2, Heart, BarChart3, Upload } from "lucide-react";

import { XLogo } from "@/components/app/x-logo";
import { PaneEyebrow } from "@/components/app/split/pane-chrome";

/**
 * Renders the focused reply option the way it appears on X — threaded under the
 * source tweet — so the user can judge it in its destination before sending.
 * Presentational only.
 */
export function ReplyPreview({
  author,
  tweetText,
  you,
  replyText,
}: {
  author: { name: string; handle: string };
  tweetText: string;
  you: { name: string; handle: string };
  replyText: string;
}) {
  return (
    <div className="space-y-3">
      <PaneEyebrow>How it appears on X</PaneEyebrow>
      <div className="rounded-xl border border-border bg-card px-4 pb-2 pt-4">
        {/* Source tweet */}
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="size-10 shrink-0 rounded-full bg-accent" />
            <div className="my-1 w-0.5 flex-1 bg-border" />
          </div>
          <div className="min-w-0 flex-1 pb-3.5">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{author.name}</span>
              <XLogo className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                @{author.handle} · 40m
              </span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-normal">
              {tweetText}
            </p>
          </div>
        </div>

        {/* Your reply */}
        <div className="flex gap-3">
          <div className="size-10 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1 pb-1.5">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold">{you.name}</span>
              <span className="text-muted-foreground">@{you.handle} · now</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Replying to{" "}
              <span className="text-[#1d9bf0]">@{author.handle}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-normal">
              {replyText}
            </p>
            <div className="mt-2 flex items-center gap-9 text-muted-foreground">
              <MessageCircle className="size-3.5" />
              <Repeat2 className="size-3.5" />
              <Heart className="size-3.5" />
              <BarChart3 className="size-3.5" />
              <Upload className="size-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
