"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareQuote,
  Mic2,
  Radar,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: Search },
  { href: "/feed", label: "Feed scanner", icon: Radar },
  { href: "/voice", label: "Voice", icon: Mic2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({
  user,
}: {
  user: { username: string; displayName: string; avatar?: string; isDemo: boolean };
}) {
  const pathname = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-row items-center justify-between border-b bg-card px-4 py-3 md:min-h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold md:mb-8"
      >
        <MessageSquareQuote className="size-5 text-primary" />
        <span className="hidden sm:inline">ReplyPilot</span>
      </Link>

      <nav className="flex flex-row gap-1 md:flex-1 md:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 md:mt-6 md:border-t md:pt-4">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt=""
            className="size-8 rounded-full border"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="hidden min-w-0 md:block">
          <div className="truncate text-sm font-medium">{user.displayName}</div>
          <div className="truncate text-xs text-muted-foreground">
            @{user.username}
            {user.isDemo && " · demo"}
          </div>
        </div>
      </div>
    </aside>
  );
}
