"use client";

import { EmptyState } from "@/components/ds/empty-state";
import { cn } from "@/lib/utils";

/**
 * Dark Chrome empty panel — oatmeal tint + 45° liner (design.md).
 * Wraps ds/EmptyState so list empties stay on-brand without Neutral aesthetics.
 */
export function OatmealEmptyState({
  title,
  description,
  className,
  isCompact,
}: {
  title: string;
  description?: string;
  className?: string;
  isCompact?: boolean;
}) {
  return (
    <div
      className={cn(
        "liner rounded-xl border border-border bg-oatmeal-100/80",
        className
      )}
    >
      <EmptyState
        title={title}
        description={description}
        isCompact={isCompact}
        headingLevel={3}
        className="bg-transparent"
      />
    </div>
  );
}
