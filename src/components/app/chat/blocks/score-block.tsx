import { ScoreBadge } from "@/components/app/score-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Score = {
  value: number;
  reason: string;
  factors: {
    audienceSize: number;
    topicRelevance: number;
    replyTiming: number;
    growthVelocity: number;
  };
};

export function ScoreBlock({ score }: { score: Score }) {
  const factors: Array<[string, number]> = [
    ["Reply timing", score.factors.replyTiming],
    ["Growth velocity", score.factors.growthVelocity],
    ["Audience size", score.factors.audienceSize],
    ["Topic relevance", score.factors.topicRelevance],
  ];

  return (
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
  );
}
