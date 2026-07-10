"use client";

import { useState } from "react";
import { ArrowUp, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ds/button";
import {
  ChatComposer as AstryxChatComposer,
  ChatComposerDrawer,
} from "@/components/ds/chat-composer";
import { TextInput } from "@/components/ds/text-input";
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

  const submitFromValue = (mainRaw: string) => {
    const main = mainRaw.trim();
    if (!main || pending) return;
    // A bare URL in the main box is the URL path; anything else is the
    // recommended paste-text path (no paid X read tier needed).
    const mainIsUrl = !main.includes("\n") && parseTweetUrl(main) !== null;
    const followersNum = Number(followers.replace(/[^0-9]/g, ""));
    onSubmit({
      text: mainIsUrl ? undefined : main,
      url: mainIsUrl ? main : url.trim() || undefined,
      authorHandle: authorHandle.trim() || undefined,
      authorFollowers:
        Number.isFinite(followersNum) && followersNum > 0
          ? followersNum
          : undefined,
    });
  };

  const contextCount =
    (url.trim() ? 1 : 0) +
    (authorHandle.trim() ? 1 : 0) +
    (followers.trim() ? 1 : 0);

  return (
    <div className="w-full space-y-2">
      <AstryxChatComposer
        value={value}
        onChange={setValue}
        onSubmit={submitFromValue}
        placeholder={placeholder}
        isDisabled={pending}
        density="balanced"
        status={
          error
            ? { type: "error", message: error }
            : pending
              ? {
                  type: "warning",
                  message: "Capturing the tweet and scoring the conversation…",
                }
              : undefined
        }
        // Real textarea keeps HTML placeholder + mobile e2e selectors.
        // Default Astryx input is contenteditable (no placeholder attr).
        input={
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                submitFromValue(value);
              }
            }}
            rows={Math.min(8, Math.max(2, value.split("\n").length))}
            placeholder={placeholder}
            disabled={pending}
            className="w-full resize-none bg-transparent px-1 pt-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        }
        footerActions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            label="Add context"
            icon={
              <Plus
                className={
                  showContext
                    ? "size-3.5 rotate-45 transition-transform"
                    : "size-3.5"
                }
              />
            }
            onClick={() => setShowContext((s) => !s)}
            isDisabled={pending}
          />
        }
        sendButton={
          <Button
            type="button"
            size="sm"
            variant="primary"
            label="Analyze"
            isIconOnly
            icon={
              pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )
            }
            onClick={() => submitFromValue(value)}
            isDisabled={pending || !value.trim()}
            className="min-h-11 min-w-11 rounded-full"
          />
        }
        drawer={
          showContext ? (
            <ChatComposerDrawer
              count={contextCount || undefined}
              label="Context"
              defaultIsCollapsed={false}
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <TextInput
                  label="Tweet URL (optional)"
                  value={url}
                  onChange={setUrl}
                  placeholder="https://x.com/username/status/…"
                  isDisabled={pending}
                />
                <TextInput
                  label="Author (optional)"
                  value={authorHandle}
                  onChange={setAuthorHandle}
                  placeholder="@handle"
                  isDisabled={pending}
                  className="sm:w-32"
                />
                <TextInput
                  label="Followers (optional)"
                  value={followers}
                  onChange={setFollowers}
                  placeholder="12000"
                  isDisabled={pending}
                  className="sm:w-28"
                />
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  Pasting the text analyzes the real tweet without a paid X API
                  tier. Adding the URL lets you publish the reply threaded to the
                  original.
                </p>
              </div>
            </ChatComposerDrawer>
          ) : undefined
        }
      />
    </div>
  );
}
