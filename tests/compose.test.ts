import { describe, expect, it } from "vitest";
import {
  clusterWinningReplies,
  demoComposeBundle,
  demoTopicClusters,
  DEMO_WINNING_REPLY_ROWS,
  isWinningReply,
  pickUnusedAngles,
  type WinningReplyRow,
} from "../shared/compose";

const base: WinningReplyRow = {
  draftId: "d1",
  publishedAt: 100,
  replyText: "A concrete reply.",
  topic: "AI moats",
  missingAngles: ["Workflow ownership", "Data flywheels"],
  usedAngle: "Workflow ownership",
  editBucket: "no_edit",
  responded: true,
};

describe("isWinningReply", () => {
  it("requires responded + non-empty text", () => {
    expect(isWinningReply(base)).toBe(true);
    expect(isWinningReply({ ...base, responded: false })).toBe(false);
    expect(isWinningReply({ ...base, replyText: "  " })).toBe(false);
  });

  it("rejects major_edit; accepts missing bucket", () => {
    expect(isWinningReply({ ...base, editBucket: "major_edit" })).toBe(false);
    expect(isWinningReply({ ...base, editBucket: null })).toBe(true);
    expect(isWinningReply({ ...base, editBucket: undefined })).toBe(true);
  });
});

describe("pickUnusedAngles", () => {
  it("drops angles that were used (fuzzy)", () => {
    expect(
      pickUnusedAngles(
        ["Workflow ownership", "Data flywheels", "Eval harnesses"],
        ["workflow ownership beats model choice", undefined]
      )
    ).toEqual(["Data flywheels", "Eval harnesses"]);
  });

  it("dedupes missing angles", () => {
    expect(
      pickUnusedAngles(["Same angle", "same   angle", "Other"], [])
    ).toEqual(["Same angle", "Other"]);
  });
});

describe("clusterWinningReplies", () => {
  it("groups by normalized topic and sorts by size", () => {
    const rows: WinningReplyRow[] = [
      { ...base, draftId: "a", topic: "AI Moats", publishedAt: 1 },
      {
        ...base,
        draftId: "b",
        topic: "ai moats",
        publishedAt: 2,
        usedAngle: "Data flywheels",
        missingAngles: ["Workflow ownership", "Data flywheels", "Eval harnesses"],
      },
      {
        ...base,
        draftId: "c",
        topic: "Shipping speed",
        publishedAt: 3,
        missingAngles: ["Buyer risk"],
        usedAngle: "Buyer risk",
      },
      {
        ...base,
        draftId: "skip",
        topic: "AI Moats",
        responded: false,
      },
    ];

    const clusters = clusterWinningReplies(rows);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].topic.toLowerCase()).toBe("ai moats");
    expect(clusters[0].replies).toHaveLength(2);
    expect(clusters[0].unusedAngles).toContain("Eval harnesses");
    expect(clusters[0].replies[0].draftId).toBe("b"); // newest first
    expect(clusters[1].id).toBe("shipping-speed");
  });

  it("demo fixtures produce stable clusters + bundles", () => {
    const clusters = demoTopicClusters();
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_WINNING_REPLY_ROWS.every(isWinningReply)).toBe(true);

    const first = clusters[0];
    const bundle = demoComposeBundle(first, "standalone");
    expect(bundle.standalone).toHaveLength(3);
    expect(bundle.thread).toHaveLength(3);
    expect(bundle.longform).toHaveLength(3);
    for (const opt of bundle.standalone) {
      expect(opt.content.length).toBeGreaterThan(0);
      expect(opt.reason.length).toBeGreaterThan(0);
      expect(opt.reason).not.toMatch(/%/);
    }
    const thread = demoComposeBundle(first, "thread");
    expect(thread.thread[0].posts.length).toBeGreaterThanOrEqual(4);
    expect(thread.thread[0].posts.length).toBeLessThanOrEqual(8);
  });
});
