import { cn } from "@/lib/utils";

/**
 * "Worth replying" score, 0-100. Heuristic (timing, velocity, audience,
 * relevance) with a plain-language reason — shown in the title tooltip.
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
  const tier =
    value >= 70
      ? "bg-success/15 text-success"
      : value >= 45
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span
      title={reason}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        tier,
        className
      )}
    >
      {value}
      <span className="font-normal opacity-80">/100</span>
    </span>
  );
}
