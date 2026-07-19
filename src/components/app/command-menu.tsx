"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { visibleNavLinks } from "@/components/app/sidebar/nav-links";
import { useSidebar } from "@/components/app/sidebar/sidebar-provider";
import {
  buildAnalyzeDeepLink,
  buildOpportunityDeepLink,
  extractTweetUrlFromQuery,
  filterOpportunitiesForPalette,
} from "@/lib/commandPalette";

export function CommandMenu({
  evalOperator = false,
}: {
  evalOperator?: boolean;
}) {
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
  const [pendingVoice, startVoiceTransition] = useTransition();
  const setDefaultVoice = useMutation(api.voiceProfiles.setDefault);

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

  const tweetUrl = useMemo(() => extractTweetUrlFromQuery(query), [query]);

  const analyses = useQuery(
    api.analyses.search,
    sessionToken && debouncedQuery.trim() && !tweetUrl
      ? { sessionToken, query: debouncedQuery.trim(), limit: 8 }
      : "skip"
  );
  const projects = useQuery(
    api.projects.list,
    sessionToken && commandOpen ? { sessionToken } : "skip"
  );
  const opportunities = useQuery(
    api.opportunities.list,
    sessionToken && commandOpen ? { sessionToken, limit: 40 } : "skip"
  );
  const voiceProfiles = useQuery(
    api.voiceProfiles.list,
    sessionToken && commandOpen ? { sessionToken } : "skip"
  );

  const opportunityHits = useMemo(
    () =>
      filterOpportunitiesForPalette(
        (opportunities ?? []).map((o) => ({
          _id: o._id,
          authorHandle: o.authorHandle,
          text: o.text,
          score: o.score,
          effectiveScore: o.effectiveScore,
        })),
        tweetUrl ? "" : debouncedQuery,
        8
      ),
    [opportunities, debouncedQuery, tweetUrl]
  );

  const defaultVoice =
    voiceProfiles?.find((p) => p.isDefault) ?? voiceProfiles?.[0];
  const pageLinks = useMemo(
    () => visibleNavLinks({ evalOperator }),
    [evalOperator]
  );

  function navigate(href: string) {
    setCommandOpen(false);
    setQuery("");
    setMobileOpen(false);
    router.push(href);
  }

  function analyzeFromUrl(url: string) {
    navigate(buildAnalyzeDeepLink(url));
  }

  function switchVoice(profileId: Id<"voiceProfiles">, name: string) {
    if (!sessionToken) return;
    startVoiceTransition(async () => {
      try {
        await setDefaultVoice({ sessionToken, profileId });
        toast.success(`"${name}" is now default`);
        setCommandOpen(false);
        setQuery("");
      } catch {
        toast.error("Could not switch voice profile");
      }
    });
  }

  const emptyHint = tweetUrl
    ? "Press Enter to analyze this tweet."
    : debouncedQuery.trim()
      ? "No matches. Paste an x.com status URL, search opportunities, or pick a page."
      : "Paste a tweet URL, jump to an opportunity, or switch voice.";

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => {
        setCommandOpen(open);
        if (!open) setQuery("");
      }}
    >
      <CommandInput
        placeholder="Paste tweet URL, search opportunities, switch voice…"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === "Enter" && tweetUrl) {
            // Prefer analyze when a status URL is in the input (cmdk may also
            // select the matching item; this covers Enter with no item focus).
            e.preventDefault();
            analyzeFromUrl(tweetUrl);
          }
        }}
      />
      <CommandList className="max-h-[min(300px,70vh)] overflow-x-hidden overflow-y-auto">
        <CommandEmpty>{emptyHint}</CommandEmpty>

        {tweetUrl && (
          <CommandGroup heading="Analyze">
            <CommandItem
              value={`analyze tweet ${tweetUrl}`}
              onSelect={() => analyzeFromUrl(tweetUrl)}
            >
              <span className="truncate">Analyze tweet → start analysis</span>
            </CommandItem>
          </CommandGroup>
        )}

        {!tweetUrl && opportunityHits.length > 0 && (
          <CommandGroup heading="Opportunities">
            {opportunityHits.map((opp) => (
              <CommandItem
                key={opp._id}
                value={`opportunity @${opp.authorHandle} ${opp.text}`}
                onSelect={() => navigate(buildOpportunityDeepLink(opp._id))}
              >
                <span className="font-mono text-xs text-primary">
                  {Math.round(opp.effectiveScore ?? opp.score)}
                </span>
                <span className="min-w-0 truncate">
                  @{opp.authorHandle}: {opp.text}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!tweetUrl && analyses && analyses.length > 0 && (
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
                <span className="min-w-0 truncate">
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

        {voiceProfiles && voiceProfiles.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup
              heading={
                defaultVoice
                  ? `Voice (active: ${defaultVoice.name})`
                  : "Voice"
              }
            >
              {voiceProfiles.map((profile) => (
                <CommandItem
                  key={profile._id}
                  value={`voice ${profile.name}${profile.isDefault ? " default active" : ""}`}
                  disabled={pendingVoice || profile.isDefault}
                  onSelect={() => {
                    if (profile.isDefault) return;
                    switchVoice(profile._id, profile.name);
                  }}
                >
                  <span className="min-w-0 truncate">{profile.name}</span>
                  {profile.isDefault && (
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      active
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Pages">
          {pageLinks.map((link) => (
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
