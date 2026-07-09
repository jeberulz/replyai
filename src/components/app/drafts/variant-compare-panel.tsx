"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Card } from "@/components/ds/card";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Side-by-side observed stats for an A/B/C variant group.
 * Counts only — never predictions or fake engagement scores.
 */
export function VariantComparePanel({
  draftId,
}: {
  draftId: string;
}) {
  const sessionToken = useSessionToken();
  const comparison = useQuery(
    api.variants.getComparisonForDraft,
    sessionToken
      ? {
          sessionToken,
          draftId: draftId as Id<"savedDrafts">,
        }
      : "skip"
  );

  if (comparison === undefined) {
    return (
      <Card padding={3}>
        <p className="text-xs text-muted-foreground">Loading comparison…</p>
      </Card>
    );
  }

  if (comparison === null) return null;

  return (
    <div className="space-y-2" data-testid="variant-compare-panel">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          A/B comparison
        </p>
        <Badge
          variant="neutral"
          label={comparison.category}
          className="capitalize"
        />
        {comparison.source === "demo" && (
          <Badge variant="neutral" label="demo counts" />
        )}
      </div>
      <Card padding={3} className="space-y-3">
        <p className="text-sm text-foreground/90">{comparison.copy}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {comparison.variants.map((v) => (
            <div
              key={v.label}
              className="rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <p className="text-xs font-semibold text-foreground">
                Variant {v.label}
              </p>
              <dl className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Published</dt>
                  <dd className="tabular-nums text-foreground">
                    {v.publishedCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Responses</dt>
                  <dd className="tabular-nums text-foreground">
                    {v.respondedCount}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>No/minor edit</dt>
                  <dd className="tabular-nums text-foreground">
                    {v.noOrMinorEditCount}
                    {v.editBucketKnownCount > 0
                      ? `/${v.editBucketKnownCount}`
                      : ""}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Observed counts only ({comparison.windowHours}h window). No predicted
          winners.
        </p>
      </Card>
    </div>
  );
}
