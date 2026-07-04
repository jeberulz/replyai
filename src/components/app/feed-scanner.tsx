"use client";

import { useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { scanNowAction, updateScannerAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import {
  OpportunityCard,
  type Opportunity,
} from "@/components/app/opportunity-card";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { timeAgo } from "@/lib/utils";

export function FeedScanner() {
  const sessionToken = useSessionToken();
  const settings = useQuery(api.scanner.settings, { sessionToken });
  const opportunities = useQuery(api.opportunities.list, { sessionToken });
  // null = not edited locally; the saved keywords from Convex show through.
  const [draftKeywords, setDraftKeywords] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const savedKeywords = settings?.keywords.join(", ") ?? "";
  const keywords = draftKeywords ?? savedKeywords;
  const keywordsDirty = draftKeywords !== null && draftKeywords !== savedKeywords;

  const parsedKeywords = () =>
    keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

  const setEnabled = (enabled: boolean) => {
    startTransition(async () => {
      await updateScannerAction({ enabled, keywords: parsedKeywords() });
      toast.success(enabled ? "Feed scanner enabled" : "Feed scanner paused");
    });
  };

  const saveKeywords = () => {
    startTransition(async () => {
      await updateScannerAction({
        enabled: settings?.enabled ?? true,
        keywords: parsedKeywords(),
      });
      setDraftKeywords(null);
      toast.success("Keywords saved — rescanning");
    });
  };

  const scanNow = () => {
    startTransition(async () => {
      await scanNowAction();
      toast.success("Scan started — results appear live");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Live discovery"
        title="Feed scanner"
        description="Monitors your feed on a schedule and surfaces high-opportunity conversations before the reply window closes."
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Scanner settings</CardTitle>
              <CardDescription>
                Runs every 30 minutes when enabled
                {settings?.lastScanAt &&
                  ` · last scan ${timeAgo(settings.lastScanAt)}`}
              </CardDescription>
            </div>
            {settings === undefined ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <Switch
                checked={settings?.enabled ?? false}
                onCheckedChange={setEnabled}
                disabled={pending}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Topics you care about</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywords}
                placeholder="ai, startup, product, design"
                onChange={(e) => setDraftKeywords(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={saveKeywords}
                disabled={pending || !keywordsDirty}
              >
                Save
              </Button>
              <Button variant="outline" onClick={scanNow} disabled={pending}>
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                Scan now
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Comma-separated. Tweets matching these score higher on relevance.
            </p>
          </div>

          <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            The scanner only suggests. Every reply requires your explicit click
            to send — permanently, by design. Nothing is ever auto-posted.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          Opportunities{" "}
          {opportunities !== undefined && `(${opportunities.length})`}
        </h2>
        {opportunities === undefined ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No opportunities surfaced yet. Enable the scanner or hit
              &ldquo;Scan now&rdquo;.
            </CardContent>
          </Card>
        ) : (
          opportunities.map((opp) => (
            <OpportunityCard
              key={opp._id}
              opportunity={{
                ...(opp as unknown as Opportunity),
                _id: String(opp._id),
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
