import type { EvalKind } from "./evalLab";
import { stableEvalHash } from "./evalRunner";

export const EVAL_GENERATION_REVIEW_CHOICES = [
  "a",
  "b",
  "tie",
  "neither",
] as const;
export type EvalGenerationReviewChoice =
  (typeof EVAL_GENERATION_REVIEW_CHOICES)[number];

export const EVAL_DISCOVERY_REVIEW_CHOICES = [
  "relevant",
  "not_relevant",
] as const;
export type EvalDiscoveryReviewChoice =
  (typeof EVAL_DISCOVERY_REVIEW_CHOICES)[number];

export type EvalReviewChoice =
  | EvalGenerationReviewChoice
  | EvalDiscoveryReviewChoice;

export const EVAL_GENERATION_REASON_CODES = [
  "more_specific",
  "stronger_voice",
  "clearer_angle",
  "better_timing",
  "safer",
  "less_generic",
  "invalid_output",
  "both_strong",
  "both_weak",
] as const;

export const EVAL_DISCOVERY_LABELS = [
  "actionable",
  "novel",
  "unsafe",
  "stale",
  "duplicate",
] as const;
export type EvalDiscoveryLabel = (typeof EVAL_DISCOVERY_LABELS)[number];
export type EvalDiscoveryLabelState = Partial<
  Record<EvalDiscoveryLabel, boolean>
>;

export type EvalReviewOutputInput = {
  id: string;
  caseId: string;
  blindKey: string;
  kind: EvalKind;
  status: "queued" | "running" | "completed" | "failed" | "excluded";
  inputSnapshotJson?: string;
  normalizedOutputJson?: string;
  error?: string;
};

export type EvalReviewCaseContext = {
  topic?: string;
  tweetText?: string;
  query?: string;
  authorHandle?: string;
  sourceTweetId?: string;
};

export type EvalReviewGenerationOutput = {
  blindLabel: "A" | "B";
  blindKey: string;
  options: Array<{
    category: string;
    content: string;
    reason: string;
  }>;
};

export type EvalReviewDiscoveryOutput = {
  blindLabel: "A";
  blindKey: string;
  candidates: Array<{
    postUrl?: string;
    tweetId?: string;
    authorHandle?: string;
    relevanceReason?: string;
    missingAngle?: string;
    searchIntent?: string;
  }>;
};

export type EvalReviewItem =
  | {
      assignmentId: string;
      kind: "generation";
      caseId: string;
      context: EvalReviewCaseContext;
      blindOrder: string[];
      outputs: [EvalReviewGenerationOutput, EvalReviewGenerationOutput];
    }
  | {
      assignmentId: string;
      kind: "discovery";
      caseId: string;
      context: EvalReviewCaseContext;
      blindOrder: string[];
      output: EvalReviewDiscoveryOutput;
    };

export type EvalReviewSubmissionInput = {
  kind: "generation" | "discovery";
  choice: string;
  reasonCodes: string[];
  labels?: EvalDiscoveryLabelState;
};

export type EvalReviewValidationResult =
  | {
      ok: true;
      value: {
        choice: EvalReviewChoice;
        reasonCodes: string[];
        labels?: EvalDiscoveryLabelState;
      };
    }
  | { ok: false; errors: string[] };

export function buildEvalReviewItems(args: {
  kind: EvalKind;
  seed: string;
  runId: string;
  outputs: readonly EvalReviewOutputInput[];
  limit?: number;
}): EvalReviewItem[] {
  if (args.kind === "generation") return buildGenerationItems(args);
  if (args.kind === "discovery") return buildDiscoveryItems(args);
  return [];
}

export function reviewAssignmentId(args: {
  kind: "generation" | "discovery";
  runId: string;
  caseId: string;
  blindOrder: readonly string[];
}): string {
  return [
    args.kind,
    args.runId,
    args.caseId,
    stableEvalHash(args.blindOrder.join("|")),
  ].join(":");
}

export function validateEvalReviewSubmission(
  input: EvalReviewSubmissionInput
): EvalReviewValidationResult {
  const errors: string[] = [];
  const reasonCodes = uniqueCleanStrings(input.reasonCodes);

  if (input.kind === "generation") {
    if (
      !EVAL_GENERATION_REVIEW_CHOICES.includes(
        input.choice as EvalGenerationReviewChoice
      )
    ) {
      errors.push("Choose A, B, tie, or neither.");
    }
    if (reasonCodes.length === 0) {
      errors.push("Select at least one reason code.");
    }
    const unknownReasons = reasonCodes.filter(
      (code) =>
        !EVAL_GENERATION_REASON_CODES.includes(
          code as (typeof EVAL_GENERATION_REASON_CODES)[number]
        )
    );
    if (unknownReasons.length > 0) {
      errors.push(`Unknown reason code: ${unknownReasons.join(", ")}`);
    }
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      value: {
        choice: input.choice as EvalGenerationReviewChoice,
        reasonCodes,
      },
    };
  }

  if (
    !EVAL_DISCOVERY_REVIEW_CHOICES.includes(
      input.choice as EvalDiscoveryReviewChoice
    )
  ) {
    errors.push("Mark the discovered conversation relevant or not relevant.");
  }
  if (reasonCodes.length > 0) {
    errors.push("Discovery reviews use relevance plus optional labels.");
  }
  const labels = normalizeDiscoveryLabels(input.labels);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      choice: input.choice as EvalDiscoveryReviewChoice,
      reasonCodes: [],
      labels,
    },
  };
}

export function nextEvalReviewRevision(
  prior: readonly {
    reviewerUserId: string;
    blindOrder: readonly string[];
    revision: number;
  }[],
  reviewerUserId: string,
  blindOrder: readonly string[]
): number {
  const key = blindOrder.join("|");
  const latest = prior
    .filter(
      (judgment) =>
        judgment.reviewerUserId === reviewerUserId &&
        judgment.blindOrder.join("|") === key
    )
    .reduce((max, judgment) => Math.max(max, judgment.revision), 0);
  return latest + 1;
}

function buildGenerationItems(args: {
  kind: EvalKind;
  seed: string;
  runId: string;
  outputs: readonly EvalReviewOutputInput[];
  limit?: number;
}): EvalReviewItem[] {
  const groups = groupCompletedOutputs(args.outputs);
  const items: EvalReviewItem[] = [];
  for (const [caseId, outputs] of groups) {
    const ordered = blindSort(args.seed, caseId, outputs);
    if (ordered.length < 2) continue;
    const first = generationOutput("A", ordered[0]);
    const second = generationOutput("B", ordered[1]);
    if (!first || !second) continue;
    const blindOrder = [first.blindKey, second.blindKey];
    items.push({
      assignmentId: reviewAssignmentId({
        kind: "generation",
        runId: args.runId,
        caseId,
        blindOrder,
      }),
      kind: "generation",
      caseId,
      context: parseCaseContext(ordered[0].inputSnapshotJson),
      blindOrder,
      outputs: [first, second],
    });
    if (args.limit && items.length >= args.limit) break;
  }
  return items;
}

function buildDiscoveryItems(args: {
  kind: EvalKind;
  seed: string;
  runId: string;
  outputs: readonly EvalReviewOutputInput[];
  limit?: number;
}): EvalReviewItem[] {
  const groups = groupCompletedOutputs(args.outputs);
  const items: EvalReviewItem[] = [];
  for (const [caseId, outputs] of groups) {
    for (const output of blindSort(args.seed, caseId, outputs)) {
      const discovery = discoveryOutput(output);
      if (!discovery) continue;
      const blindOrder = [discovery.blindKey];
      items.push({
        assignmentId: reviewAssignmentId({
          kind: "discovery",
          runId: args.runId,
          caseId,
          blindOrder,
        }),
        kind: "discovery",
        caseId,
        context: parseCaseContext(output.inputSnapshotJson),
        blindOrder,
        output: discovery,
      });
      if (args.limit && items.length >= args.limit) return items;
    }
  }
  return items;
}

function groupCompletedOutputs(outputs: readonly EvalReviewOutputInput[]) {
  const groups = new Map<string, EvalReviewOutputInput[]>();
  for (const output of outputs) {
    if (output.status !== "completed" || !output.normalizedOutputJson) continue;
    const group = groups.get(output.caseId) ?? [];
    group.push(output);
    groups.set(output.caseId, group);
  }
  return groups;
}

function blindSort(
  seed: string,
  caseId: string,
  outputs: readonly EvalReviewOutputInput[]
): EvalReviewOutputInput[] {
  return [...outputs].sort((left, right) =>
    stableEvalHash(`${seed}:${caseId}:${left.blindKey}`).localeCompare(
      stableEvalHash(`${seed}:${caseId}:${right.blindKey}`)
    )
  );
}

function generationOutput(
  blindLabel: "A" | "B",
  output: EvalReviewOutputInput
): EvalReviewGenerationOutput | null {
  const parsed = parseJsonObject(output.normalizedOutputJson);
  const options = Array.isArray(parsed?.options)
    ? parsed.options
        .map((option) => ({
          category: stringField(option, "category"),
          content: stringField(option, "content"),
          reason: stringField(option, "reason"),
        }))
        .filter((option) => option.content)
    : [];
  if (options.length === 0) return null;
  return { blindLabel, blindKey: output.blindKey, options };
}

function discoveryOutput(
  output: EvalReviewOutputInput
): EvalReviewDiscoveryOutput | null {
  const parsed = parseJsonObject(output.normalizedOutputJson);
  const candidates = Array.isArray(parsed?.candidates)
    ? parsed.candidates.map((candidate) => ({
        postUrl: optionalStringField(candidate, "postUrl"),
        tweetId: optionalStringField(candidate, "tweetId"),
        authorHandle: optionalStringField(candidate, "authorHandle"),
        relevanceReason: optionalStringField(candidate, "relevanceReason"),
        missingAngle: optionalStringField(candidate, "missingAngle"),
        searchIntent: optionalStringField(candidate, "searchIntent"),
      }))
    : [];
  if (candidates.length === 0) return null;
  return { blindLabel: "A", blindKey: output.blindKey, candidates };
}

function parseCaseContext(snapshotJson?: string): EvalReviewCaseContext {
  const parsed = parseJsonObject(snapshotJson);
  if (!parsed) return {};
  return {
    topic: optionalStringField(parsed, "topic"),
    tweetText: optionalStringField(parsed, "tweetText"),
    query: optionalStringField(parsed, "query"),
    authorHandle: optionalStringField(parsed, "authorHandle"),
    sourceTweetId: optionalStringField(parsed, "sourceTweetId"),
  };
}

function parseJsonObject(value?: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringField(value: unknown, field: string): string {
  return optionalStringField(value, field) ?? "";
}

function optionalStringField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "string" ? candidate : undefined;
}

function uniqueCleanStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeDiscoveryLabels(
  labels?: EvalDiscoveryLabelState
): EvalDiscoveryLabelState {
  const normalized: EvalDiscoveryLabelState = {};
  for (const label of EVAL_DISCOVERY_LABELS) {
    if (labels?.[label]) normalized[label] = true;
  }
  return normalized;
}
