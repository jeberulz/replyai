"use client";

import { Badge } from "@/components/ds/badge";
import { Tooltip } from "@/components/ds/tooltip";
import { cn } from "@/lib/utils";

/**
 * "Worth replying" score, 0-100. Heuristic (timing, velocity, audience,
 * relevance) with a plain-language reason — shown in the tooltip.
 * Never a fake ML / engagement percentage (PRD guardrail).
 */
export function ScoreBadge({
  value,
  reason,
  className,
}: {
  value: number;
  reason?: string;
  className?: string;
}) {
  const variant =
    value >= 70 ? "success" : value >= 45 ? "warning" : "neutral";

  const badge = (
    <Badge
      variant={variant}
      label={`${value}/100`}
      className={cn("font-semibold tabular-nums", className)}
    />
  );

  if (!reason) return badge;

  return (
    <Tooltip content={reason} placement="above" delay={0}>
      {badge}
    </Tooltip>
  );
}
