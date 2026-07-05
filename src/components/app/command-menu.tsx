"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/components/app/convex-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navLinks } from "@/components/app/sidebar/nav-links";
import { useSidebar } from "@/components/app/sidebar/sidebar-provider";

export function CommandMenu() {
  const router = useRouter();
  const sessionToken = useSessionToken();
  const {
    commandOpen,
    setCommandOpen,
    setSelectedProjectId,
    setMobileOpen,
  } = useSidebar();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  const analyses = useQuery(
    api.analyses.search,
    sessionToken && debouncedQuery.trim()
      ? { sessionToken, query: debouncedQuery.trim(), limit: 8 }
      : "skip"
  );
  const projects = useQuery(
    api.projects.list,
    sessionToken && commandOpen ? { sessionToken } : "skip"
  );

  function navigate(href: string) {
    setCommandOpen(false);
    setQuery("");
    setMobileOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => {
        setCommandOpen(open);
        if (!open) setQuery("");
      }}
    >
      <CommandInput
        placeholder="Search analyses, pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {debouncedQuery.trim()
            ? "No analyses match that search."
            : "Type to search analyses, or pick a page below."}
        </CommandEmpty>

        {analyses && analyses.length > 0 && (
          <CommandGroup heading="Analyses">
            {analyses.map((analysis) => (
              <CommandItem
                key={analysis._id}
                value={`${analysis.tweet.authorHandle} ${analysis.tweet.text} ${analysis.topic}`}
                onSelect={() => navigate(`/analysis/${analysis._id}`)}
              >
                <span className="font-mono text-xs text-primary">
                  {analysis.score.value}
                </span>
                <span className="truncate">
                  @{analysis.tweet.authorHandle}: {analysis.tweet.text}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project._id}
                  value={project.name}
                  onSelect={() => {
                    setSelectedProjectId(project._id);
                    setCommandOpen(false);
                    setQuery("");
                    navigate("/dashboard");
                  }}
                >
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Pages">
          {navLinks.map((link) => (
            <CommandItem
              key={link.href}
              value={link.label}
              onSelect={() => navigate(link.href)}
            >
              {link.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="analyze tweet paste url new analysis"
            onSelect={() => navigate("/dashboard")}
          >
            New analysis…
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
