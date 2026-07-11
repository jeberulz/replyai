import Link from "next/link";
import { Button } from "@/components/ds/button";
import { EvalStatusToken } from "@/components/app/evals/eval-status-token";
import { recordEvalDecisionAction } from "@/app/(app)/evals/[experimentId]/actions";
import type { getEvalResultsData } from "@/app/(app)/evals/[experimentId]/actions";

type EvalResultsData = Awaited<ReturnType<typeof getEvalResultsData>>;
type CandidateSummary = EvalResultsData["summary"]["candidates"][number];
type DrilldownRow = EvalResultsData["drilldown"][number];

export function ResultsWorkspace({ data }: { data: EvalResultsData }) {
  return (
    <div className="space-y-6">
      <RunOverview data={data} />
      <CandidateResults data={data} />
      <DecisionPanel data={data} />
      <Drilldown rows={data.drilldown} />
    </div>
  );
}

function RunOverview({ data }: { data: EvalResultsData }) {
  const totals = data.summary.totals;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Run summary</h2>
          <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
            Results reconcile stored outputs with latest reviewer revisions.
            Failures and exclusions are shown separately from judged sample
            denominators.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/evals/${data.experiment._id}/export/json`}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Export JSON
          </Link>
          <Link
            href={`/evals/${data.experiment._id}/export/csv`}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Run status" value={data.run?.status ?? "no run"} />
        <Metric label="Outputs" value={String(totals.outputs)} />
        <Metric label="Completed" value={String(totals.completed)} />
        <Metric label="Failed/excluded" value={`${totals.failures}/${totals.exclusions}`} />
        <Metric label="Scored judgments" value={String(totals.scoredJudgments)} />
      </div>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-4">
        <Meta label="Kind" value={data.experiment.kind} />
        <Meta label="Prompt" value={data.experiment.promptVersion} />
        <Meta label="Schema" value={data.experiment.schemaVersion} />
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Experiment status
          </div>
          <div className="mt-1">
            <EvalStatusToken status={data.experiment.status} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CandidateResults({ data }: { data: EvalResultsData }) {
  if (data.summary.candidates.length === 0) {
    return (
      <EmptyPanel
        title="No outputs yet"
        description="Start or resume the experiment before evaluating results."
      />
    );
  }

  return (
    <section
      aria-labelledby="candidate-results-title"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="border-b border-border p-4">
        <h2
          id="candidate-results-title"
          className="text-lg font-semibold text-foreground"
        >
          Candidate statistics
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Numerator and denominator come from judged outputs only. Confidence
          intervals are omitted until the rate inputs are valid; min-sample
          warnings clear at {data.summary.minSampleSize} judgments.
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <HeaderCell>Candidate identity</HeaderCell>
              <HeaderCell>Observed score</HeaderCell>
              <HeaderCell>Wilson 95%</HeaderCell>
              <HeaderCell>Simple 95%</HeaderCell>
              <HeaderCell>Outputs</HeaderCell>
              <HeaderCell>Warnings</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {data.summary.candidates.map((candidate) => (
              <CandidateRow
                key={candidate.candidateCatalogId}
                candidate={candidate}
                identity={data.candidates.find(
                  (item) => item.catalogId === candidate.candidateCatalogId
                )}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border lg:hidden">
        {data.summary.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.candidateCatalogId}
            candidate={candidate}
            identity={data.candidates.find(
              (item) => item.catalogId === candidate.candidateCatalogId
            )}
          />
        ))}
      </div>
    </section>
  );
}

function CandidateRow({
  candidate,
  identity,
}: {
  candidate: CandidateSummary;
  identity?: EvalResultsData["candidates"][number];
}) {
  return (
    <tr className="align-top hover:bg-accent/40">
      <td className="max-w-[24rem] px-3 py-3">
        <CandidateIdentity candidate={candidate} identity={identity} />
      </td>
      <td className="px-3 py-3 font-mono text-sm text-foreground">
        {formatRatio(candidate.numerator, candidate.denominator)}
        <div className="mt-1 text-xs text-muted-foreground">
          {formatRate(candidate.rate)}
        </div>
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {formatInterval(candidate.confidence.wilson)}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {formatInterval(candidate.confidence.simple)}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {candidate.completed} completed
        <br />
        {candidate.failures} failed · {candidate.exclusions} excluded
      </td>
      <td className="px-3 py-3">
        <WarningToken warning={candidate.warning} />
      </td>
    </tr>
  );
}

function CandidateCard({
  candidate,
  identity,
}: {
  candidate: CandidateSummary;
  identity?: EvalResultsData["candidates"][number];
}) {
  return (
    <article className="space-y-3 p-4">
      <CandidateIdentity candidate={candidate} identity={identity} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric
          label="Observed score"
          value={formatRatio(candidate.numerator, candidate.denominator)}
        />
        <Metric label="Rate" value={formatRate(candidate.rate)} />
        <Metric label="Wilson 95%" value={formatInterval(candidate.confidence.wilson)} />
        <Metric label="Failed/excluded" value={`${candidate.failures}/${candidate.exclusions}`} />
      </div>
      <WarningToken warning={candidate.warning} />
    </article>
  );
}

function CandidateIdentity({
  candidate,
  identity,
}: {
  candidate: CandidateSummary;
  identity?: EvalResultsData["candidates"][number];
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="font-medium text-foreground">
          {identity?.label ?? candidate.candidateLabel}
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {candidate.candidateCatalogId}
        </div>
      </div>
      {identity ? (
        <div className="flex flex-wrap gap-2">
          {identity.stages.map((stage, index) => (
            <span
              key={`${stage.role}-${stage.modelId}-${index}`}
              className="rounded-full border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground"
            >
              {stage.role}: {stage.providerId}/{stage.modelId}
              {stage.reasoningEffort ? ` · ${stage.reasoningEffort}` : ""}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DecisionPanel({ data }: { data: EvalResultsData }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Explicit decision record
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recording a decision writes an evidence hash to `evalDecisions`.
            This page never mutates production routing or enables shadow or
            assisted paths.
          </p>
          <form action={recordEvalDecisionAction} className="mt-4 space-y-3">
            <input
              type="hidden"
              name="experimentId"
              value={data.experiment._id}
            />
            {data.run ? (
              <input type="hidden" name="runId" value={data.run._id} />
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Decision
              </span>
              <select
                name="decision"
                required
                className="mt-1 h-11 w-full rounded-md border border-input bg-input px-3 text-sm text-foreground"
              >
                <option value="promote_to_shadow">Promote to shadow</option>
                <option value="promote_to_assisted">Promote to assisted</option>
                <option value="retest">Retest</option>
                <option value="reject">Reject</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Evidence rationale
              </span>
              <textarea
                name="rationale"
                required
                minLength={12}
                rows={4}
                className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm leading-6 text-foreground"
                placeholder="Name the sample size, leading candidate, failures, exclusions, and why this decision follows."
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label="Record decision"
              className="min-h-11"
            >
              Record decision
            </Button>
          </form>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="text-sm font-semibold text-foreground">
            Prior decisions
          </h3>
          {data.decisions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No explicit decision has been recorded yet.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {data.decisions.map((decision) => (
                <article
                  key={decision._id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="font-mono text-xs uppercase tracking-[0.12em] text-primary">
                    {humanize(decision.decision)}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {decision.rationale}
                  </p>
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                    n={decision.sampleSize} · {decision.evidenceHash}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Drilldown({ rows }: { rows: DrilldownRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyPanel
        title="No drill-down rows"
        description="Completed, failed, and excluded outputs will appear here once a run exists."
      />
    );
  }
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">
          Redacted drill-down
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Case context, output previews, errors, and judgments are truncated and
          redacted for operator review.
        </p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <details key={row.outputId} className="group p-4">
            <summary className="flex cursor-pointer flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium text-foreground">
                  Case {row.caseOrdinal ?? row.caseId} · {row.candidateLabel}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {row.status} · {row.blindKey} · {row.judgments.length} judgments
                </div>
              </div>
              <WarningToken
                warning={row.status === "failed" || row.status === "excluded" ? row.status : null}
              />
            </summary>
            <div className="mt-4 grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <ContextBox row={row} />
              <OutputBox row={row} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function ContextBox({ row }: { row: DrilldownRow }) {
  const context = row.caseContext;
  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Case context
      </h3>
      <dl className="mt-3 space-y-2 text-sm">
        {context.topic ? <MetaRow label="Topic" value={context.topic} /> : null}
        {context.query ? <MetaRow label="Query" value={context.query} /> : null}
        {context.authorHandle ? (
          <MetaRow label="Author" value={`@${context.authorHandle}`} />
        ) : null}
        {context.sourceTweetId ? (
          <MetaRow label="Tweet" value={context.sourceTweetId} />
        ) : null}
      </dl>
      {context.tweetText ? (
        <blockquote className="mt-3 rounded-md border border-border bg-background p-3 text-sm leading-6 text-foreground">
          {context.tweetText}
        </blockquote>
      ) : null}
    </section>
  );
}

function OutputBox({ row }: { row: DrilldownRow }) {
  return (
    <section className="rounded-lg border border-border bg-background p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Meta label="Candidate" value={row.candidateCatalogId} />
        <Meta label="Cost" value={`$${row.costUsd.toFixed(4)}`} />
        <Meta label="Retry count" value={String(row.retryCount)} />
      </div>
      {row.error ? (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {row.error}
        </p>
      ) : null}
      <pre className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-foreground">
        {JSON.stringify(row.output, null, 2)}
      </pre>
      <div className="mt-3 grid gap-2">
        {row.judgments.map((judgment) => (
          <div
            key={judgment.judgmentId}
            className="rounded-md border border-border bg-muted/20 p-2 text-xs"
          >
            <span className="font-mono uppercase tracking-[0.12em] text-primary">
              {judgment.choice}
            </span>
            <span className="ml-2 text-muted-foreground">
              rev {judgment.revision} · {judgment.reasonCodes.join(", ") || "no reason codes"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl text-foreground">{value}</div>
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

function WarningToken({
  warning,
}: {
  warning: "min_sample" | "failed" | "excluded" | null;
}) {
  if (!warning) {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-300">
        valid
      </span>
    );
  }
  const label =
    warning === "min_sample" ? "minimum sample warning" : humanize(warning);
  return (
    <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
      {label}
    </span>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-[55ch] text-sm text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

function formatRatio(numerator: number, denominator: number) {
  if (denominator === 0) return "—";
  return `${formatNumber(numerator)} / ${denominator}`;
}

function formatRate(rate: number | null) {
  if (rate === null) return "No judged denominator";
  return `${Math.round(rate * 1000) / 10}%`;
}

function formatInterval(
  interval: { lower: number; upper: number } | null
) {
  if (!interval) return "—";
  return `${formatRate(interval.lower)}–${formatRate(interval.upper)}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function humanize(value: string) {
  return value.replace(/_/g, " ");
}
