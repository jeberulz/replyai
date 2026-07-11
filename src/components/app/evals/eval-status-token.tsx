import { StatusDot } from "@/components/ds/status-dot";
import { cn } from "@/lib/utils";
import { evalStatusLabel } from "../../../../shared/evalLabUi";

const toneByStatus: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  queued: "bg-primary/10 text-primary",
  running: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
};

const dotToneByStatus: Record<
  string,
  "neutral" | "accent" | "success" | "warning" | "error"
> = {
  draft: "neutral",
  ready: "accent",
  queued: "accent",
  running: "accent",
  completed: "success",
  cancelled: "neutral",
  failed: "error",
};

export function EvalStatusToken({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
        toneByStatus[status] ?? toneByStatus.draft
      )}
    >
      <StatusDot
        variant={dotToneByStatus[status] ?? "neutral"}
        label={evalStatusLabel(status)}
        isPulsing={status === "running" || status === "queued"}
      />
      {evalStatusLabel(status)}
    </span>
  );
}
