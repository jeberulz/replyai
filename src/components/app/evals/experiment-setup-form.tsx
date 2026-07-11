"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ds/button";
import { cn } from "@/lib/utils";
import {
  EVAL_KINDS,
  type EvalCandidateCatalogEntry,
  type EvalKind,
} from "../../../../shared/evalLab";
import {
  EVAL_RUNNER_LIMITS,
} from "../../../../shared/evalRunner";
import {
  estimateEvalSetupCostUsd,
  type EvalDatasetOption,
} from "../../../../shared/evalLabUi";
import {
  createEvalExperimentAction,
  type EvalSetupActionState,
} from "@/app/(app)/evals/actions";

const initialActionState: EvalSetupActionState = {
  ok: false,
  errors: [],
  values: {
    name: "",
    kind: "generation",
    datasetId: "",
    candidateCatalogIds: [],
    promptVersion: "prompt:v1",
    schemaVersion: "schema:v1",
    seed: "wp46-seed-v1",
    budgetUsd: "1",
    concurrency: "2",
    caseLimit: "10",
    startNow: false,
  },
};

export function ExperimentSetupForm({
  catalog,
  datasets,
  initialKind,
  initialDatasetId,
}: {
  catalog: EvalCandidateCatalogEntry[];
  datasets: EvalDatasetOption[];
  initialKind?: EvalKind;
  initialDatasetId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createEvalExperimentAction,
    initialActionState
  );
  const [kind, setKind] = useState<EvalKind>(
    initialKind ?? state.values.kind ?? "generation"
  );
  const [datasetId, setDatasetId] = useState(
    initialDatasetId ?? state.values.datasetId
  );
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>(
    state.values.candidateCatalogIds
  );
  const [budgetUsd, setBudgetUsd] = useState(state.values.budgetUsd);
  const [caseLimit, setCaseLimit] = useState(state.values.caseLimit);

  const datasetsForKind = datasets.filter((dataset) => dataset.kind === kind);
  const selectedDataset = datasetsForKind.find(
    (dataset) => dataset.id === datasetId
  );
  const candidatesForKind = catalog.filter((candidate) => candidate.kind === kind);
  const costPreview = useMemo(
    () =>
      estimateEvalSetupCostUsd({
        catalog,
        candidateCatalogIds: selectedCandidates,
        caseLimit: Number(caseLimit),
        budgetUsd: Number(budgetUsd),
      }),
    [budgetUsd, caseLimit, catalog, selectedCandidates]
  );

  function toggleCandidate(candidateId: string) {
    setSelectedCandidates((current) =>
      current.includes(candidateId)
        ? current.filter((item) => item !== candidateId)
        : [...current, candidateId]
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="space-y-4">
        {state.errors.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p className="font-medium">Fix the setup before creating a run.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            1. Experiment identity
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FormInput
              name="name"
              label="Experiment name"
              defaultValue={state.values.name}
              placeholder="Grok discovery bakeoff"
              required
            />
            <FormInput
              name="seed"
              label="Stored seed"
              defaultValue={state.values.seed}
              description="Reused by the runner to keep case/candidate order stable."
            />
            <FormInput
              name="promptVersion"
              label="Prompt version"
              defaultValue={state.values.promptVersion}
            />
            <FormInput
              name="schemaVersion"
              label="Schema version"
              defaultValue={state.values.schemaVersion}
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            2. Versioned dataset
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Kind</span>
              <select
                name="kind"
                value={kind}
                onChange={(event) => {
                  const nextKind = event.target.value as EvalKind;
                  setKind(nextKind);
                  setDatasetId("");
                  setSelectedCandidates([]);
                }}
                className="min-h-11 w-full rounded-md border border-input bg-input px-3 text-foreground"
              >
                {EVAL_KINDS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Dataset version</span>
              <select
                name="datasetId"
                value={datasetId}
                onChange={(event) => setDatasetId(event.target.value)}
                className="min-h-11 w-full rounded-md border border-input bg-input px-3 text-foreground"
                required
              >
                <option value="">Choose a dataset…</option>
                {datasetsForKind.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} · v{dataset.version} · {dataset.caseCount} cases
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedDataset ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {selectedDataset.description || "No description"} · hash{" "}
              <span className="font-mono">{selectedDataset.datasetHash}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No {kind} datasets available yet. Seed datasets through the eval
              domain before creating a run.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            3. Candidate catalog
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browser input submits catalog IDs only; provider/model snapshots are
            frozen server-side by the eval domain.
          </p>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {candidatesForKind.map((candidate) => {
              const selected = selectedCandidates.includes(candidate.id);
              return (
                <label
                  key={candidate.id}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-accent/50"
                  )}
                >
                  <input
                    type="checkbox"
                    name="candidateCatalogIds"
                    value={candidate.id}
                    checked={selected}
                    onChange={() => toggleCandidate(candidate.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium text-foreground">
                    {candidate.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {candidate.description}
                  </span>
                  <span className="mt-2 block font-mono text-[11px] text-muted-foreground">
                    {candidate.id}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">
            4. Caps + explicit start
          </h2>
          <div className="mt-4 space-y-3">
            <FormInput
              name="budgetUsd"
              label="Budget cap (USD)"
              value={budgetUsd}
              onChange={(event) => setBudgetUsd(event.target.value)}
              description={`Hard cap: $${EVAL_RUNNER_LIMITS.maxBudgetUsd}.`}
            />
            <FormInput
              name="caseLimit"
              label="Case count"
              value={caseLimit}
              onChange={(event) => setCaseLimit(event.target.value)}
              description={`Max ${Math.min(
                selectedDataset?.caseCount ?? EVAL_RUNNER_LIMITS.maxCaseLimit,
                EVAL_RUNNER_LIMITS.maxCaseLimit
              )} for this setup.`}
            />
            <FormInput
              name="concurrency"
              label="Concurrency"
              defaultValue={state.values.concurrency}
              description={`1–${EVAL_RUNNER_LIMITS.maxConcurrency} bounded workers.`}
            />
          </div>
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Conservative cost preview
            </div>
            <div className="mt-1 font-mono text-2xl text-foreground">
              ${costPreview.toFixed(4)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview is capped by the entered budget and candidate price
              snapshots; the runner still enforces spend at execution time.
            </p>
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <input
              type="checkbox"
              name="startNow"
              defaultChecked={state.values.startNow}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-foreground">
                Create and start now
              </span>
              <span className="text-muted-foreground">
                Otherwise the experiment stays draft until Start is clicked.
              </span>
            </span>
          </label>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={pending ? "Creating…" : "Create experiment"}
              isDisabled={pending}
              className="min-h-11"
            >
              {pending ? "Creating…" : "Create experiment"}
            </Button>
            <Link
              href="/evals"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Back to lab
            </Link>
          </div>
        </section>
      </aside>
    </form>
  );
}

function FormInput({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
}) {
  return (
    <label className={cn("space-y-1 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <input
        {...props}
        className="min-h-11 w-full rounded-md border border-input bg-input px-3 text-foreground placeholder:text-muted-foreground"
      />
      {description ? (
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      ) : null}
    </label>
  );
}
