"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, ArrowUpRight, Eye, Heart, X } from "lucide-react";
import { toast } from "sonner";

import {
  passResearchProfileAction,
  watchResearchProfileAction,
} from "@/app/actions";
import {
  Pane,
  PaneActionBar,
  PaneBody,
  PaneEyebrow,
  PaneHeader,
  PaneTabPill,
  PaneTitleRow,
} from "@/components/app/split/pane-chrome";
import { XLogo } from "@/components/app/x-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCount } from "@/lib/utils";
import type { ResearchProfile } from "./profile-row";

/** Right-pane detail for a suggested profile — matches the shared Pane chrome. */
export function ProfileDetail({
  profile,
  onPassed,
}: {
  profile: ResearchProfile;
  onPassed: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const watch = () =>
    startTransition(async () => {
      await watchResearchProfileAction(profile._id);
      toast.success(`@${profile.handle} added to watched accounts`);
    });

  const pass = () =>
    startTransition(async () => {
      await passResearchProfileAction(profile._id);
      toast.message(`Passed on @${profile.handle}`);
      onPassed();
    });

  const topTweet = profile.exampleTweets[0];
  const analyzeUrl = topTweet
    ? `/dashboard?url=${encodeURIComponent(
        `https://x.com/${profile.handle}/status/${topTweet.tweetId}`
      )}`
    : "/dashboard";

  return (
    <Pane>
      <PaneHeader
        tab={
          <PaneTabPill icon={<XLogo className="size-3.5" />}>
            @{profile.handle}
          </PaneTabPill>
        }
        actions={
          <a
            href={`https://x.com/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open @${profile.handle} on X`}
            className="transition-colors hover:text-foreground"
          >
            <ArrowUpRight className="size-[17px]" />
          </a>
        }
      />
      <PaneTitleRow title="Profile suggestion">
        {profile.status === "watching" && (
          <Badge variant="secondary">
            <Eye className="size-3" />
            Watching
          </Badge>
        )}
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0 text-sm">
                <span className="font-semibold">{profile.displayName}</span>{" "}
                <span className="text-muted-foreground">@{profile.handle}</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {formatCount(profile.followers)} followers · ~
                {formatCount(profile.avgLikes)} avg likes
                {profile.postFrequency ? ` · ${profile.postFrequency}` : ""}
              </span>
            </div>
            {profile.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <PaneEyebrow>Why this account</PaneEyebrow>
            <p className="text-[15px] leading-normal">{profile.reason}</p>
            {profile.topicTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.topicTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="font-mono text-[0.65rem]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {profile.exampleTweets.length > 0 && (
          <div className="space-y-2.5">
            <PaneEyebrow>Recent posts</PaneEyebrow>
            {profile.exampleTweets.map((tweet) => (
              <blockquote
                key={tweet.tweetId}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <p className="whitespace-pre-wrap text-sm leading-normal text-muted-foreground">
                  {tweet.text}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <Heart className="size-3" />
                  {formatCount(tweet.likes)} likes
                </p>
              </blockquote>
            ))}
          </div>
        )}
      </PaneBody>

      <PaneActionBar note="Suggest only — watching never follows or posts anything on your behalf.">
        {profile.status === "suggested" && (
          <Button onClick={watch} disabled={pending} className="w-full sm:flex-1">
            <Eye />
            Watch
          </Button>
        )}
        <Button
          variant="outline"
          asChild
          disabled={pending}
          className="w-full sm:w-auto"
        >
          <Link href={analyzeUrl}>
            <ArrowRight />
            Analyze top tweet
          </Link>
        </Button>
        {profile.status === "suggested" && (
          <Button
            variant="ghost"
            onClick={pass}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            <X />
            Pass
          </Button>
        )}
      </PaneActionBar>
    </Pane>
  );
}
