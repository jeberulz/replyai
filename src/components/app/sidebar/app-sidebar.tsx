"use client";

import { Menu } from "lucide-react";
import { IconButton } from "@/components/ds/icon-button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SetupChecklist } from "@/components/app/setup-checklist";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarHeader } from "./sidebar-header";
import { SidebarHistory } from "./sidebar-history";
import { SidebarNav } from "./sidebar-nav";
import {
  SidebarProjects,
  SidebarProjectsCollapsed,
} from "./sidebar-projects";
import { useSidebar } from "./sidebar-provider";

function SidebarBody({
  user,
  showCollapse,
}: {
  user: {
    username: string;
    displayName: string;
    avatar?: string;
    isDemo: boolean;
  };
  showCollapse?: boolean;
}) {
  const { collapsed } = useSidebar();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidebarHeader showCollapse={showCollapse} />
      <SidebarNav />
      <SidebarProjects />
      <SidebarProjectsCollapsed />
      <SidebarHistory />
      {/* Ghostbase-style "finish setup" slot — hidden on the icon rail. */}
      {!collapsed && <SetupChecklist />}
      <SidebarFooter user={user} />
    </div>
  );
}

export function AppSidebar({
  user,
}: {
  user: {
    username: string;
    displayName: string;
    avatar?: string;
    isDemo: boolean;
  };
}) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <span className="font-semibold">ReplyPilot</span>
        <IconButton
          type="button"
          variant="ghost"
          label="Open menu"
          icon={<Menu className="size-5" />}
          onClick={() => setMobileOpen(true)}
        />
      </header>

      {/* Desktop rail */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col overflow-hidden border-r border-border/60 bg-sidebar transition-[width] duration-150 md:flex md:h-screen md:sticky md:top-0",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarBody user={user} />
      </aside>

      {/*
        Mobile drawer stays on shadcn Dialog — Astryx Dialog is centered modal
        and would regress the WP6 slide-in drawer. Escalate before swapping.
      */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="fixed left-0 top-0 flex h-full max-h-none w-[min(100vw,16rem)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-r p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-sidebar">
            <SidebarBody user={user} showCollapse={false} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
