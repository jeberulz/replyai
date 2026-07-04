"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Folder, Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/components/app/convex-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";

export function SidebarProjects() {
  const sessionToken = useSessionToken();
  const { collapsed, selectedProjectId, setSelectedProjectId } = useSidebar();
  const projects = useQuery(
    api.projects.list,
    sessionToken ? { sessionToken } : "skip"
  );
  const createProject = useMutation(api.projects.create);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  if (collapsed) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken || !name.trim()) return;
    setCreating(true);
    try {
      const id = await createProject({ sessionToken, name: name.trim() });
      setSelectedProjectId(id);
      setName("");
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  }

  function selectProject(id: Id<"projects"> | null) {
    setSelectedProjectId(id);
  }

  return (
    <>
      <div className="mt-4 px-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Projects
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            onClick={() => setCreateOpen(true)}
            aria-label="New project"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => selectProject(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              selectedProjectId === null
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Folder className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">All analyses</span>
          </button>

          {projects?.map((project) => (
            <button
              key={project._id}
              type="button"
              onClick={() => selectProject(project._id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                selectedProjectId === project._id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Folder className="size-3.5 shrink-0 opacity-60" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                autoFocus
                maxLength={80}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating || !name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Collapsed rail: icon-only project folders */
export function SidebarProjectsCollapsed() {
  const sessionToken = useSessionToken();
  const { collapsed, selectedProjectId, setSelectedProjectId } = useSidebar();
  const projects = useQuery(
    api.projects.list,
    sessionToken && collapsed ? { sessionToken } : "skip"
  );

  if (!collapsed || !projects?.length) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="mt-2 flex flex-col items-center gap-1 px-2">
        {projects.slice(0, 4).map((project) => (
          <Tooltip key={project._id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  setSelectedProjectId(
                    selectedProjectId === project._id ? null : project._id
                  )
                }
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-colors",
                  selectedProjectId === project._id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label={project.name}
              >
                <Folder className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{project.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
