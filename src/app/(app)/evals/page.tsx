import Link from "next/link";
import { ExperimentTable } from "@/components/app/evals/experiment-table";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ds/button";
import { getEvalLabShellData } from "./actions";

export const dynamic = "force-dynamic";

export default async function EvalsPage() {
  const data = await getEvalLabShellData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation Lab"
        title="Model experiments"
        description="Operator-only shell for setting up and controlling bounded eval runs. Review and result analysis land in later work packages."
      >
        <Button
          as={Link}
          href="/evals/new"
          variant="primary"
          size="lg"
          label="New experiment"
          className="min-h-11"
        >
          New experiment
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Experiments" value={data.experiments.length} />
        <Metric label="Datasets" value={data.datasets.length} />
        <Metric label="Catalog candidates" value={data.catalog.length} />
      </div>

      <ExperimentTable experiments={data.experiments} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl text-foreground">{value}</div>
    </div>
  );
}
