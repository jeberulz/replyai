import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { AnalyzeForm } from "@/components/app/analyze-form";
import { ScoreBadge } from "@/components/app/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/");
  const { url } = await searchParams;

  const recent = await convexServer().query(api.analyses.listRecent, {
    sessionToken: session.sessionToken,
    limit: 5,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyze a tweet</h1>
        <p className="mt-1 text-muted-foreground">
          Paste the tweet&apos;s text (add the URL to publish threaded).
          You&apos;ll get a conversation breakdown, a worth-replying score, and
          3 replies + 3 quote tweets in your voice.
        </p>
      </div>

      <AnalyzeForm initialUrl={url} />

      {recent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent analyses
          </h2>
          {recent.map((analysis) => (
            <Link key={analysis._id} href={`/analysis/${analysis._id}`}>
              <Card className="mb-3 transition-colors hover:bg-accent/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <ScoreBadge
                    value={analysis.score.value}
                    reason={analysis.score.reason}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      @{analysis.tweet.authorHandle}: {analysis.tweet.text}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {analysis.topic} · {timeAgo(analysis.createdAt)}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
