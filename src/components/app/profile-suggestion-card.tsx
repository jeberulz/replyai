"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Eye, X } from "lucide-react";
import { toast } from "sonner";
import {
  passResearchProfileAction,
  watchResearchProfileAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@/lib/utils";

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

export function ProfileSuggestionCard({
  profile,
  disabled,
}: {
  profile: ResearchProfile;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const busy = pending || disabled;

  const watch = () => {
    startTransition(async () => {
      const result = await watchResearchProfileAction(profile._id);
      const seededKeywords = result?.seededKeywords ?? [];
      toast.success(
        seededKeywords.length > 0
          ? `@${profile.handle} added to watched accounts and seeded ${seededKeywords.join(", ")}`
          : `@${profile.handle} added to watched accounts`
      );
    });
  };

  const pass = () => {
    startTransition(async () => {
      await passResearchProfileAction(profile._id);
      toast.message(`Passed on @${profile.handle}`);
    });
  };

  const topTweet = profile.exampleTweets[0];
  const analyzeUrl = topTweet
    ? `/dashboard?url=${encodeURIComponent(`https://x.com/${profile.handle}/status/${topTweet.tweetId}`)}`
    : `/dashboard`;

  if (profile.status === "passed") return null;

  return (
    <Card className={busy ? "opacity-60" : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {profile.displayName}{" "}
              <span className="font-normal text-muted-foreground">
                @{profile.handle}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCount(profile.followers)} followers · ~
              {formatCount(profile.avgLikes)} avg likes
              {profile.postFrequency ? ` · ${profile.postFrequency}` : ""}
            </p>
          </div>
          {profile.status === "watching" && (
            <Badge variant="secondary">Watching</Badge>
          )}
        </div>

        {profile.bio && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
        )}

        <p className="text-sm leading-relaxed">{profile.reason}</p>

        {profile.topicTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {profile.topicTags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-mono text-[0.65rem]">
                  {tag}
                </Badge>
              ))}
            </div>
            {profile.status === "suggested" && (
              <p className="text-xs text-muted-foreground">
                Watching also adds these tags to your scanner topics.
              </p>
            )}
          </div>
        )}

        {profile.status === "watching" && (
          <p className="text-xs text-muted-foreground">
            Already in your watched accounts, so future scans can pull this author directly.
          </p>
        )}

        {topTweet && (
          <blockquote className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <p className="line-clamp-3">{topTweet.text}</p>
            <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider">
              {formatCount(topTweet.likes)} likes
            </p>
          </blockquote>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {profile.status === "suggested" && (
            <>
              <Button size="sm" onClick={watch} disabled={busy}>
                <Eye />
                Watch + seed topics
              </Button>
              <Button size="sm" variant="outline" onClick={pass} disabled={busy}>
                <X />
                Pass
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" asChild disabled={busy}>
            <Link href={analyzeUrl}>
              Analyze tweet
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
