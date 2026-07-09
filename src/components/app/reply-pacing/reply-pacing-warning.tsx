"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";

import { Banner } from "@/components/ds/banner";
import { useReplyPacing } from "./use-reply-pacing";
import { cn } from "@/lib/utils";

const warningMeta = {
  watch: {
    status: "warning" as const,
    title: "Above daily target",
    icon: <AlertTriangle className="size-4" />,
    body: (count: number) =>
      `${count} replies sent today. You are already above the 15-20 target, so only ship threads that feel clearly worth it.`,
  },
  warning: {
    status: "warning" as const,
    title: "Near spam-heuristic zone",
    icon: <AlertTriangle className="size-4" />,
    body: (count: number) =>
      `${count} replies sent today. You are close to the ~50/day spam-heuristic zone; prefer only the best remaining opportunities.`,
  },
  limit: {
    status: "error" as const,
    title: "Past researched envelope",
    icon: <ShieldAlert className="size-4" />,
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

  return (
    <Banner
      status={meta.status}
      title={meta.title}
      description={meta.body(pacing.sentRepliesToday)}
      icon={meta.icon}
      className={cn(className)}
    />
  );
}
