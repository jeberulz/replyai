"use client";

import { Tooltip } from "@/components/ds/tooltip";
import { useSidebar } from "./sidebar-provider";

export function SidebarFooter({
  user,
}: {
  user: {
    username: string;
    displayName: string;
    avatar?: string;
    isDemo: boolean;
  };
}) {
  const { collapsed } = useSidebar();

  const avatar = user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar} alt="" className="size-8 rounded-full border" />
  ) : (
    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {user.displayName.slice(0, 1).toUpperCase()}
    </div>
  );

  if (collapsed) {
    return (
      <div className="flex shrink-0 justify-center border-t border-border/60 p-3">
        <Tooltip
          content={
            <>
              {user.displayName}
              <br />@{user.username}
              {user.isDemo ? " · demo" : null}
            </>
          }
          placement="end"
          delay={0}
        >
          {avatar}
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border/60 p-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.displayName}</div>
        <div className="truncate text-xs text-muted-foreground">
          @{user.username}
          {user.isDemo && " · demo"}
        </div>
      </div>
    </div>
  );
}
