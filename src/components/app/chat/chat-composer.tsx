"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parseTweetUrl } from "../../../../shared/scoring";
import type { AnalyzeInput } from "./use-analysis-pipeline";

export function ChatComposer({
  onSubmit,
  pending,
  error,
  initialValue,
  placeholder = "Paste a tweet or its URL to analyze…",
}: {
  onSubmit: (input: AnalyzeInput) => void;
  pending: boolean;
  error: string | null;
  initialValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [showContext, setShowContext] = useState(false);
  const [url, setUrl] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const main = value.trim();
    if (!main || pending) return;
    // A bare URL in the main box is the URL path; anything else is the
    // recommended paste-text path (no paid X read tier needed).
    const mainIsUrl = !main.includes("\n") && parseTweetUrl(main) !== null;
    const followersNum = Number(followers.replace(/[^0-9]/g, ""));
    onSubmit({
      text: mainIsUrl ? undefined : main,
      url: mainIsUrl ? main : url.trim() || undefined,
      authorHandle: authorHandle.trim() || undefined,
      authorFollowers: Number.isFinite(followersNum) && followersNum > 0
        ? followersNum
        : undefined,
    });
  };

  return (
    <div className="w-full space-y-2">
      <div
        className={cn(
          "rounded-xl border border-input bg-card transition-[border-color,box-shadow]",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={Math.min(8, Math.max(2, value.split("\n").length))}
          placeholder={placeholder}
          disabled={pending}
          className="w-full resize-none bg-transparent px-4 pt-3.5 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowContext((s) => !s)}
            disabled={pending}
          >
            <Plus
              className={cn("transition-transform", showContext && "rotate-45")}
            />
            Add context
          </Button>
          <Button
            type="button"
            size="icon"
            className="rounded-full"
            onClick={submit}
            disabled={pending || !value.trim()}
            aria-label="Analyze"
          >
            {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        {showContext && (
          <div className="grid gap-3 border-t border-border px-4 py-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="composer-url" className="text-xs">
                Tweet URL (optional)
              </Label>
              <Input
                id="composer-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://x.com/username/status/…"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-handle" className="text-xs">
                Author (optional)
              </Label>
              <Input
                id="composer-handle"
                value={authorHandle}
                onChange={(e) => setAuthorHandle(e.target.value)}
                placeholder="@handle"
                className="sm:w-32"
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="composer-followers" className="text-xs">
                Followers (optional)
              </Label>
              <Input
                id="composer-followers"
                inputMode="numeric"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="12000"
                className="sm:w-28"
                disabled={pending}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              Pasting the text analyzes the real tweet without a paid X API
              tier. Adding the URL lets you publish the reply threaded to the
              original.
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {pending && (
        <p className="text-xs text-muted-foreground">
          Capturing the tweet and scoring the conversation…
        </p>
      )}
    </div>
  );
}
