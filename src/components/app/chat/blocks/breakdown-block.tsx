import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Breakdown = {
  summary: string;
  stance: string;
  existingOpinions: string[];
  missingAngles: string[];
};

export function BreakdownBlock({
  breakdown,
  pending,
}: {
  breakdown: Breakdown;
  /** True while the AI breakdown stage is still running. */
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conversation breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {pending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <p className="text-xs text-muted-foreground">
              Reading the conversation…
            </p>
          </div>
        ) : (
          <>
            <div>
              <Badge variant="secondary" className="mb-1.5">
                Summary
              </Badge>
              <p className="text-muted-foreground">{breakdown.summary}</p>
            </div>
            <div>
              <Badge variant="secondary" className="mb-1.5">
                Author&apos;s stance
              </Badge>
              <p className="text-muted-foreground">{breakdown.stance}</p>
            </div>
            <Separator />
            <div>
              <Badge variant="secondary" className="mb-1.5">
                Opinions already taken
              </Badge>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {breakdown.existingOpinions.map((opinion, i) => (
                  <li key={i}>{opinion}</li>
                ))}
              </ul>
            </div>
            <div>
              <Badge className="mb-1.5">Missing angles — your openings</Badge>
              <ul className="list-disc space-y-1 pl-5">
                {breakdown.missingAngles.map((angle, i) => (
                  <li key={i}>{angle}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
