import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EVAL_CANDIDATE_CATALOG,
  evalCandidatesForKind,
} from "../shared/evalLab";
import {
  estimateEvalSetupCostUsd,
  evalProgressPercent,
  filterEvalExperiments,
  validateEvalSetupInput,
  type EvalDatasetOption,
  type EvalExperimentListItem,
} from "../shared/evalLabUi";

const generationCandidate = evalCandidatesForKind("generation")[0];
const discoveryCandidate = evalCandidatesForKind("discovery")[0];

const datasets: EvalDatasetOption[] = [
  {
    id: "dataset_generation_v1",
    name: "Generation fixtures",
    kind: "generation",
    version: "1",
    sourcePolicy: "synthetic",
    caseCount: 12,
    datasetHash: "hash-gen",
  },
  {
    id: "dataset_discovery_v1",
    name: "Discovery fixtures",
    kind: "discovery",
    version: "1",
    sourcePolicy: "synthetic",
    caseCount: 8,
    datasetHash: "hash-disc",
  },
];

describe("WP46 eval setup validation", () => {
  it("accepts versioned datasets and catalog candidate IDs", () => {
    const result = validateEvalSetupInput({
      raw: {
        name: "Generation bakeoff",
        kind: "generation",
        datasetId: "dataset_generation_v1",
        candidateCatalogIds: [generationCandidate.id],
        promptVersion: "prompt:v1",
        schemaVersion: "schema:v1",
        seed: "seed-1",
        budgetUsd: "1",
        concurrency: "2",
        caseLimit: "10",
        startNow: "on",
      },
      datasets,
      catalog: EVAL_CANDIDATE_CATALOG,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        datasetId: "dataset_generation_v1",
        candidateCatalogIds: [generationCandidate.id],
        startNow: true,
      });
    }
  });

  it("rejects raw provider model IDs and kind/dataset mismatches", () => {
    const result = validateEvalSetupInput({
      raw: {
        name: "Bad discovery bakeoff",
        kind: "generation",
        datasetId: "dataset_discovery_v1",
        candidateCatalogIds: ["grok-4.3", discoveryCandidate.id],
        budgetUsd: "99",
        concurrency: "99",
        caseLimit: "99",
      },
      datasets,
      catalog: EVAL_CANDIDATE_CATALOG,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        "Dataset kind must match the experiment kind."
      );
      expect(result.errors.join(" ")).toContain("Unknown candidate");
      expect(result.errors).toContain("Budget cannot exceed $10.");
      expect(result.errors.join(" ")).toContain("Concurrency must be between");
    }
  });

  it("computes conservative preview, progress, and dense table filters", () => {
    expect(
      estimateEvalSetupCostUsd({
        catalog: EVAL_CANDIDATE_CATALOG,
        candidateCatalogIds: [generationCandidate.id],
        caseLimit: 10,
        budgetUsd: 0.001,
      })
    ).toBeLessThanOrEqual(0.001);

    expect(
      evalProgressPercent({
        counts: {
          total: 4,
          queued: 1,
          running: 0,
          completed: 2,
          failed: 1,
          excluded: 0,
        },
      })
    ).toBe(75);

    const rows: EvalExperimentListItem[] = [
      {
        id: "a",
        name: "Generation bakeoff",
        kind: "generation",
        status: "draft",
        datasetId: "dataset_generation_v1",
        datasetName: "Generation fixtures",
        datasetVersion: "1",
        datasetCaseCount: 12,
        candidateLabels: ["Claude"],
        candidateCatalogIds: [generationCandidate.id],
        budgetUsd: 1,
        concurrency: 2,
        caseLimit: 10,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "b",
        name: "Discovery run",
        kind: "discovery",
        status: "running",
        datasetId: "dataset_discovery_v1",
        datasetName: "Discovery fixtures",
        datasetVersion: "1",
        datasetCaseCount: 8,
        candidateLabels: ["Grok"],
        candidateCatalogIds: [discoveryCandidate.id],
        budgetUsd: 1,
        concurrency: 2,
        caseLimit: 8,
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    expect(
      filterEvalExperiments(rows, { query: "grok", kind: "all", status: "all" })
    ).toHaveLength(1);
    expect(
      filterEvalExperiments(rows, {
        kind: "generation",
        status: "draft",
      }).map((row) => row.id)
    ).toEqual(["a"]);
  });
});

describe("WP46 responsive and accessibility source contracts", () => {
  it("keeps the experiment shell table-based with labeled controls", () => {
    const tableSource = readFileSync(
      "src/components/app/evals/experiment-table.tsx",
      "utf8"
    );
    const formSource = readFileSync(
      "src/components/app/evals/experiment-setup-form.tsx",
      "utf8"
    );

    expect(tableSource).toContain("<table");
    expect(tableSource).toContain('htmlFor="eval-search"');
    expect(tableSource).toContain("md:hidden");
    expect(tableSource).toContain("min-h-11");
    expect(formSource).toContain("role=\"alert\"");
    expect(formSource).toContain("Create and start now");
    expect(formSource).toContain("min-h-11");
  });
});
