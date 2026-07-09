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
import { Badge } from "@/components/ds/badge";
import { Button } from "@/components/ds/button";
import { Card } from "@/components/ds/card";
import { IconButton } from "@/components/ds/icon-button";
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
      const result = await watchResearchProfileAction(profile._id);
      const seededKeywords = result?.seededKeywords ?? [];
      toast.success(
        seededKeywords.length > 0
          ? `@${profile.handle} added to watched accounts and seeded ${seededKeywords.join(", ")}`
          : `@${profile.handle} added to watched accounts`
      );
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
          <IconButton
            label={`Open @${profile.handle} on X`}
            icon={<ArrowUpRight className="size-[17px]" />}
            variant="ghost"
            size="sm"
            href={`https://x.com/${profile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      />
      <PaneTitleRow title="Profile suggestion">
        {profile.status === "watching" && (
          <Badge
            variant="neutral"
            label="Watching"
            icon={<Eye className="size-3" />}
          />
        )}
      </PaneTitleRow>

      <PaneBody className="space-y-4">
        <Card padding={3}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0 text-sm">
                <span className="font-semibold">{profile.displayName}</span>{" "}
                <span className="text-muted-foreground">@{profile.handle}</span>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
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
          </div>
        </Card>

        <Card padding={3}>
          <div className="space-y-3">
            <PaneEyebrow>Why this account</PaneEyebrow>
            <p className="text-base leading-6">{profile.reason}</p>
            {profile.topicTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {profile.topicTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="neutral"
                      label={tag}
                      className="font-mono text-xs"
                    />
                  ))}
                </div>
                {profile.status === "suggested" && (
                  <p className="text-xs text-muted-foreground">
                    Watching also adds these tags to your scanner topics.
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {profile.exampleTweets.length > 0 && (
          <div className="space-y-2.5">
            <PaneEyebrow>Recent posts</PaneEyebrow>
            {profile.exampleTweets.map((tweet) => (
              <Card key={tweet.tweetId} padding={3}>
                <p className="whitespace-pre-wrap text-base leading-6 text-muted-foreground">
                  {tweet.text}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                  <Heart className="size-3" />
                  {formatCount(tweet.likes)} likes
                </p>
              </Card>
            ))}
          </div>
        )}
      </PaneBody>

      <PaneActionBar note="Suggest only — watching never follows or posts anything on your behalf.">
        {profile.status === "suggested" && (
          <Button
            label="Watch + seed topics"
            icon={<Eye className="size-3.5" />}
            onClick={watch}
            isDisabled={pending}
            className="w-full sm:flex-1"
          />
        )}
        <Button
          variant="secondary"
          label="Analyze top tweet"
          icon={<ArrowRight className="size-3.5" />}
          href={analyzeUrl}
          as={Link}
          isDisabled={pending}
          className="w-full sm:w-auto"
        />
        {profile.status === "suggested" && (
          <Button
            variant="ghost"
            label="Pass"
            icon={<X className="size-3.5" />}
            onClick={pass}
            isDisabled={pending}
            className="w-full sm:w-auto"
          />
        )}
      </PaneActionBar>
    </Pane>
  );
}
