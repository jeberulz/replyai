"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ds/button";
import { ProgressBar } from "@/components/ds/progress-bar";
import { TextInput } from "@/components/ds/text-input";
import { cn } from "@/lib/utils";
import {
  EVAL_EXPERIMENT_STATUSES,
  EVAL_KINDS,
  type EvalExperimentStatus,
  type EvalKind,
} from "../../../../shared/evalLab";
import {
  evalProgressPercent,
  filterEvalExperiments,
  type EvalExperimentListItem,
} from "../../../../shared/evalLabUi";
import {
  cancelEvalExperimentAction,
  startEvalExperimentAction,
} from "@/app/(app)/evals/actions";
import { EvalStatusToken } from "./eval-status-token";

export function ExperimentTable({
  experiments,
}: {
  experiments: EvalExperimentListItem[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | EvalKind>("all");
  const [status, setStatus] = useState<"all" | EvalExperimentStatus>("all");
  const filtered = useMemo(
    () => filterEvalExperiments(experiments, { query, kind, status }),
    [experiments, kind, query, status]
  );

  return (
    <section
      aria-labelledby="eval-experiments-title"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2
            id="eval-experiments-title"
            className="text-sm font-semibold text-foreground"
          >
            Experiments
          </h2>
          <p className="text-xs text-muted-foreground">
            Operator-only runs. Identities stay blinded until later review WPs.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem] md:w-[38rem]">
          <label className="sr-only" htmlFor="eval-search">
            Search experiments
          </label>
          <TextInput
            id="eval-search"
            label="Search experiments"
            isLabelHidden
            value={query}
            onChange={(value) => setQuery(value)}
            placeholder="Search name, dataset, candidate…"
            size="sm"
          />
          <label className="sr-only" htmlFor="eval-kind-filter">
            Filter by kind
          </label>
          <select
            id="eval-kind-filter"
            value={kind}
            onChange={(event) => setKind(event.target.value as "all" | EvalKind)}
            className="h-9 rounded-md border border-input bg-input px-2 text-sm text-foreground"
          >
            <option value="all">All kinds</option>
            {EVAL_KINDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="eval-status-filter">
            Filter by status
          </label>
          <select
            id="eval-status-filter"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | EvalExperimentStatus)
            }
            className="h-9 rounded-md border border-input bg-input px-2 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            {EVAL_EXPERIMENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-t border-border/60 p-8 text-sm text-muted-foreground">
          No experiments match these filters.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <HeaderCell>Experiment</HeaderCell>
                  <HeaderCell>Dataset</HeaderCell>
                  <HeaderCell>Candidates</HeaderCell>
                  <HeaderCell>Run</HeaderCell>
                  <HeaderCell>Budget</HeaderCell>
                  <HeaderCell className="text-right">Actions</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {filtered.map((experiment) => (
                  <ExperimentRow key={experiment.id} experiment={experiment} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {filtered.map((experiment) => (
              <MobileExperimentRow
                key={experiment.id}
                experiment={experiment}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-3 py-2 font-medium", className)}>{children}</th>;
}

function ExperimentRow({ experiment }: { experiment: EvalExperimentListItem }) {
  return (
    <tr className="align-top hover:bg-accent/40">
      <td className="px-3 py-3">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{experiment.name}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {experiment.kind} · cases {experiment.caseLimit}
          </div>
          <EvalStatusToken status={experiment.status} />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="text-foreground">{experiment.datasetName}</div>
        <div className="font-mono text-xs text-muted-foreground">
          v{experiment.datasetVersion} · {experiment.datasetCaseCount} cases
        </div>
      </td>
      <td className="max-w-[18rem] px-3 py-3">
        <div className="line-clamp-2 text-muted-foreground">
          {experiment.candidateLabels.join(" · ")}
        </div>
      </td>
      <td className="w-56 px-3 py-3">
        <RunProgress experiment={experiment} />
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        ${experiment.budgetUsd.toFixed(2)}
        <br />
        c{experiment.concurrency}
      </td>
      <td className="px-3 py-3">
        <ExperimentActions experiment={experiment} align="end" />
      </td>
    </tr>
  );
}

function MobileExperimentRow({
  experiment,
}: {
  experiment: EvalExperimentListItem;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {experiment.name}
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            {experiment.kind} · {experiment.datasetName} v
            {experiment.datasetVersion}
          </p>
        </div>
        <EvalStatusToken status={experiment.status} />
      </div>
      <RunProgress experiment={experiment} />
      <p className="text-sm text-muted-foreground">
        {experiment.candidateLabels.join(" · ")}
      </p>
      <ExperimentActions experiment={experiment} />
    </article>
  );
}

function RunProgress({ experiment }: { experiment: EvalExperimentListItem }) {
  const percent = evalProgressPercent(experiment.run);
  const counts = experiment.run?.counts;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <EvalStatusToken status={experiment.run?.status ?? experiment.status} />
        <span className="font-mono text-xs text-muted-foreground">
          {percent}%
        </span>
      </div>
      <ProgressBar
        value={percent}
        label={`${experiment.name} progress`}
        isLabelHidden
      />
      <div className="font-mono text-[11px] text-muted-foreground">
        {counts
          ? `${counts.completed} done · ${counts.failed} failed · ${counts.excluded} excluded`
          : "No run started"}
      </div>
      {experiment.run?.error ? (
        <div className="text-xs text-destructive">{experiment.run.error}</div>
      ) : null}
    </div>
  );
}

function ExperimentActions({
  experiment,
  align = "start",
}: {
  experiment: EvalExperimentListItem;
  align?: "start" | "end";
}) {
  const canStart = ["draft", "ready", "failed"].includes(experiment.status);
  const canCancel = ["ready", "running"].includes(experiment.status);
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        align === "end" && "justify-end"
      )}
    >
      <Link
        href={`/evals/new?kind=${experiment.kind}&datasetId=${experiment.datasetId}`}
        className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-9"
      >
        Clone setup
      </Link>
      {experiment.run ? (
        <Link
          href={`/evals/${experiment.id}/review`}
          className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-9"
        >
          Review
        </Link>
      ) : null}
      {canStart ? (
        <form action={startEvalExperimentAction}>
          <input type="hidden" name="experimentId" value={experiment.id} />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            label="Start"
            className="min-h-11 md:min-h-9"
          >
            Start
          </Button>
        </form>
      ) : null}
      {canCancel ? (
        <form action={cancelEvalExperimentAction}>
          <input type="hidden" name="experimentId" value={experiment.id} />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            label="Cancel"
            className="min-h-11 md:min-h-9"
          >
            Cancel
          </Button>
        </form>
      ) : null}
    </div>
  );
}
