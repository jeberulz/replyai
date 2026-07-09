"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import { Badge } from "@/components/ds/badge";
import { Card } from "@/components/ds/card";

function formatWhen(ts: number | undefined): string | null {
  if (!ts) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(ts));
  } catch {
    return null;
  }
}

export function AuthorDossier({
  authorHandle,
  compact = false,
}: {
  authorHandle: string;
  compact?: boolean;
}) {
  const sessionToken = useSessionToken();
  const [open, setOpen] = useState(!compact);
  // Stable per mount so Convex query args don't churn every render.
  const [now] = useState(() => Date.now());

  const dossier = useQuery(
    api.authors.getByHandle,
    sessionToken
      ? { sessionToken, authorHandle, now }
      : "skip"
  );

  // Stay silent while loading / unknown — no fake empty state.
  if (dossier === undefined || !dossier || !dossier.snippet) return null;

  const lastResponded = formatWhen(dossier.lastRespondedAt);
  const lastSettings = dossier.replySettingsHistory[0]?.settings;

  return (
    <Card padding={3}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <Users className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Relationship</h3>
            {dossier.source === "demo" && (
              <Badge
                variant="neutral"
                label="Demo"
                className="font-normal text-muted-foreground"
              />
            )}
            <span className="ml-auto text-muted-foreground">
              {open ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </span>
          </div>
          <p className="text-sm leading-normal text-muted-foreground">
            {dossier.snippet}
          </p>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {dossier.responseCount} response
              {dossier.responseCount === 1 ? "" : "s"}
            </span>
            <span>
              {dossier.sentCount} sent
            </span>
            {lastResponded && <span>Last response {lastResponded}</span>}
          </div>
          {dossier.topicsResponded.length > 0 && (
            <p>
              Responded on:{" "}
              <span className="text-foreground">
                {dossier.topicsResponded.slice(0, 3).join(" · ")}
              </span>
            </p>
          )}
          {lastSettings && (
            <p>
              Reply settings seen:{" "}
              <span className="text-foreground">{lastSettings}</span>
              {dossier.replySettingsHistory.length > 1
                ? ` (+${dossier.replySettingsHistory.length - 1} earlier)`
                : ""}
            </p>
          )}
          {dossier.cadenceHint && (
            <p>
              Cadence:{" "}
              <span className="text-foreground">{dossier.cadenceHint}</span>
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
