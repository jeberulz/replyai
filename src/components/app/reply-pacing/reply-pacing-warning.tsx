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
      `${count} sent today — above the 15–20 target. Only ship threads that are clearly worth it.`,
  },
  warning: {
    status: "warning" as const,
    title: "Near spam-heuristic zone",
    icon: <AlertTriangle className="size-4" />,
    body: (count: number) =>
      `${count} sent today — close to the ~50/day account-risk zone. Best remaining opportunities only.`,
  },
  limit: {
    status: "error" as const,
    title: "Past researched envelope",
    icon: <ShieldAlert className="size-4" />,
    body: (count: number) =>
      `${count} sent today — past the researched envelope. Treat anything else today as optional.`,
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
