"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { analyzeTweetAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AnalyzeForm({ initialUrl }: { initialUrl?: string }) {
  const [state, formAction, pending] = useActionState(analyzeTweetAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="url"
          type="url"
          required
          defaultValue={initialUrl}
          placeholder="https://x.com/username/status/1234567890"
          className="h-11 flex-1 text-base"
          disabled={pending}
        />
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
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {pending && (
        <p className="text-sm text-muted-foreground">
          Pulling the tweet, reading the replies, scoring the conversation, and
          drafting options in your voice — usually 10–30 seconds.
        </p>
      )}
    </form>
  );
}
