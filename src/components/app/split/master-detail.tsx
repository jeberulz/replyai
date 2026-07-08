"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "./use-is-desktop";

export function MasterDetail({
  list,
  detail,
  hasSelection,
  onBack,
  emptyDetail,
  autoSaveId,
  defaultDetailSize = 42,
  minDetailSize = 32,
  maxDetailSize = 52,
  backLabel = "Back",
}: {
  list: React.ReactNode;
  detail: React.ReactNode;
  hasSelection: boolean;
  onBack: () => void;
  emptyDetail?: React.ReactNode;
  autoSaveId?: string;
  /** Right pane size as a percentage of the split (react-resizable-panels units). */
  defaultDetailSize?: number;
  minDetailSize?: number;
  maxDetailSize?: number;
  backLabel?: string;
}) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    // Master–detail stack: list full-width; selecting pushes a full-screen
    // detail with a back affordance.
    if (hasSelection) {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
          <div className="shrink-0 border-b border-border bg-background px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-11 justify-start px-0 text-sm"
            >
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{detail}</div>
        </div>
      );
    }
    return <div className="h-full min-h-0 overflow-hidden">{list}</div>;
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId={autoSaveId}
      className="min-h-0"
    >
      <ResizablePanel minSize={40} className="min-w-0">
        {list}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        defaultSize={defaultDetailSize}
        minSize={minDetailSize}
        maxSize={maxDetailSize}
        className="min-w-0"
      >
        {hasSelection ? detail : emptyDetail}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
