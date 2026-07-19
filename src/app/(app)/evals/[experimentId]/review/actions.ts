"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  EVAL_DISCOVERY_LABELS,
  validateEvalReviewSubmission,
  type EvalDiscoveryLabelState,
  type EvalReviewChoice,
} from "../../../../../../shared/evalReview";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";

async function requireSessionToken(): Promise<string> {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session.sessionToken;
}

export async function getEvalReviewData(experimentId: string) {
  const sessionToken = await requireSessionToken();
  try {
    return await convexServer().query(api.evalReview.queue, {
      sessionToken,
      experimentId: experimentId as Id<"evalExperiments">,
      limit: 100,
    });
  } catch {
    notFound();
  }
}

export async function submitEvalReviewAction(formData: FormData) {
  const sessionToken = await requireSessionToken();
  const experimentId = String(formData.get("experimentId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const choice = String(formData.get("choice") ?? "");
  const reasonCodes = formData
    .getAll("reasonCodes")
    .map(String)
    .filter(Boolean);
  const labels = discoveryLabelsFromFormData(formData);

  const validation = validateEvalReviewSubmission({
    kind: kind === "discovery" ? "discovery" : "generation",
    choice,
    reasonCodes,
    labels,
  });
  if (!validation.ok || !experimentId || !runId || !assignmentId) {
    throw new Error(
      validation.ok
        ? "Review assignment is missing."
        : validation.errors.join(" ")
    );
  }

  await convexServer().mutation(api.evalReview.submit, {
    sessionToken,
    experimentId: experimentId as Id<"evalExperiments">,
    runId: runId as Id<"evalRuns">,
    assignmentId,
    choice: validation.value.choice as EvalReviewChoice,
    reasonCodes: validation.value.reasonCodes,
    labels: validation.value.labels,
    editedDraft: String(formData.get("editedDraft") ?? "").trim() || undefined,
  });
  revalidatePath(`/evals/${experimentId}/review`);
}

function discoveryLabelsFromFormData(
  formData: FormData
): EvalDiscoveryLabelState {
  const labels: EvalDiscoveryLabelState = {};
  for (const label of EVAL_DISCOVERY_LABELS) {
    labels[label] = formData.get(`label:${label}`) === "on";
  }
  return labels;
}
