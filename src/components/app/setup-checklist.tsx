"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { dismissSetupChecklistAction } from "@/app/actions";
import { useSessionToken } from "@/components/app/convex-provider";
import { buildSetupChecklist } from "../../../shared/onboarding";

/**
 * Sidebar "finish setting up" panel (the Ghostbase "train your model" slot).
 * Progress is derived entirely from real state — which steps actually
 * happened — never a stored counter. Hides once complete or dismissed.
 */
export function SetupChecklist() {
  const sessionToken = useSessionToken();
  const args = sessionToken ? { sessionToken } : ("skip" as const);
  const me = useQuery(api.users.me, args);
  const profiles = useQuery(api.voiceProfiles.list, args);
  const scanner = useQuery(api.scanner.settings, args);
  const analyses = useQuery(
    api.analyses.listRecent,
    sessionToken ? { sessionToken, limit: 1 } : "skip"
  );
  const drafts = useQuery(api.drafts.list, args);
  const [pending, startTransition] = useTransition();

  // Wait for every source — a panel that flickers from 0% to 60% as
  // queries land reads as broken.
  if (!me || !profiles || !scanner || !analyses || !drafts) return null;
  if (me.setupDismissedAt !== undefined) return null;

  const checklist = buildSetupChecklist({
    goal: me.goal,
    keywords: scanner?.keywords ?? [],
    hasTrainedVoice: profiles.some((p) => p.source === "trained"),
    hasAnalysis: analyses.length > 0,
    hasDraft: drafts.length > 0,
  });
  if (checklist.complete) return null;

  return (
    <div className="shrink-0 border-t border-border/60 p-3">
      <div className="rounded-lg border border-border/60 bg-card/60 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-primary">
            Finish setup
          </p>
          <span className="font-mono text-xs tabular-nums text-foreground">
            {checklist.percent}%
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${checklist.percent}%` }}
          />
        </div>
        <ul className="mt-2.5 space-y-0.5">
          {checklist.items.map((item) => {
            const row = (
              <>
                <span
                  aria-hidden
                  className={`grid size-4 flex-none place-items-center rounded-full border ${
                    item.done ? "border-primary bg-primary" : "border-border"
                  }`}
                >
                  {item.done && (
                    <Check className="size-2.5 text-white" strokeWidth={3} />
                  )}
                </span>
                <span
                  className={`truncate ${
                    item.done
                      ? "text-muted-foreground/50 line-through decoration-border"
                      : ""
                  }`}
                >
                  {item.label}
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {item.done ? (
                  <span className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
                    {row}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 rounded px-1 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                  >
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => dismissSetupChecklistAction())}
            className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-60"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
