import { ExperimentSetupForm } from "@/components/app/evals/experiment-setup-form";
import { PageHeader } from "@/components/app/page-header";
import { parseEvalKind } from "../../../../../shared/evalLabUi";
import { getEvalLabSetupData } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEvalExperimentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; datasetId?: string }>;
}) {
  const params = await searchParams;
  const data = await getEvalLabSetupData();
  const initialKind = parseEvalKind(params.kind) ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation Lab"
        title="New experiment"
        description="Freeze a versioned dataset, select catalog candidates, cap spend/concurrency, and explicitly decide whether to start the run."
      />
      <ExperimentSetupForm
        catalog={data.catalog}
        datasets={data.datasets}
        initialKind={initialKind}
        initialDatasetId={params.datasetId}
      />
    </div>
  );
}
