import { describe, expect, test } from "vitest";
import {
  EVAL_CANDIDATE_CATALOG,
  evalCandidatesForKind,
  freezeEvalCandidateSnapshot,
  validateEvalCandidateIds,
} from "../shared/evalLab";

describe("eval lab catalog helpers", () => {
  test("exposes generation, discovery, and pipeline catalog IDs", () => {
    expect(evalCandidatesForKind("generation").length).toBeGreaterThan(0);
    expect(evalCandidatesForKind("discovery").length).toBeGreaterThan(0);
    expect(evalCandidatesForKind("pipeline").length).toBeGreaterThan(0);
    expect(EVAL_CANDIDATE_CATALOG.every((entry) => entry.id.includes(":"))).toBe(
      true
    );
  });

  test("rejects raw provider model IDs from client-facing selection", () => {
    expect(() =>
      validateEvalCandidateIds({
        kind: "discovery",
        candidateCatalogIds: ["grok-4.3"],
      })
    ).toThrow("Unknown eval candidate");
  });

  test("validates kind and duplicates before freezing server snapshots", () => {
    const discovery = evalCandidatesForKind("discovery")[0];
    expect(discovery).toBeDefined();
    const selected = validateEvalCandidateIds({
      kind: "discovery",
      candidateCatalogIds: [discovery.id],
    });

    expect(selected).toHaveLength(1);
    expect(() =>
      validateEvalCandidateIds({
        kind: "generation",
        candidateCatalogIds: [discovery.id],
      })
    ).toThrow("Unknown eval candidate");
    expect(() =>
      validateEvalCandidateIds({
        kind: "discovery",
        candidateCatalogIds: [discovery.id, discovery.id],
      })
    ).toThrow("Duplicate eval candidate");

    const snapshot = freezeEvalCandidateSnapshot(selected[0]);
    expect(snapshot.catalogId).toBe(discovery.id);
    expect(snapshot.stages[0]).toMatchObject({
      providerId: "xai",
      modelId: "grok-4.3",
      role: "discovery",
    });
  });
});
