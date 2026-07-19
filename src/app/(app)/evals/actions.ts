"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  EVAL_KINDS,
  type EvalCandidateCatalogEntry,
  type EvalExperimentStatus,
  type EvalKind,
} from "../../../../shared/evalLab";
import {
  estimateEvalSetupCostUsd,
  validateEvalSetupInput,
  type EvalDatasetOption,
  type EvalExperimentListItem,
} from "../../../../shared/evalLabUi";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";

export type EvalSetupActionState = {
  ok: boolean;
  errors: string[];
  values: {
    name: string;
    kind: EvalKind;
    datasetId: string;
    candidateCatalogIds: string[];
    promptVersion: string;
    schemaVersion: string;
    seed: string;
    budgetUsd: string;
    concurrency: string;
    caseLimit: string;
    startNow: boolean;
  };
};

async function requireSessionToken(): Promise<string> {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session.sessionToken;
}

export async function getEvalLabShellData(filters?: {
  kind?: EvalKind;
  status?: EvalExperimentStatus;
}) {
  const sessionToken = await requireSessionToken();
  const convex = convexServer();
  try {
    const [catalog, datasets, experiments] = await Promise.all([
      convex.query(api.evalLab.catalog, { sessionToken }),
      convex.query(api.evalLab.listDatasets, {
        sessionToken,
        kind: filters?.kind,
      }),
      convex.query(api.evalLab.listExperiments, { sessionToken }),
    ]);
    const statuses = await Promise.all(
      experiments.map((experiment) =>
        convex
          .query(api.evalRunner.status, {
            sessionToken,
            experimentId: experiment._id,
          })
          .catch(() => null)
      )
    );

    return {
      catalog: catalog as EvalCandidateCatalogEntry[],
      datasets: datasets.map(toDatasetOption),
      experiments: experiments.map((experiment, index) => {
        const dataset = datasets.find((item) => item._id === experiment.datasetId);
        const status = statuses[index];
        const run = status?.run
          ? {
              status: status.run.status,
              counts: status.run.counts,
              spendUsd: status.run.spendUsd,
              error: status.run.error,
            }
          : undefined;
        return {
          id: experiment._id,
          name: experiment.name,
          kind: experiment.kind,
          status: experiment.status,
          datasetId: experiment.datasetId,
          datasetName: dataset?.name ?? "Unknown dataset",
          datasetVersion: dataset?.version ?? "unknown",
          datasetCaseCount: dataset?.caseCount ?? experiment.caseLimit,
          candidateLabels: experiment.candidateSnapshots.map(
            (candidate) => candidate.label
          ),
          candidateCatalogIds: experiment.candidateCatalogIds,
          budgetUsd: experiment.budgetUsd,
          concurrency: experiment.concurrency,
          caseLimit: experiment.caseLimit,
          createdAt: experiment.createdAt,
          updatedAt: experiment.updatedAt,
          run,
        } satisfies EvalExperimentListItem;
      }),
    };
  } catch {
    notFound();
  }
}

export async function getEvalLabSetupData() {
  const sessionToken = await requireSessionToken();
  const convex = convexServer();
  try {
    const [catalog, datasets] = await Promise.all([
      convex.query(api.evalLab.catalog, { sessionToken }),
      convex.query(api.evalLab.listDatasets, { sessionToken }),
    ]);
    return {
      catalog: catalog as EvalCandidateCatalogEntry[],
      datasets: datasets.map(toDatasetOption),
      kinds: [...EVAL_KINDS],
    };
  } catch {
    notFound();
  }
}

export async function createEvalExperimentAction(
  _previousState: EvalSetupActionState,
  formData: FormData
): Promise<EvalSetupActionState> {
  const sessionToken = await requireSessionToken();
  const convex = convexServer();
  const values = valuesFromFormData(formData);
  const [catalog, datasets] = await Promise.all([
    convex.query(api.evalLab.catalog, { sessionToken }),
    convex.query(api.evalLab.listDatasets, { sessionToken }),
  ]);
  const validation = validateEvalSetupInput({
    raw: {
      ...values,
      budgetUsd: values.budgetUsd,
      concurrency: values.concurrency,
      caseLimit: values.caseLimit,
    },
    catalog: catalog as EvalCandidateCatalogEntry[],
    datasets: datasets.map(toDatasetOption),
  });
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, values };
  }

  try {
    const experimentId = await convex.mutation(api.evalLab.createExperiment, {
      sessionToken,
      datasetId: validation.value.datasetId as Id<"evalDatasets">,
      name: validation.value.name,
      kind: validation.value.kind,
      status: validation.value.startNow ? "ready" : "draft",
      candidateCatalogIds: validation.value.candidateCatalogIds,
      promptVersion: validation.value.promptVersion,
      schemaVersion: validation.value.schemaVersion,
      seed: validation.value.seed,
      budgetUsd: validation.value.budgetUsd,
      concurrency: validation.value.concurrency,
      caseLimit: validation.value.caseLimit,
    });
    if (validation.value.startNow) {
      await convex.mutation(api.evalRunner.start, {
        sessionToken,
        experimentId,
      });
    }
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "Unable to create run."],
      values,
    };
  }

  revalidatePath("/evals");
  redirect("/evals");
}

export async function startEvalExperimentAction(formData: FormData) {
  const sessionToken = await requireSessionToken();
  const experimentId = String(formData.get("experimentId") ?? "");
  if (!experimentId) notFound();
  await convexServer().mutation(api.evalRunner.start, {
    sessionToken,
    experimentId: experimentId as Id<"evalExperiments">,
  });
  revalidatePath("/evals");
}

export async function cancelEvalExperimentAction(formData: FormData) {
  const sessionToken = await requireSessionToken();
  const experimentId = String(formData.get("experimentId") ?? "");
  if (!experimentId) notFound();
  await convexServer().mutation(api.evalRunner.cancel, {
    sessionToken,
    experimentId: experimentId as Id<"evalExperiments">,
  });
  revalidatePath("/evals");
}

export async function previewEvalSetupCostAction(formData: FormData) {
  const sessionToken = await requireSessionToken();
  const catalog = (await convexServer().query(api.evalLab.catalog, {
    sessionToken,
  })) as EvalCandidateCatalogEntry[];
  const candidateCatalogIds = formData
    .getAll("candidateCatalogIds")
    .map(String)
    .filter(Boolean);
  return estimateEvalSetupCostUsd({
    catalog,
    candidateCatalogIds,
    caseLimit: Number(formData.get("caseLimit") ?? 0),
    budgetUsd: Number(formData.get("budgetUsd") ?? 0),
  });
}

function toDatasetOption(dataset: {
  _id: string;
  name: string;
  kind: EvalKind;
  version: string;
  sourcePolicy: "synthetic" | "product_team" | "consented_user";
  caseCount: number;
  datasetHash: string;
  description?: string;
}): EvalDatasetOption {
  return {
    id: dataset._id,
    name: dataset.name,
    kind: dataset.kind,
    version: dataset.version,
    sourcePolicy: dataset.sourcePolicy,
    caseCount: dataset.caseCount,
    datasetHash: dataset.datasetHash,
    description: dataset.description,
  };
}

function valuesFromFormData(formData: FormData): EvalSetupActionState["values"] {
  const kindValue = String(formData.get("kind") ?? "generation");
  return {
    name: String(formData.get("name") ?? ""),
    kind: EVAL_KINDS.includes(kindValue as EvalKind)
      ? (kindValue as EvalKind)
      : "generation",
    datasetId: String(formData.get("datasetId") ?? ""),
    candidateCatalogIds: formData
      .getAll("candidateCatalogIds")
      .map(String)
      .filter(Boolean),
    promptVersion: String(formData.get("promptVersion") ?? "prompt:v1"),
    schemaVersion: String(formData.get("schemaVersion") ?? "schema:v1"),
    seed: String(formData.get("seed") ?? "wp46-seed-v1"),
    budgetUsd: String(formData.get("budgetUsd") ?? "1"),
    concurrency: String(formData.get("concurrency") ?? "2"),
    caseLimit: String(formData.get("caseLimit") ?? "10"),
    startNow: formData.get("startNow") === "on",
  };
}
