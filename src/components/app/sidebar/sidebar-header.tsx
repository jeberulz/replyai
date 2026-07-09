"use client";

import Link from "next/link";
import {
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { IconButton } from "@/components/ds/icon-button";
import { Kbd } from "@/components/ds/kbd";
import { Tooltip } from "@/components/ds/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";

export function SidebarHeader({
  showCollapse = true,
}: {
  showCollapse?: boolean;
}) {
  const { collapsed, toggleCollapsed, setCommandOpen } = useSidebar();

  return (
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
        className={cn("flex items-center gap-0.5", collapsed && "flex-col")}
      >
        <Tooltip
          content={
            <span className="inline-flex items-center gap-1.5">
              Search <Kbd keys="mod+k" />
            </span>
          }
          placement="end"
          delay={0}
        >
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label="Search"
            icon={<Search className="size-4" />}
            onClick={() => setCommandOpen(true)}
            className="text-muted-foreground"
          />
        </Tooltip>

        {showCollapse ? (
          <Tooltip
            content={collapsed ? "Expand" : "Collapse"}
            placement="end"
            delay={0}
          >
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              icon={
                collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )
              }
              onClick={toggleCollapsed}
              className="text-muted-foreground"
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
