"use client";

import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, formatCount } from "@/lib/utils";

export type ResearchProfile = {
  _id: string;
  handle: string;
  displayName: string;
  bio?: string;
  followers: number;
  avgLikes: number;
  postFrequency?: string;
  topicTags: string[];
  reason: string;
  exampleTweets: { tweetId: string; text: string; likes: number }[];
  status: "suggested" | "watching" | "passed";
};

/** Compact selectable row for the research suggestions list (left column). */
export function ProfileRow({
  profile,
  selected,
  onSelect,
}: {
  profile: ResearchProfile;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      data-testid={`research-profile-row-${profile._id}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30",
        selected && "border-primary/60 ring-1 ring-primary/40"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm">
          <span className="font-medium">{profile.displayName}</span>{" "}
          <span className="text-muted-foreground">@{profile.handle}</span>
        </p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatCount(profile.followers)} followers · ~
          {formatCount(profile.avgLikes)} avg likes
          {profile.postFrequency ? ` · ${profile.postFrequency}` : ""}
        </p>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {profile.reason}
        </p>
      </div>
      {profile.status === "watching" && (
        <Badge variant="secondary" className="shrink-0">
          <Eye className="size-3" />
          Watching
        </Badge>
      )}
    </div>
  );
}
