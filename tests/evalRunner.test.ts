import { describe, expect, it } from "vitest";
import { evalCandidatesForKind, freezeEvalCandidateSnapshot } from "../shared/evalLab";
import {
  blindKeyForEvalOutput,
  deterministicEvalRunnerOutput,
  reconcileEvalRunnerCounts,
  validateEvalRunnerCaps,
} from "../shared/evalRunner";

const generationCandidate = freezeEvalCandidateSnapshot(
  evalCandidatesForKind("generation")[0]
);
const discoveryCandidate = freezeEvalCandidateSnapshot(
  evalCandidatesForKind("discovery")[0]
);
const pipelineCandidate = freezeEvalCandidateSnapshot(
  evalCandidatesForKind("pipeline")[0]
);

describe("eval runner foundation", () => {
  it("validates bounded spend, concurrency, retry, tool, and case caps", () => {
    expect(
      validateEvalRunnerCaps({
        budgetUsd: 1,
        concurrency: 2,
        caseLimit: 10,
        maxRetries: 1,
        maxToolCalls: 2,
      })
    ).toEqual([]);

    expect(
      validateEvalRunnerCaps({
        budgetUsd: 0,
        concurrency: 99,
        caseLimit: 0,
        maxRetries: 99,
        maxToolCalls: 99,
      })
    ).toEqual([
      "budget_usd_required",
      "concurrency_out_of_bounds",
      "case_limit_out_of_bounds",
      "max_retries_out_of_bounds",
      "max_tool_calls_out_of_bounds",
    ]);
  });

  it("produces deterministic zero-key generation outputs with guardrails", () => {
    const result = deterministicEvalRunnerOutput({
      kind: "generation",
      seed: "seed-a",
      inputSnapshotJson: JSON.stringify({ topic: "AI agents" }),
      candidateSnapshot: generationCandidate,
      maxRetries: 2,
      maxToolCalls: 0,
    });

    expect(result.status).toBe("completed");
    expect(result.costUsd).toBeGreaterThan(0);
    expect(JSON.parse(result.normalizedOutputJson ?? "{}").options).toHaveLength(3);
    expect(JSON.parse(result.guardrailJson ?? "{}")).toMatchObject({ pass: true });
  });

  it("produces cited and hydrated deterministic discovery and pipeline outputs", () => {
    const discovery = deterministicEvalRunnerOutput({
      kind: "discovery",
      seed: "seed-b",
      inputSnapshotJson: JSON.stringify({
        query: "founder lessons",
        authorHandle: "sarahbuilds",
      }),
      candidateSnapshot: discoveryCandidate,
      maxRetries: 2,
      maxToolCalls: 1,
    });
    expect(discovery.status).toBe("completed");
    expect(JSON.parse(discovery.citationsJson ?? "[]")[0]).toContain("x.com");
    expect(JSON.parse(discovery.hydrationJson ?? "{}")).toMatchObject({
      authoritative: true,
    });

    const pipeline = deterministicEvalRunnerOutput({
      kind: "pipeline",
      seed: "seed-c",
      inputSnapshotJson: JSON.stringify({ query: "launch loops" }),
      candidateSnapshot: pipelineCandidate,
      maxRetries: 2,
      maxToolCalls: 1,
    });
    const normalized = JSON.parse(pipeline.normalizedOutputJson ?? "{}");
    expect(normalized.discovery.candidates).toHaveLength(1);
    expect(normalized.generation.options).toHaveLength(3);
  });

  it("preserves successful peers when a fixture marks one candidate failed", () => {
    const failed = deterministicEvalRunnerOutput({
      kind: "generation",
      seed: "seed-d",
      inputSnapshotJson: JSON.stringify({
        forceFailureCatalogIds: [generationCandidate.catalogId],
      }),
      candidateSnapshot: generationCandidate,
      maxRetries: 2,
      maxToolCalls: 1,
    });
    const peer = deterministicEvalRunnerOutput({
      kind: "discovery",
      seed: "seed-d",
      inputSnapshotJson: JSON.stringify({ query: "AI evals" }),
      candidateSnapshot: discoveryCandidate,
      maxRetries: 2,
      maxToolCalls: 1,
    });

    expect(failed).toMatchObject({
      status: "failed",
      retryCount: 2,
      error: "deterministic_fixture_failure",
    });
    expect(peer.status).toBe("completed");
  });

  it("enforces discovery tool-call caps and reconciles output counts", () => {
    const capped = deterministicEvalRunnerOutput({
      kind: "discovery",
      seed: "seed-e",
      inputSnapshotJson: JSON.stringify({ query: "AI search" }),
      candidateSnapshot: discoveryCandidate,
      maxRetries: 2,
      maxToolCalls: 0,
    });
    expect(capped).toMatchObject({
      status: "failed",
      error: "tool_call_cap_exceeded",
    });

    expect(
      reconcileEvalRunnerCounts([
        "completed",
        "failed",
        "excluded",
        "queued",
        "running",
      ])
    ).toEqual({
      total: 5,
      queued: 1,
      running: 1,
      completed: 1,
      failed: 1,
      excluded: 1,
    });
  });

  it("derives stable blind keys from frozen seed, case, and candidate", () => {
    const args = {
      seed: "seed-f",
      caseId: "case-1",
      candidateCatalogId: generationCandidate.catalogId,
    };
    expect(blindKeyForEvalOutput(args)).toBe(blindKeyForEvalOutput(args));
    expect(blindKeyForEvalOutput(args)).not.toBe(
      blindKeyForEvalOutput({ ...args, seed: "other-seed" })
    );
  });
});
