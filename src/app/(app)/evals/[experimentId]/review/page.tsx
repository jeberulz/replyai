import Link from "next/link";
import { ReviewWorkspace } from "@/components/app/evals/review/review-workspace";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ds/button";
import { getEvalReviewData } from "./actions";

export const dynamic = "force-dynamic";

export default async function EvalReviewPage({
  params,
}: {
  params: Promise<{ experimentId: string }>;
}) {
  const { experimentId } = await params;
  const data = await getEvalReviewData(experimentId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation Lab · Blind review"
        title={data.experiment.name}
        description="Review existing experiment outputs without provider or model identity. Stored blind keys drive candidate labels; judgments append as auditable records."
      >
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
      </PageHeader>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Meta label="Kind" value={data.experiment.kind} />
          <Meta label="Experiment status" value={data.experiment.status} />
          <Meta label="Prompt" value={data.experiment.promptVersion} />
          <Meta label="Schema" value={data.experiment.schemaVersion} />
        </div>
      </section>

      <ReviewWorkspace
        experiment={data.experiment}
        run={data.run}
        items={data.items}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}
