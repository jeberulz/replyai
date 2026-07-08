import { describe, expect, test } from "vitest";
import {
  ACCOUNT_USER_TABLES,
  buildAccountInventory,
  inventoryCountsFromRows,
  tableBelongsToAccount,
  type AccountTable,
} from "../shared/accountData";

describe("account data inventory contract", () => {
  test("lists every user-owned table in bounded deletion order", () => {
    expect(ACCOUNT_USER_TABLES.map((entry) => entry.table)).toEqual([
      "sessions",
      "xTokens",
      "scannerSettings",
      "usage",
      "opportunities",
      "savedDrafts",
      "generatedReplies",
      "modelEvals",
      "tweetAnalyses",
      "voiceProfiles",
      "researchProfiles",
      "researchRuns",
      "projects",
    ]);
    expect(ACCOUNT_USER_TABLES.every((entry) => entry.ownershipField === "userId"))
      .toBe(true);
  });

  test("scopes inventory rows to the authenticated account owner", () => {
    const rows = {
      sessions: [
        { _id: "session-1", userId: "user-1" },
        { _id: "session-2", userId: "user-2" },
      ],
      generatedReplies: [
        { _id: "reply-1", userId: "user-1", analysisId: "analysis-1" },
        { _id: "reply-2", userId: "user-2", analysisId: "analysis-2" },
      ],
      researchProfiles: [
        { _id: "profile-1", userId: "user-1", runId: "run-1" },
        { _id: "profile-2", userId: "user-2", runId: "run-2" },
      ],
      users: [
        { _id: "user-1", username: "owner" },
        { _id: "user-2", username: "other" },
      ],
    };

    const counts = inventoryCountsFromRows(rows, "user-1");

    expect(counts.sessions).toBe(1);
    expect(counts.generatedReplies).toBe(1);
    expect(counts.researchProfiles).toBe(1);
    expect(counts.users).toBe(1);
  });

  test("excludes unrelated users even when relationship ids point at owned rows", () => {
    expect(
      tableBelongsToAccount(
        "generatedReplies",
        { _id: "reply-1", userId: "user-2", analysisId: "owned-analysis" },
        "user-1"
      )
    ).toBe(false);
    expect(
      tableBelongsToAccount(
        "users",
        { _id: "user-2", xUserId: "x-2", username: "other" },
        "user-1"
      )
    ).toBe(false);
  });

  test("builds deterministic dry-run totals from supplied counts", () => {
    const counts = Object.fromEntries(
      [...ACCOUNT_USER_TABLES.map((entry) => entry.table), "users"].map(
        (table) => [table, table === "users" ? 1 : 0]
      )
    ) as Record<AccountTable, number>;
    counts.sessions = 2;
    counts.generatedReplies = 3;

    const inventory = buildAccountInventory({
      userId: "user-1",
      generatedAt: "2026-07-08T12:00:00.000Z",
      counts,
    });

    expect(inventory.dryRun).toBe(true);
    expect(inventory.totalRows).toBe(6);
    expect(inventory.tables.map((table) => table.table).at(-1)).toBe("users");
  });
});
