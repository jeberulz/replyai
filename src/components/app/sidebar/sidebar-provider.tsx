"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

const COLLAPSED_KEY = "replypilot.sidebar.collapsed";
const COLLAPSE_EVENT = "replypilot:sidebar-collapse";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSE_EVENT, callback);
  };
}

function getCollapsedSnapshot(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === "true";
}

function getCollapsedServerSnapshot(): boolean {
  return false;
}

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  selectedProjectId: Id<"projects"> | null;
  setSelectedProjectId: (id: Id<"projects"> | null) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );
  const [selectedProjectId, setSelectedProjectId] =
    useState<Id<"projects"> | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    const next = !getCollapsedSnapshot();
    localStorage.setItem(COLLAPSED_KEY, String(next));
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      toggleCollapsed,
      selectedProjectId,
      setSelectedProjectId,
      commandOpen,
      setCommandOpen,
      mobileOpen,
      setMobileOpen,
    }),
    [
      collapsed,
      commandOpen,
      mobileOpen,
      selectedProjectId,
      toggleCollapsed,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
