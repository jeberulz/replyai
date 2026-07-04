"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isNavActive, navLinks } from "./nav-links";
import { useSidebar } from "./sidebar-provider";

export function SidebarNav() {
  const pathname = usePathname();
  const { collapsed, setMobileOpen } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-0.5 px-2">
        {navLinks.map((link) => {
          const active = isNavActive(pathname, link);
          const Icon = link.icon;
          const item = (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
              </Tooltip>
            );
          }

          return item;
        })}
      </nav>
    </TooltipProvider>
  );
}
