"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, FolderInput, MoreHorizontal } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/components/app/convex-provider";
import { ScoreBadge } from "@/components/app/score-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { groupByRelativeDay } from "../../../../shared/dateGroups";
import { useSidebar } from "./sidebar-provider";

type Analysis = Doc<"tweetAnalyses">;

function HistoryRow({
  analysis,
  projects,
  active,
  onNavigate,
}: {
  analysis: Analysis;
  projects: Doc<"projects">[] | undefined;
  active: boolean;
  onNavigate: () => void;
}) {
  const sessionToken = useSessionToken();
  const setProject = useMutation(api.analyses.setProject);
  const label =
    analysis.topic ||
    `@${analysis.tweet.authorHandle}: ${analysis.tweet.text.slice(0, 40)}`;

  async function moveToProject(projectId: Id<"projects"> | undefined) {
    if (!sessionToken) return;
    await setProject({ sessionToken, analysisId: analysis._id, projectId });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-md pr-1 transition-colors",
        active && "bg-accent"
      )}
    >
      <Link
        href={`/analysis/${analysis._id}`}
        onClick={onNavigate}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 px-2 py-1.5 text-sm",
          active
            ? "text-accent-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <ScoreBadge
          value={analysis.score.value}
          reason={analysis.score.reason}
          className="mt-0.5 shrink-0 px-1.5 py-0 text-[10px]"
        />
        <span className="line-clamp-2 min-w-0 flex-1 leading-snug">{label}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label="Analysis actions"
          >
            <MoreHorizontal className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/analysis/${analysis._id}`} onClick={onNavigate}>
              <ExternalLink className="size-4" />
              Open analysis
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="size-4" />
              Move to project
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {analysis.projectId && (
                <>
                  <DropdownMenuItem onClick={() => moveToProject(undefined)}>
                    Remove from project
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {projects?.length ? (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project._id}
                    onClick={() => moveToProject(project._id)}
                  >
                    {project.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function HistorySection({
  title,
  items,
  projects,
  pathname,
  onNavigate,
}: {
  title: string;
  items: Analysis[];
  projects: Doc<"projects">[] | undefined;
  pathname: string;
  onNavigate: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="mb-1 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((analysis) => (
          <HistoryRow
            key={analysis._id}
            analysis={analysis}
            projects={projects}
            active={pathname === `/analysis/${analysis._id}`}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function SidebarHistory() {
  const sessionToken = useSessionToken();
  const pathname = usePathname();
  const { collapsed, selectedProjectId, setMobileOpen } = useSidebar();

  const analyses = useQuery(
    api.analyses.listRecent,
    sessionToken
      ? {
          sessionToken,
          limit: 30,
          projectId: selectedProjectId ?? undefined,
        }
      : "skip"
  );
  const projects = useQuery(
    api.projects.list,
    sessionToken ? { sessionToken } : "skip"
  );

  if (collapsed) return null;

  const groups = groupByRelativeDay(analyses ?? [], (a) => a.createdAt);
  const onNavigate = () => setMobileOpen(false);

  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-border/60 pt-3">
      <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
        Library
      </div>
      {!analyses?.length ? (
        <p className="px-3 text-xs text-muted-foreground">
          No analyses yet. Paste a tweet to start.
        </p>
      ) : (
        <>
          <HistorySection
            title="Today"
            items={groups.today}
            projects={projects}
            pathname={pathname}
            onNavigate={onNavigate}
          />
          <HistorySection
            title="Yesterday"
            items={groups.yesterday}
            projects={projects}
            pathname={pathname}
            onNavigate={onNavigate}
          />
          <HistorySection
            title="Earlier"
            items={groups.earlier}
            projects={projects}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </>
      )}
    </div>
  );
}
