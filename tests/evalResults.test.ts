import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEvalResultsSummary,
  confidenceIntervals,
  evalDecisionEvidenceHash,
  latestJudgmentRevisions,
  type EvalResultJudgmentInput,
  type EvalResultOutputInput,
} from "../shared/evalResults";

const generationOutput = (args: {
  id: string;
  caseId: string;
  candidateCatalogId: string;
  blindKey: string;
  status?: EvalResultOutputInput["status"];
}): EvalResultOutputInput => ({
  id: args.id,
  caseId: args.caseId,
  candidateCatalogId: args.candidateCatalogId,
  candidateLabel: `${args.candidateCatalogId} label`,
  blindKey: args.blindKey,
  kind: "generation",
  status: args.status ?? "completed",
});

const discoveryOutput = (args: {
  id: string;
  caseId: string;
  candidateCatalogId: string;
  blindKey: string;
  status?: EvalResultOutputInput["status"];
}): EvalResultOutputInput => ({
  id: args.id,
  caseId: args.caseId,
  candidateCatalogId: args.candidateCatalogId,
  candidateLabel: `${args.candidateCatalogId} label`,
  blindKey: args.blindKey,
  kind: "discovery",
  status: args.status ?? "completed",
});

const judgment = (
  overrides: Partial<EvalResultJudgmentInput>
): EvalResultJudgmentInput => ({
  id: "judgment_1",
  caseId: "case_1",
  reviewerUserId: "user_1",
  kind: "generation",
  blindOrder: ["blind_a", "blind_b"],
  choice: "a",
  reasonCodes: ["clearer_angle"],
  revision: 1,
  submittedAt: 1,
  ...overrides,
});

describe("WP48 eval result aggregation", () => {
  it("uses the latest reviewer revision and scores generation choices", () => {
    const summary = buildEvalResultsSummary({
      minSampleSize: 3,
      outputs: [
        generationOutput({
          id: "out_1",
          caseId: "case_1",
          candidateCatalogId: "generation:a",
          blindKey: "blind_a",
        }),
        generationOutput({
          id: "out_2",
          caseId: "case_1",
          candidateCatalogId: "generation:b",
          blindKey: "blind_b",
        }),
      ],
      judgments: [
        judgment({ id: "old", choice: "a", revision: 1, submittedAt: 1 }),
        judgment({ id: "new", choice: "b", revision: 2, submittedAt: 2 }),
        judgment({
          id: "peer",
          reviewerUserId: "user_2",
          choice: "tie",
          revision: 1,
          submittedAt: 3,
        }),
      ],
    });

    expect(summary.totals).toMatchObject({
      outputs: 2,
      completed: 2,
      judgments: 2,
      scoredJudgments: 2,
    });
    expect(summary.candidates).toEqual([
      expect.objectContaining({
        candidateCatalogId: "generation:b",
        numerator: 1.5,
        denominator: 2,
        rate: 0.75,
        warning: "min_sample",
      }),
      expect.objectContaining({
        candidateCatalogId: "generation:a",
        numerator: 0.5,
        denominator: 2,
        rate: 0.25,
        warning: "min_sample",
      }),
    ]);
  });

  it("keeps failed and excluded outputs out of denominators", () => {
    const summary = buildEvalResultsSummary({
      outputs: [
        generationOutput({
          id: "out_1",
          caseId: "case_1",
          candidateCatalogId: "generation:a",
          blindKey: "blind_a",
          status: "failed",
        }),
        generationOutput({
          id: "out_2",
          caseId: "case_1",
          candidateCatalogId: "generation:b",
          blindKey: "blind_b",
        }),
        generationOutput({
          id: "out_3",
          caseId: "case_2",
          candidateCatalogId: "generation:a",
          blindKey: "blind_a2",
          status: "excluded",
        }),
      ],
      judgments: [judgment({ choice: "b" })],
    });

    const failed = summary.candidates.find(
      (candidate) => candidate.candidateCatalogId === "generation:a"
    );
    expect(failed).toMatchObject({
      failures: 1,
      exclusions: 1,
      denominator: 0,
      rate: null,
      confidence: { wilson: null, simple: null },
    });
    expect(summary.totals.scoredJudgments).toBe(0);
  });

  it("scores discovery relevance judgments and preserves unsafe labels as audit data only", () => {
    const summary = buildEvalResultsSummary({
      minSampleSize: 2,
      outputs: [
        discoveryOutput({
          id: "out_1",
          caseId: "case_1",
          candidateCatalogId: "discovery:a",
          blindKey: "blind_a",
        }),
        discoveryOutput({
          id: "out_2",
          caseId: "case_2",
          candidateCatalogId: "discovery:a",
          blindKey: "blind_b",
        }),
      ],
      judgments: [
        judgment({
          id: "j1",
          kind: "discovery",
          blindOrder: ["blind_a"],
          choice: "relevant",
          labels: { actionable: true, unsafe: true },
        }),
        judgment({
          id: "j2",
          caseId: "case_2",
          kind: "discovery",
          blindOrder: ["blind_b"],
          choice: "not_relevant",
          labels: { duplicate: true },
        }),
      ],
    });

    expect(summary.candidates[0]).toMatchObject({
      candidateCatalogId: "discovery:a",
      numerator: 1,
      denominator: 2,
      rate: 0.5,
      warning: null,
    });
  });

  it("returns confidence intervals only for valid rates", () => {
    const valid = confidenceIntervals({ numerator: 7, denominator: 10 });
    expect(valid.wilson).toMatchObject({
      method: "wilson",
      level: 0.95,
    });
    expect(valid.wilson?.lower).toBeGreaterThanOrEqual(0);
    expect(valid.wilson?.upper).toBeLessThanOrEqual(1);
    expect(valid.simple).toMatchObject({ method: "simple" });

    expect(confidenceIntervals({ numerator: 2, denominator: 0 })).toEqual({
      wilson: null,
      simple: null,
    });
    expect(confidenceIntervals({ numerator: 5, denominator: 2 })).toEqual({
      wilson: null,
      simple: null,
    });
  });

  it("deduplicates latest revisions by reviewer/case/blind order", () => {
    expect(
      latestJudgmentRevisions([
        judgment({ id: "a", revision: 1, submittedAt: 1 }),
        judgment({ id: "b", revision: 1, submittedAt: 2 }),
        judgment({ id: "c", revision: 2, submittedAt: 1 }),
        judgment({
          id: "d",
          reviewerUserId: "other",
          revision: 1,
          submittedAt: 3,
        }),
      ]).map((item) => item.id)
    ).toEqual(["c", "d"]);
  });

  it("builds stable decision evidence hashes without exposing raw output text", () => {
    const hash = evalDecisionEvidenceHash({
      experimentId: "experiment_1",
      runId: "run_1",
      decision: "promote_to_shadow",
      rationale: "Best candidate cleared the sample threshold.",
      sampleSize: 10,
      candidateSummaries: [
        {
          candidateCatalogId: "generation:a",
          numerator: 8,
          denominator: 10,
          failures: 0,
          exclusions: 1,
        },
      ],
    });
    expect(hash).toMatch(/^wp48_/);
    expect(hash).toBe(
      evalDecisionEvidenceHash({
        experimentId: "experiment_1",
        runId: "run_1",
        decision: "promote_to_shadow",
        rationale: "Best candidate cleared the sample threshold.",
        sampleSize: 10,
        candidateSummaries: [
          {
            candidateCatalogId: "generation:a",
            numerator: 8,
            denominator: 10,
            failures: 0,
            exclusions: 1,
          },
        ],
      })
    );
  });
});

describe("WP48 results route and Convex boundaries", () => {
  it("keeps result functions operator-authorized, redacted, and append-only", () => {
    const convex = readFileSync("convex/evalResults.ts", "utf8");
    expect(convex).toContain("requireEvalOperator");
    expect(convex).toContain("export const summary = query");
    expect(convex).toContain("export const exportRedacted = query");
    expect(convex).toContain("export const recordDecision = mutation");
    expect(convex).toContain('ctx.db.insert("evalDecisions"');
    expect(convex).not.toContain("ctx.db.patch(experiment");
    expect(convex).not.toContain("ctx.db.patch(run");
    expect(convex).not.toContain("evalRouting");

    const exportSource = convex.slice(
      convex.indexOf("export const exportRedacted"),
      convex.indexOf("export const recordDecision")
    );
    expect(exportSource).toContain("redacted-results.json");
    expect(exportSource).toContain("redacted-results.csv");
    expect(exportSource).toContain("buildDrilldown");
  });

  it("adds a result page, export route, decision action, and table link without changing blind review payloads", () => {
    const page = readFileSync(
      "src/app/(app)/evals/[experimentId]/page.tsx",
      "utf8"
    );
    const actions = readFileSync(
      "src/app/(app)/evals/[experimentId]/actions.ts",
      "utf8"
    );
    const route = readFileSync(
      "src/app/(app)/evals/[experimentId]/export/[format]/route.ts",
      "utf8"
    );
    const component = readFileSync(
      "src/components/app/evals/results/results-workspace.tsx",
      "utf8"
    );
    const table = readFileSync(
      "src/components/app/evals/experiment-table.tsx",
      "utf8"
    );
    const reviewConvex = readFileSync("convex/evalReview.ts", "utf8");

    expect(page).toContain('dynamic = "force-dynamic"');
    expect(actions).toContain("api.evalResults.summary");
    expect(actions).toContain("api.evalResults.recordDecision");
    expect(route).toContain("api.evalResults.exportRedacted");
    expect(route).toContain("content-disposition");
    expect(component).toContain("Candidate statistics");
    expect(component).toContain("Explicit decision record");
    expect(component).toContain("Redacted drill-down");
    expect(component).toContain("providerId");
    expect(component).toContain("modelId");
    expect(table).toContain("Results");
    expect(table).toContain("Review");

    const queueSource = reviewConvex.slice(
      reviewConvex.indexOf("export const queue"),
      reviewConvex.indexOf("export const submit")
    );
    expect(queueSource).not.toContain("candidateSnapshots");
    expect(queueSource).not.toContain("modelId");
    expect(queueSource).not.toContain("providerId");
  });
});
