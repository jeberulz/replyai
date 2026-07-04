"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { analyzeTweetAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AnalyzeForm({ initialUrl }: { initialUrl?: string }) {
  const [state, formAction, pending] = useActionState(analyzeTweetAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tweet-text">Tweet text</Label>
        <textarea
          id="tweet-text"
          name="text"
          rows={4}
          placeholder="Paste the tweet you want to reply to…"
          className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Pasting the text analyzes the real tweet without a paid X API tier.
          Reading a tweet from its URL alone requires X API Basic.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="tweet-url">Tweet URL (optional)</Label>
          <Input
            id="tweet-url"
            name="url"
            type="url"
            defaultValue={initialUrl}
            placeholder="https://x.com/username/status/1234567890"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author-handle">Author (optional)</Label>
          <Input
            id="author-handle"
            name="authorHandle"
            placeholder="@handle"
            className="sm:w-32"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author-followers">Followers (optional)</Label>
          <Input
            id="author-followers"
            name="authorFollowers"
            inputMode="numeric"
            placeholder="12000"
            className="sm:w-28"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              <Search />
              Analyze
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          A URL lets you publish the reply threaded to the original tweet.
        </p>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {pending && (
        <p className="text-sm text-muted-foreground">
          Reading the tweet, scoring the conversation, and drafting options in
          your voice — usually 10–30 seconds.
        </p>
      )}
    </form>
  );
}
