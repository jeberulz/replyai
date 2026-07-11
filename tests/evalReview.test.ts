import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEvalReviewItems,
  nextEvalReviewRevision,
  validateEvalReviewSubmission,
  type EvalReviewOutputInput,
} from "../shared/evalReview";

const generationOutput = (args: {
  id: string;
  caseId: string;
  blindKey: string;
  topic?: string;
}): EvalReviewOutputInput => ({
  id: args.id,
  caseId: args.caseId,
  blindKey: args.blindKey,
  kind: "generation",
  status: "completed",
  inputSnapshotJson: JSON.stringify({
    topic: args.topic ?? "AI agents",
    tweetText: "Builders are trying to understand where agents help.",
  }),
  normalizedOutputJson: JSON.stringify({
    options: [
      {
        category: "short",
        content: `Option from ${args.blindKey}`,
        reason: "Concrete and concise.",
      },
      {
        category: "question",
        content: `Question from ${args.blindKey}`,
        reason: "Invites a useful reply.",
      },
    ],
  }),
});

const discoveryOutput = (args: {
  id: string;
  caseId: string;
  blindKey: string;
}): EvalReviewOutputInput => ({
  id: args.id,
  caseId: args.caseId,
  blindKey: args.blindKey,
  kind: "discovery",
  status: "completed",
  inputSnapshotJson: JSON.stringify({
    query: "founder launch lessons",
    authorHandle: "sarahbuilds",
  }),
  normalizedOutputJson: JSON.stringify({
    candidates: [
      {
        postUrl: "https://x.com/sarahbuilds/status/1800123",
        tweetId: "1800123",
        authorHandle: "sarahbuilds",
        relevanceReason: "Matches the target niche and has a reply opening.",
        missingAngle: "No one has named the operator tradeoff.",
      },
    ],
  }),
});

describe("WP47 blind review contracts", () => {
  it("builds stable blind generation A/B assignments without candidate IDs", () => {
    const outputs = [
      generationOutput({ id: "out_1", caseId: "case_1", blindKey: "blind_c" }),
      generationOutput({ id: "out_2", caseId: "case_1", blindKey: "blind_a" }),
      generationOutput({ id: "out_3", caseId: "case_1", blindKey: "blind_b" }),
    ];

    const first = buildEvalReviewItems({
      kind: "generation",
      seed: "stored-seed",
      runId: "run_1",
      outputs,
    });
    const second = buildEvalReviewItems({
      kind: "generation",
      seed: "stored-seed",
      runId: "run_1",
      outputs: [...outputs].reverse(),
    });

    expect(first).toHaveLength(1);
    expect(second[0]?.blindOrder).toEqual(first[0]?.blindOrder);
    expect(first[0]).toMatchObject({ kind: "generation", caseId: "case_1" });
    if (first[0]?.kind === "generation") {
      expect(first[0].outputs.map((output) => output.blindLabel)).toEqual([
        "A",
        "B",
      ]);
      expect(JSON.stringify(first[0])).not.toContain("generation:grok");
      expect(JSON.stringify(first[0])).not.toContain("modelId");
      expect(JSON.stringify(first[0])).not.toContain("providerId");
    }
  });

  it("builds discovery relevance review items per blind output", () => {
    const items = buildEvalReviewItems({
      kind: "discovery",
      seed: "stored-seed",
      runId: "run_2",
      outputs: [
        discoveryOutput({ id: "out_1", caseId: "case_1", blindKey: "blind_x" }),
        discoveryOutput({ id: "out_2", caseId: "case_1", blindKey: "blind_y" }),
      ],
    });

    expect(items).toHaveLength(2);
    expect(items.every((item) => item.kind === "discovery")).toBe(true);
    expect(items.map((item) => item.blindOrder)).toEqual(
      expect.arrayContaining([[expect.stringMatching(/^blind_/)]])
    );
  });

  it("validates generation choices/reasons and discovery relevance labels", () => {
    expect(
      validateEvalReviewSubmission({
        kind: "generation",
        choice: "tie",
        reasonCodes: ["both_strong", "clearer_angle"],
      })
    ).toMatchObject({ ok: true });
    expect(
      validateEvalReviewSubmission({
        kind: "generation",
        choice: "a",
        reasonCodes: [],
      })
    ).toMatchObject({ ok: false });

    const discovery = validateEvalReviewSubmission({
      kind: "discovery",
      choice: "relevant",
      reasonCodes: [],
      labels: { actionable: true, stale: true, duplicate: false },
    });
    expect(discovery).toMatchObject({
      ok: true,
      value: { choice: "relevant", labels: { actionable: true, stale: true } },
    });
    expect(
      validateEvalReviewSubmission({
        kind: "discovery",
        choice: "maybe",
        reasonCodes: ["both_strong"],
      })
    ).toMatchObject({ ok: false });
  });

  it("computes append-only reviewer revisions per blind order", () => {
    expect(
      nextEvalReviewRevision(
        [
          {
            reviewerUserId: "user_a",
            blindOrder: ["blind_1", "blind_2"],
            revision: 1,
          },
          {
            reviewerUserId: "user_a",
            blindOrder: ["blind_1", "blind_2"],
            revision: 2,
          },
          {
            reviewerUserId: "user_b",
            blindOrder: ["blind_1", "blind_2"],
            revision: 1,
          },
        ],
        "user_a",
        ["blind_1", "blind_2"]
      )
    ).toBe(3);
  });
});

describe("WP47 review route source contracts", () => {
  it("keeps review UI accessible, responsive, and blind", () => {
    const component = readFileSync(
      "src/components/app/evals/review/review-workspace.tsx",
      "utf8"
    );
    const actions = readFileSync(
      "src/app/(app)/evals/[experimentId]/review/actions.ts",
      "utf8"
    );
    const convex = readFileSync("convex/evalReview.ts", "utf8");

    expect(component).toContain("<fieldset");
    expect(component).toContain("<legend");
    expect(component).toContain('type="radio"');
    expect(component).toContain('type="checkbox"');
    expect(component).toContain("min-h-11");
    expect(component).toContain("lg:grid-cols-2");
    expect(component).toContain("Candidate {output.blindLabel}");
    expect(component).not.toContain("providerId");
    expect(component).not.toContain("modelId");
    expect(actions).toContain("validateEvalReviewSubmission");
    expect(convex).toContain("requireEvalOperator");
    expect(convex).toContain("ctx.db.insert(\"evalJudgments\"");
    expect(convex).not.toContain("ctx.db.patch(judgment");

    const queueSource = convex.slice(
      convex.indexOf("export const queue"),
      convex.indexOf("export const submit")
    );
    expect(queueSource).toContain("judgmentCount");
    expect(queueSource).toContain("reviewerRevisionCount");
    expect(queueSource).toContain("latestReviewerChoice");
    expect(queueSource).not.toContain("judgments: judgments.map");
    expect(queueSource).not.toContain("reviewerUserId: judgment.reviewerUserId");
    expect(queueSource).not.toContain("reasonCodes: judgment.reasonCodes");
    expect(queueSource).not.toContain("labels: judgment.labels");
  });
});
