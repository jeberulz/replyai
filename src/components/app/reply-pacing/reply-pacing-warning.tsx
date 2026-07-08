"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useReplyPacing } from "./use-reply-pacing";
import { cn } from "@/lib/utils";

const warningMeta = {
  watch: {
    icon: AlertTriangle,
    tone: "border-warning/30 bg-warning/10 text-warning",
    body: (count: number) =>
      `${count} replies sent today. You are already above the 15-20 target, so only ship threads that feel clearly worth it.`,
  },
  warning: {
    icon: AlertTriangle,
    tone: "border-warning/40 bg-warning/10 text-warning",
    body: (count: number) =>
      `${count} replies sent today. You are close to the ~50/day spam-heuristic zone; prefer only the best remaining opportunities.`,
  },
  limit: {
    icon: ShieldAlert,
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    body: (count: number) =>
      `${count} replies sent today. You are past the researched envelope, so treat anything else today as optional.`,
  },
} as const;

export function ReplyPacingWarning({
  className,
}: {
  className?: string;
}) {
  const pacing = useReplyPacing();
  if (!pacing || pacing.warningLevel === "none") return null;

  const meta = warningMeta[pacing.warningLevel];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        meta.tone,
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="leading-snug">{meta.body(pacing.sentRepliesToday)}</p>
    </div>
  );
}
