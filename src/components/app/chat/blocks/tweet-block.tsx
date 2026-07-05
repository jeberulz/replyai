import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCount, timeAgo } from "@/lib/utils";

type TweetSnapshot = {
  authorName: string;
  authorHandle: string;
  authorFollowers: number;
  text: string;
  postedAt: number;
  likes: number;
  replies: number;
  mediaText?: string;
};

export function TweetBlock({
  tweet,
  tweetUrl,
}: {
  tweet: TweetSnapshot;
  tweetUrl?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {tweet.authorName}{" "}
            <span className="font-normal text-muted-foreground">
              @{tweet.authorHandle}
            </span>
          </CardTitle>
          {tweetUrl && (
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-4" />
            </a>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCount(tweet.authorFollowers)} followers ·{" "}
          {timeAgo(tweet.postedAt)} · {formatCount(tweet.likes)} likes ·{" "}
          {formatCount(tweet.replies)} replies
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {tweet.text}
        </p>
        {tweet.mediaText && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium">Image text:</span> {tweet.mediaText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
