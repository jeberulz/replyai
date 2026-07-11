import type { EvalKind } from "./evalLab";
import type { NormalizedProviderUsage } from "./providers";
import { normalizeProviderUsage } from "./providers";
import { runGuardrailChecks } from "./evals";
import { validateXSearchResponse } from "./xDiscovery";

export const EVAL_RUNNER_VERSION = "wp45-bounded-runner-v1";

export const EVAL_RUNNER_LIMITS = {
  maxBudgetUsd: 10,
  maxConcurrency: 5,
  maxCaseLimit: 100,
  maxRetries: 3,
  maxToolCalls: 5,
} as const;

export type EvalRunnerCaps = {
  budgetUsd: number;
  concurrency: number;
  caseLimit: number;
  maxRetries: number;
  maxToolCalls: number;
};

export type EvalRunnerCounts = {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  excluded: number;
};

export type FrozenEvalCandidateSnapshot = {
  catalogId: string;
  kind: EvalKind;
  label: string;
  stages: Array<{
    role: "generation" | "discovery";
    providerId: "anthropic" | "xai" | "demo";
    modelId: string;
    reasoningEffort?: "none" | "low" | "medium" | "high" | "adaptive";
    capabilities: string[];
    pricing?: {
      inputPerMTok: number;
      outputPerMTok: number;
      cachedInputPerMTok?: number;
    };
  }>;
};

export type EvalRunnerOutputStatus = "completed" | "failed" | "excluded";

export type EvalRunnerOutputResult = {
  status: EvalRunnerOutputStatus;
  normalizedOutputJson?: string;
  guardrailJson?: string;
  citationsJson?: string;
  hydrationJson?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
    toolCallCount?: number;
    successfulToolCallCount?: number;
  };
  latencyMs?: number;
  costUsd?: number;
  error?: string;
  retryCount: number;
};

type ParsedCaseSnapshot = {
  topic?: string;
  tweetText?: string;
  query?: string;
  authorHandle?: string;
  forceFailureCatalogIds?: string[];
  forceExcludedCatalogIds?: string[];
};

export function validateEvalRunnerCaps(caps: EvalRunnerCaps): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(caps.budgetUsd) || caps.budgetUsd <= 0) {
    errors.push("budget_usd_required");
  }
  if (caps.budgetUsd > EVAL_RUNNER_LIMITS.maxBudgetUsd) {
    errors.push("budget_usd_exceeds_runner_cap");
  }
  if (
    !Number.isInteger(caps.concurrency) ||
    caps.concurrency < 1 ||
    caps.concurrency > EVAL_RUNNER_LIMITS.maxConcurrency
  ) {
    errors.push("concurrency_out_of_bounds");
  }
  if (
    !Number.isInteger(caps.caseLimit) ||
    caps.caseLimit < 1 ||
    caps.caseLimit > EVAL_RUNNER_LIMITS.maxCaseLimit
  ) {
    errors.push("case_limit_out_of_bounds");
  }
  if (
    !Number.isInteger(caps.maxRetries) ||
    caps.maxRetries < 0 ||
    caps.maxRetries > EVAL_RUNNER_LIMITS.maxRetries
  ) {
    errors.push("max_retries_out_of_bounds");
  }
  if (
    !Number.isInteger(caps.maxToolCalls) ||
    caps.maxToolCalls < 0 ||
    caps.maxToolCalls > EVAL_RUNNER_LIMITS.maxToolCalls
  ) {
    errors.push("max_tool_calls_out_of_bounds");
  }
  return errors;
}

export function reconcileEvalRunnerCounts(
  statuses: ReadonlyArray<"queued" | "running" | EvalRunnerOutputStatus>
): EvalRunnerCounts {
  const counts: EvalRunnerCounts = {
    total: statuses.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    excluded: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

export function stableEvalHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function blindKeyForEvalOutput(args: {
  seed: string;
  caseId: string;
  candidateCatalogId: string;
}): string {
  return `blind_${stableEvalHash(
    `${args.seed}:${args.caseId}:${args.candidateCatalogId}`
  )}`;
}

export function deterministicEvalRunnerOutput(args: {
  kind: EvalKind;
  seed: string;
  inputSnapshotJson: string;
  candidateSnapshot: FrozenEvalCandidateSnapshot;
  maxRetries: number;
  maxToolCalls: number;
}): EvalRunnerOutputResult {
  const parsed = parseCaseSnapshot(args.inputSnapshotJson);
  if (parsed.forceExcludedCatalogIds?.includes(args.candidateSnapshot.catalogId)) {
    return {
      status: "excluded",
      error: "case_marked_excluded_for_candidate",
      retryCount: 0,
      costUsd: 0,
    };
  }
  if (parsed.forceFailureCatalogIds?.includes(args.candidateSnapshot.catalogId)) {
    return {
      status: "failed",
      error: "deterministic_fixture_failure",
      retryCount: args.maxRetries,
      costUsd: 0,
    };
  }

  const overToolCap = args.candidateSnapshot.stages.find(
    (stage) => stage.role === "discovery" && args.maxToolCalls < 1
  );
  if (overToolCap) {
    return {
      status: "failed",
      error: "tool_call_cap_exceeded",
      retryCount: 0,
      costUsd: 0,
    };
  }

  const usage = combinedUsage(args);
  const output = buildNormalizedOutput(args, parsed);
  const result: EvalRunnerOutputResult = {
    status: "completed",
    normalizedOutputJson: JSON.stringify(output.normalizedOutput),
    usage: usageSnapshot(usage),
    latencyMs: usage.latencyMs ?? undefined,
    costUsd: roundCost(usage.costUsd),
    retryCount: 0,
  };

  if (output.guardrail) {
    result.guardrailJson = JSON.stringify(output.guardrail);
  }
  if (output.citations) {
    result.citationsJson = JSON.stringify(output.citations);
  }
  if (output.hydration) {
    result.hydrationJson = JSON.stringify(output.hydration);
  }

  return result;
}

function buildNormalizedOutput(
  args: {
    kind: EvalKind;
    seed: string;
    inputSnapshotJson: string;
    candidateSnapshot: FrozenEvalCandidateSnapshot;
  },
  parsed: ParsedCaseSnapshot
): {
  normalizedOutput: unknown;
  guardrail?: unknown;
  citations?: unknown;
  hydration?: unknown;
} {
  if (args.kind === "discovery") {
    return buildDiscoveryOutput(args, parsed);
  }
  if (args.kind === "pipeline") {
    const discovery = buildDiscoveryOutput(args, parsed);
    const generation = buildGenerationOutput(args, parsed);
    return {
      normalizedOutput: {
        discovery: discovery.normalizedOutput,
        generation: generation.normalizedOutput,
      },
      guardrail: generation.guardrail,
      citations: discovery.citations,
      hydration: discovery.hydration,
    };
  }
  return buildGenerationOutput(args, parsed);
}

function buildGenerationOutput(
  args: {
    seed: string;
    candidateSnapshot: FrozenEvalCandidateSnapshot;
  },
  parsed: ParsedCaseSnapshot
) {
  const topic = safeLabel(parsed.topic ?? parsed.query ?? "shipping");
  const suffix = stableEvalHash(
    `${args.seed}:${args.candidateSnapshot.catalogId}:${topic}`
  ).slice(0, 4);
  const options = [
    {
      category: "short",
      content: `Small bet, fast signal. ${topic} gets clearer once users touch it.`,
      reason: `Direct and low-friction for a busy thread (${suffix}).`,
    },
    {
      category: "insightful",
      content: `The useful question is not whether ${topic} is impressive, but whether it changes the next decision.`,
      reason: "Adds a concrete evaluation frame without fake precision.",
    },
    {
      category: "question",
      content: `What would you measure first to prove ${topic} is worth another week?`,
      reason: "Invites a real reply while keeping the human in control.",
    },
  ];
  return {
    normalizedOutput: { options },
    guardrail: runGuardrailChecks(options, { kind: "reply" }),
  };
}

function buildDiscoveryOutput(
  args: {
    seed: string;
    candidateSnapshot: FrozenEvalCandidateSnapshot;
  },
  parsed: ParsedCaseSnapshot
) {
  const handle = safeHandle(parsed.authorHandle ?? "sarahbuilds");
  const tweetId = deterministicTweetId(
    `${args.seed}:${args.candidateSnapshot.catalogId}:${parsed.query ?? ""}`
  );
  const citation = `https://x.com/${handle}/status/${tweetId}`;
  const raw = {
    candidates: [
      {
        postUrl: citation,
        tweetId,
        authorHandle: handle,
        relevanceReason: `Matches ${safeLabel(parsed.query ?? parsed.topic ?? "the target niche")} and has a clear reply opening.`,
        missingAngle:
          "Most replies miss the operator-level tradeoff; a specific example would add value.",
        searchIntent: "reply opportunity discovery fixture",
        citations: [citation],
        mediaInfluenced: false,
      },
    ],
  };
  const validation = validateXSearchResponse(raw, [citation]);
  return {
    normalizedOutput: validation.ok ? { candidates: validation.value } : raw,
    citations: [citation],
    hydration: {
      authoritative: validation.ok,
      hydratedTweetIds: validation.ok ? validation.value.map((c) => c.tweetId) : [],
      errors: validation.ok ? [] : validation.errors,
    },
  };
}

function combinedUsage(args: {
  inputSnapshotJson: string;
  candidateSnapshot: FrozenEvalCandidateSnapshot;
}): NormalizedProviderUsage {
  const baseInput = 250 + (args.inputSnapshotJson.length % 200);
  const usages = args.candidateSnapshot.stages.map((stage, index) =>
    normalizeProviderUsage(
      {
        providerId: stage.providerId,
        modelId: stage.modelId,
        operation: stage.role === "discovery" ? "discovery" : "generation",
        latencyMs: 40 + index * 20,
        tokensIn: baseInput + index * 35,
        tokensOut: stage.role === "discovery" ? 90 : 130,
        cachedTokensIn: Math.floor(baseInput / 5),
        reasoningTokens: stage.role === "discovery" ? 20 : 0,
        toolCalls: stage.role === "discovery" ? 1 : 0,
        successfulToolCalls: stage.role === "discovery" ? 1 : 0,
        reasoningEffort: stage.reasoningEffort,
      },
      stage.pricing
    )
  );
  return usages.reduce<NormalizedProviderUsage>(
    (acc, usage) => ({
      providerId: usage.providerId,
      modelId: usage.modelId,
      operation: usage.operation,
      latencyMs: (acc.latencyMs ?? 0) + (usage.latencyMs ?? 0),
      tokensIn: acc.tokensIn + usage.tokensIn,
      tokensOut: acc.tokensOut + usage.tokensOut,
      cachedTokensIn: acc.cachedTokensIn + usage.cachedTokensIn,
      reasoningTokens: acc.reasoningTokens + usage.reasoningTokens,
      toolCalls: acc.toolCalls + usage.toolCalls,
      successfulToolCalls: acc.successfulToolCalls + usage.successfulToolCalls,
      reasoningEffort: usage.reasoningEffort,
      costUsd: acc.costUsd + usage.costUsd,
    }),
    {
      providerId: usages[0]?.providerId ?? "demo",
      modelId: usages[0]?.modelId ?? "demo",
      operation: usages[0]?.operation ?? "generation",
      latencyMs: 0,
      tokensIn: 0,
      tokensOut: 0,
      cachedTokensIn: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      successfulToolCalls: 0,
      reasoningEffort: null,
      costUsd: 0,
    }
  );
}

function usageSnapshot(usage: NormalizedProviderUsage) {
  return {
    inputTokens: usage.tokensIn,
    outputTokens: usage.tokensOut,
    reasoningTokens: usage.reasoningTokens,
    cachedInputTokens: usage.cachedTokensIn,
    toolCallCount: usage.toolCalls,
    successfulToolCallCount: usage.successfulToolCalls,
  };
}

function parseCaseSnapshot(snapshotJson: string): ParsedCaseSnapshot {
  try {
    const parsed = JSON.parse(snapshotJson) as Record<string, unknown>;
    return {
      topic: stringField(parsed.topic),
      tweetText: stringField(parsed.tweetText),
      query: stringField(parsed.query),
      authorHandle: stringField(parsed.authorHandle),
      forceFailureCatalogIds: stringArrayField(parsed.forceFailureCatalogIds),
      forceExcludedCatalogIds: stringArrayField(parsed.forceExcludedCatalogIds),
    };
  } catch {
    return {};
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArrayField(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function deterministicTweetId(input: string): string {
  const hash = stableEvalHash(input);
  const numeric = Array.from(hash).reduce(
    (acc, char) => acc + char.charCodeAt(0).toString().slice(-1),
    ""
  );
  return `1800${numeric.padEnd(15, "0").slice(0, 15)}`;
}

function safeHandle(value: string): string {
  const normalized = value.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  return normalized.slice(0, 15) || "sarahbuilds";
}

function safeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80) || "shipping";
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}
