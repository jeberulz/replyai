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
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{detail}</div>
        </div>
      );
    }
    return <div className="h-full min-h-0">{list}</div>;
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
