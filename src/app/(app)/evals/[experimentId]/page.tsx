import Link from "next/link";
import { ResultsWorkspace } from "@/components/app/evals/results/results-workspace";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ds/button";
import { getEvalResultsData } from "./actions";

export const dynamic = "force-dynamic";

export default async function EvalResultsPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  const data = await getEvalResultsData(experimentId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation Lab · Results"
        title={data.experiment.name}
        description="Operator-only result analysis. Candidate identities are revealed here after review; blind review payloads remain unchanged."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            as={Link}
            href={`/evals/${experimentId}/review`}
            variant="secondary"
            size="lg"
            label="Blind review"
            className="min-h-11"
          >
            Blind review
          </Button>
          <Button
            as={Link}
            href="/evals"
            variant="secondary"
            size="lg"
            label="Back to lab"
            className="min-h-11"
          >
            Back to lab
          </Button>
        </div>
      </PageHeader>

      <ResultsWorkspace data={data} />
    </div>
  );
}
