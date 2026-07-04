"use client";

import Link from "next/link";
import { MessageSquareQuote, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";

export function SidebarHeader({ showCollapse = true }: { showCollapse?: boolean }) {
  const { collapsed, toggleCollapsed, setCommandOpen } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          collapsed ? "flex-col px-2 py-3" : "justify-between px-3 py-4"
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold text-foreground",
            collapsed && "justify-center"
          )}
        >
          <MessageSquareQuote className="size-5 shrink-0 text-primary" />
          {!collapsed && <span>ReplyPilot</span>}
        </Link>

        <div
          className={cn(
            "flex items-center gap-0.5",
            collapsed && "flex-col"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground"
                onClick={() => setCommandOpen(true)}
                aria-label="Search"
              >
                <Search className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Search (⌘K)</TooltipContent>
          </Tooltip>

          {showCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  onClick={toggleCollapsed}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand" : "Collapse"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
