"use client";

import * as React from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) {
  return (
    <PanelGroup
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

const ResizablePanel = Panel;

function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean;
}) {
  return (
    <PanelResizeHandle
      className={cn(
        // 1px seam that widens its hit area; the grip sits centered on it.
        "group relative flex w-px items-center justify-center bg-border outline-none transition-colors",
        "hover:bg-primary/40 focus-visible:bg-primary/60",
        "data-[resize-handle-active]:bg-primary/60",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        className
      )}
      {...props}
    >
      {/* invisible wider hit target */}
      <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
      {withHandle && (
        <span
          className={cn(
            "relative z-10 h-10 w-1.5 rounded-full border border-[color-mix(in_oklab,var(--color-border)_60%,white)] bg-[color-mix(in_oklab,var(--color-border)_55%,white)]",
            "transition-colors group-hover:bg-primary/70 group-data-[resize-handle-active]:bg-primary"
          )}
        />
      )}
    </PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
