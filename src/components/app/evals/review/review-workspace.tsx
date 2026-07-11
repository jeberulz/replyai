import Link from "next/link";
import { Button } from "@/components/ds/button";
import {
  EVAL_DISCOVERY_LABELS,
  EVAL_GENERATION_REASON_CODES,
  type EvalReviewCaseContext,
  type EvalReviewItem,
} from "../../../../../shared/evalReview";
import { submitEvalReviewAction } from "@/app/(app)/evals/[experimentId]/review/actions";

type ReviewItemWithAudit = EvalReviewItem & {
  judgmentCount: number;
  reviewerRevisionCount: number;
  latestReviewerChoice?: string;
  latestReviewerSubmittedAt?: number;
};

export function ReviewWorkspace({
  experiment,
  run,
  items,
}: {
  experiment: {
    _id: string;
    name: string;
    kind: "generation" | "discovery" | "pipeline";
    status: string;
    promptVersion: string;
    schemaVersion: string;
  };
  run: {
    _id: string;
    status: string;
    counts: {
      total: number;
      queued: number;
      running: number;
      completed: number;
      failed: number;
      excluded: number;
    };
  } | null;
  items: ReviewItemWithAudit[];
}) {
  if (experiment.kind === "pipeline") {
    return (
      <EmptyReviewState
        title="Pipeline review is intentionally deferred"
        description="WP47 covers blind generation and discovery review only. Pipeline scoring waits for the results and decision work packages."
        experimentId={experiment._id}
      />
    );
  }

  if (!run) {
    return (
      <EmptyReviewState
        title="No run outputs yet"
        description="Start the experiment first. This page reviews existing completed outputs only and never kicks off generation."
        experimentId={experiment._id}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyReviewState
        title="No reviewable completed outputs"
        description="The run may still be queued/running, or the completed outputs may not have enough blind peers for this review type."
        experimentId={experiment._id}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ReviewRunSummary
        status={run.status}
        counts={run.counts}
        itemCount={items.length}
      />
      <div className="grid gap-4">
        {items.map((item, index) =>
          item.kind === "generation" ? (
            <GenerationReviewCard
              key={item.assignmentId}
              experimentId={experiment._id}
              runId={run._id}
              item={item}
              ordinal={index + 1}
            />
          ) : (
            <DiscoveryReviewCard
              key={item.assignmentId}
              experimentId={experiment._id}
              runId={run._id}
              item={item}
              ordinal={index + 1}
            />
          )
        )}
      </div>
    </div>
  );
}

function ReviewRunSummary({
  status,
  counts,
  itemCount,
}: {
  status: string;
  counts: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    excluded: number;
  };
  itemCount: number;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Run status" value={status} />
        <Metric label="Review items" value={String(itemCount)} />
        <Metric label="Completed outputs" value={String(counts.completed)} />
        <Metric
          label="Failed/excluded"
          value={`${counts.failed}/${counts.excluded}`}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Candidate provider/model identities are not rendered here. Labels A and
        B come from stored blind keys and stay opaque until the later reveal
        flow.
      </p>
    </section>
  );
}

function GenerationReviewCard({
  experimentId,
  runId,
  item,
  ordinal,
}: {
  experimentId: string;
  runId: string;
  item: Extract<ReviewItemWithAudit, { kind: "generation" }>;
  ordinal: number;
}) {
  return (
    <article className="rounded-xl border border-border bg-card">
      <ReviewCardHeader item={item} ordinal={ordinal} title="A/B generation" />
      <ContextPanel context={item.context} />
      <div className="grid gap-3 border-t border-border p-3 lg:grid-cols-2">
        {item.outputs.map((output) => (
          <section
            key={output.blindKey}
            aria-labelledby={`${item.assignmentId}-${output.blindLabel}`}
            className="rounded-lg border border-border bg-muted/30 p-3"
          >
            <h3
              id={`${item.assignmentId}-${output.blindLabel}`}
              className="font-mono text-xs uppercase tracking-[0.12em] text-primary"
            >
              Candidate {output.blindLabel}
            </h3>
            <div className="mt-3 space-y-3">
              {output.options.map((option, index) => (
                <div
                  key={`${option.category}-${index}`}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {option.category}
                  </div>
                  <p className="mt-2 max-w-[55ch] text-sm leading-6 text-foreground">
                    {option.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Reason: {option.reason}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <form action={submitEvalReviewAction} className="border-t border-border p-3">
        <HiddenReviewFields
          experimentId={experimentId}
          runId={runId}
          item={item}
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Which blind output would you ship?
          </legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["a", "A"],
              ["b", "B"],
              ["tie", "Tie"],
              ["neither", "Neither"],
            ].map(([value, label]) => (
              <RadioTile key={value} name="choice" value={value} label={label} />
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Reason codes
          </legend>
          <div className="grid gap-2 md:grid-cols-3">
            {EVAL_GENERATION_REASON_CODES.map((code) => (
              <CheckboxTile
                key={code}
                name="reasonCodes"
                value={code}
                label={humanize(code)}
              />
            ))}
          </div>
        </fieldset>
        <ReviewSubmitBar item={item} />
      </form>
    </article>
  );
}

function DiscoveryReviewCard({
  experimentId,
  runId,
  item,
  ordinal,
}: {
  experimentId: string;
  runId: string;
  item: Extract<ReviewItemWithAudit, { kind: "discovery" }>;
  ordinal: number;
}) {
  return (
    <article className="rounded-xl border border-border bg-card">
      <ReviewCardHeader item={item} ordinal={ordinal} title="Discovery review" />
      <ContextPanel context={item.context} />
      <section className="border-t border-border p-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-primary">
          Blind discovery output
        </h3>
        <div className="mt-3 grid gap-3">
          {item.output.candidates.map((candidate, index) => (
            <div
              key={`${candidate.tweetId ?? candidate.postUrl ?? index}`}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Candidate {index + 1}
              </div>
              <p className="mt-2 text-sm text-foreground">
                @{candidate.authorHandle ?? "unknown"}
              </p>
              {candidate.postUrl ? (
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {candidate.postUrl}
                </p>
              ) : null}
              {candidate.relevanceReason ? (
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {candidate.relevanceReason}
                </p>
              ) : null}
              {candidate.missingAngle ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Missing angle: {candidate.missingAngle}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <form action={submitEvalReviewAction} className="border-t border-border p-3">
        <HiddenReviewFields
          experimentId={experimentId}
          runId={runId}
          item={item}
        />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Is this discovery relevant?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <RadioTile name="choice" value="relevant" label="Relevant" />
            <RadioTile
              name="choice"
              value="not_relevant"
              label="Not relevant"
            />
          </div>
        </fieldset>
        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Optional labels
          </legend>
          <div className="grid gap-2 md:grid-cols-5">
            {EVAL_DISCOVERY_LABELS.map((label) => (
              <CheckboxTile
                key={label}
                name={`label:${label}`}
                value="on"
                label={humanize(label)}
              />
            ))}
          </div>
        </fieldset>
        <ReviewSubmitBar item={item} />
      </form>
    </article>
  );
}

function ReviewCardHeader({
  item,
  ordinal,
  title,
}: {
  item: ReviewItemWithAudit;
  ordinal: number;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-border p-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Review item {ordinal}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Stored blind order is locked for this assignment.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <AuditPill label={`${item.judgmentCount} total judgments`} />
        <AuditPill label={`${item.reviewerRevisionCount} yours`} />
        {item.latestReviewerChoice ? (
          <AuditPill label={`latest: ${item.latestReviewerChoice}`} />
        ) : null}
      </div>
    </header>
  );
}

function ContextPanel({ context }: { context: EvalReviewCaseContext }) {
  const hasContext =
    context.topic ||
    context.query ||
    context.tweetText ||
    context.authorHandle ||
    context.sourceTweetId;
  if (!hasContext) return null;
  return (
    <section className="grid gap-3 p-3 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Case context
        </div>
        <dl className="mt-2 space-y-2 text-sm">
          {context.topic ? <MetaRow label="Topic" value={context.topic} /> : null}
          {context.query ? <MetaRow label="Query" value={context.query} /> : null}
          {context.authorHandle ? (
            <MetaRow label="Author" value={`@${context.authorHandle}`} />
          ) : null}
          {context.sourceTweetId ? (
            <MetaRow label="Tweet" value={context.sourceTweetId} />
          ) : null}
        </dl>
      </div>
      {context.tweetText ? (
        <blockquote className="rounded-lg border border-border bg-background p-3 text-sm leading-6 text-foreground">
          {context.tweetText}
        </blockquote>
      ) : null}
    </section>
  );
}

function HiddenReviewFields({
  experimentId,
  runId,
  item,
}: {
  experimentId: string;
  runId: string;
  item: ReviewItemWithAudit;
}) {
  return (
    <>
      <input type="hidden" name="experimentId" value={experimentId} />
      <input type="hidden" name="runId" value={runId} />
      <input type="hidden" name="assignmentId" value={item.assignmentId} />
      <input type="hidden" name="kind" value={item.kind} />
    </>
  );
}

function ReviewSubmitBar({ item }: { item: ReviewItemWithAudit }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-muted-foreground">
        Submitting appends an auditable judgment revision; it never overwrites
        another reviewer’s record or reveals candidate identity.
      </p>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        label={
          item.reviewerRevisionCount > 0
            ? "Submit new revision"
            : "Submit judgment"
        }
        className="min-h-11"
      >
        {item.reviewerRevisionCount > 0
          ? "Submit new revision"
          : "Submit judgment"}
      </Button>
    </div>
  );
}

function RadioTile({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-sm text-foreground hover:bg-accent/50 focus-within:border-primary">
      <input type="radio" name={name} value={value} required />
      <span>{label}</span>
    </label>
  );
}

function CheckboxTile({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 text-sm text-foreground hover:bg-accent/50 focus-within:border-primary">
      <input type="checkbox" name={name} value={value} />
      <span>{label}</span>
    </label>
  );
}

function EmptyReviewState({
  title,
  description,
  experimentId,
}: {
  title: string;
  description: string;
  experimentId: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-[55ch] text-sm text-muted-foreground">
        {description}
      </p>
      <Link
        href="/evals"
        className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Back to lab
      </Link>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        Experiment {experimentId}
      </p>
    </section>
  );
}

function AuditPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl text-foreground">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function humanize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
