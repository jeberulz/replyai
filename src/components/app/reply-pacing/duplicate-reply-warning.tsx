"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Banner } from "@/components/ds/banner";
import { useSessionToken } from "@/components/app/convex-provider";
import { cn } from "@/lib/utils";

const warningMeta = {
  similar: {
    status: "warning" as const,
    icon: <AlertTriangle className="size-4" />,
  },
  pattern: {
    status: "error" as const,
    icon: <ShieldAlert className="size-4" />,
  },
} as const;

export function DuplicateReplyWarning({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const sessionToken = useSessionToken();
  const trimmed = text.trim();
  const assessment = useQuery(
    api.usage.duplicateReplyCheck,
    sessionToken && trimmed.length > 0
      ? { sessionToken, text: trimmed }
      : "skip"
  );

  if (!assessment || assessment.level === "none") return null;

  const meta = warningMeta[assessment.level];

  return (
    <Banner
      status={meta.status}
      title={assessment.headline}
      description={assessment.detail}
      icon={meta.icon}
      className={cn(className)}
    />
  );
}
