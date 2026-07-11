"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { EVAL_DECISIONS, type EvalDecision } from "../../../../../shared/evalLab";
import { convexServer } from "@/lib/convex";
import { getSessionUser } from "@/lib/session";

async function requireSessionToken(): Promise<string> {
  const session = await getSessionUser();
  if (!session) redirect("/");
  return session.sessionToken;
}

export async function getEvalResultsData(experimentId: string) {
  const sessionToken = await requireSessionToken();
  try {
    return await convexServer().query(api.evalResults.summary, {
      sessionToken,
      experimentId: experimentId as Id<"evalExperiments">,
    });
  } catch {
    notFound();
  }
}

export async function recordEvalDecisionAction(formData: FormData) {
  const sessionToken = await requireSessionToken();
  const experimentId = String(formData.get("experimentId") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const rationale = String(formData.get("rationale") ?? "").trim();
  if (
    !experimentId ||
    !EVAL_DECISIONS.includes(decision as EvalDecision) ||
    rationale.length < 12
  ) {
    throw new Error("Choose a decision and add an evidence-based rationale.");
  }

  await convexServer().mutation(api.evalResults.recordDecision, {
    sessionToken,
    experimentId: experimentId as Id<"evalExperiments">,
    runId: runId ? (runId as Id<"evalRuns">) : undefined,
    decision: decision as EvalDecision,
    rationale,
  });
  revalidatePath(`/evals/${experimentId}`);
}
