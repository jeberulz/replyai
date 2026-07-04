import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ModelEval } from "@/components/app/model-eval";
import { OptionsPanel } from "@/components/app/options-panel";
import { ScoreBadge } from "@/components/app/score-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";
import { formatCount, timeAgo } from "@/lib/utils";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { id } = await params;
  const { sessionToken } = session;
  const convex = convexServer();

  let analysis;
  try {
    analysis = await convex.query(api.analyses.get, {
      sessionToken,
      analysisId: id as Id<"tweetAnalyses">,
    });
  } catch {
    notFound();
  }
  if (!analysis) notFound();

  const [options, voiceProfiles, me] = await Promise.all([
    convex.query(api.replies.listByAnalysis, {
      sessionToken,
      analysisId: analysis._id,
    }),
    convex.query(api.voiceProfiles.list, { sessionToken }),
    convex.query(api.users.me, { sessionToken }),
  ]);

  const { tweet, score } = analysis;
  const factors: Array<[string, number]> = [
    ["Reply timing", score.factors.replyTiming],
    ["Growth velocity", score.factors.growthVelocity],
    ["Audience size", score.factors.audienceSize],
    ["Topic relevance", score.factors.topicRelevance],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Left column: the tweet + analysis */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {tweet.authorName}{" "}
                  <span className="font-normal text-muted-foreground">
                    @{tweet.authorHandle}
                  </span>
                </CardTitle>
                {analysis.tweetUrl && (
                  <a
                    href={analysis.tweetUrl}
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

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Worth replying?</CardTitle>
                <ScoreBadge value={score.value} reason={score.reason} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{score.reason}</p>
              <div className="grid grid-cols-2 gap-3">
                {factors.map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="tabular-nums">{Math.round(value * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(value * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversation breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <Badge variant="secondary" className="mb-1.5">Summary</Badge>
                <p className="text-muted-foreground">{analysis.summary}</p>
              </div>
              <div>
                <Badge variant="secondary" className="mb-1.5">Author&apos;s stance</Badge>
                <p className="text-muted-foreground">{analysis.stance}</p>
              </div>
              <Separator />
              <div>
                <Badge variant="secondary" className="mb-1.5">
                  Opinions already taken
                </Badge>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {analysis.existingOpinions.map((opinion, i) => (
                    <li key={i}>{opinion}</li>
                  ))}
                </ul>
              </div>
              <div>
                <Badge className="mb-1.5">Missing angles — your openings</Badge>
                <ul className="list-disc space-y-1 pl-5">
                  {analysis.missingAngles.map((angle, i) => (
                    <li key={i}>{angle}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: generated options */}
        <div>
          <OptionsPanel
            analysisId={String(analysis._id)}
            /* Only thread the reply when we have a real X tweet ID; pasted-text
               entries use a "manual-*" sentinel and publish standalone. */
            targetTweetId={/^\d+$/.test(analysis.tweetId) ? analysis.tweetId : ""}
            voiceProfiles={voiceProfiles.map((p) => ({
              _id: String(p._id),
              name: p.name,
              isDefault: p.isDefault,
            }))}
            initialOptions={options.map((o) => ({
              _id: String(o._id),
              kind: o.kind,
              category: o.category,
              content: o.content,
              reason: o.reason,
              editedBeforeSend: o.editedBeforeSend,
            }))}
            isDemo={session.user.isDemo}
            defaultModel={me?.defaultModel}
          />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Nothing is posted without your explicit click on that specific reply.
          </p>
          <div className="mt-6">
            <ModelEval
              analysisId={String(analysis._id)}
              defaultModel={me?.defaultModel}
            />
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/analyze"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Analyze another tweet
        </Link>
      </div>
    </div>
  );
}
