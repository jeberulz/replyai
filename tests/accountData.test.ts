import { describe, expect, test } from "vitest";
import {
  ACCOUNT_USER_TABLES,
  buildAccountExportPayload,
  buildAccountInventory,
  inventoryCountsFromRows,
  sanitizeAccountExportRow,
  selectAccountDeletionBatch,
  tableBelongsToAccount,
  type AccountTable,
} from "../shared/accountData";

describe("account data inventory contract", () => {
  test("lists every user-owned table in bounded deletion order", () => {
    expect(ACCOUNT_USER_TABLES.map((entry) => entry.table)).toEqual([
      "sessions",
      "xTokens",
      "scannerSettings",
      "pushSubscriptions",
      "notificationSettings",
      "notificationDailyCounts",
      "notificationAlerts",
      "briefingSettings",
      "briefingRuns",
      "authors",
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

  test("redacts session and X token secrets from export rows", () => {
    expect(
      sanitizeAccountExportRow("sessions", {
        _id: "session-1",
        userId: "user-1",
        token: "raw-session-token",
        tokenHash: "hashed-session-token",
        createdAt: 1,
        expiresAt: 2,
      })
    ).toEqual({
      _id: "session-1",
      userId: "user-1",
      createdAt: 1,
      expiresAt: 2,
      hasLegacyToken: true,
      hasTokenHash: true,
    });

    expect(
      sanitizeAccountExportRow("xTokens", {
        _id: "token-1",
        userId: "user-1",
        accessToken: "legacy-access",
        encryptedRefreshToken: "encrypted-refresh",
        expiresAt: 123,
        scope: "tweet.read",
      })
    ).toEqual({
      _id: "token-1",
      userId: "user-1",
      expiresAt: 123,
      scope: "tweet.read",
      hasAccessToken: true,
      hasRefreshToken: true,
      tokenStorage: "encrypted",
    });
  });

  test("builds a JSON-safe export payload with ownership isolation", () => {
    const payload = buildAccountExportPayload({
      userId: "user-1",
      exportedAt: "2026-07-08T12:00:00.000Z",
      rowsByTable: {
        users: [
          { _id: "user-1", username: "owner", optionalUndefined: undefined },
          { _id: "user-2", username: "other" },
        ],
        xTokens: [
          {
            _id: "token-1",
            userId: "user-1",
            encryptedAccessToken: "secret",
            expiresAt: 1,
            scope: "tweet.read",
          },
          {
            _id: "token-2",
            userId: "user-2",
            encryptedAccessToken: "other-secret",
            expiresAt: 1,
            scope: "tweet.read",
          },
        ],
        savedDrafts: [
          { _id: "draft-1", userId: "user-1", text: "hello" },
          { _id: "draft-2", userId: "user-2", text: "nope" },
        ],
      },
    });

    expect(payload.schemaVersion).toBe(1);
    expect(payload.inventory.totalRows).toBe(3);
    expect(payload.tables.users).toEqual([{ _id: "user-1", username: "owner" }]);
    expect(payload.tables.xTokens).toEqual([
      {
        _id: "token-1",
        userId: "user-1",
        expiresAt: 1,
        scope: "tweet.read",
        hasAccessToken: true,
        hasRefreshToken: false,
        tokenStorage: "encrypted",
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(payload.tables.savedDrafts).toEqual([
      { _id: "draft-1", userId: "user-1", text: "hello" },
    ]);
  });

  test("selects bounded cascade deletion batches before the user row", () => {
    const first = selectAccountDeletionBatch({
      userId: "user-1",
      batchSize: 2,
      rowsByTable: {
        sessions: [
          { _id: "session-1", userId: "user-1" },
          { _id: "session-2", userId: "user-1" },
          { _id: "session-3", userId: "user-1" },
          { _id: "session-other", userId: "user-2" },
        ],
        users: [{ _id: "user-1" }],
      },
    });

    expect(first).toEqual({
      table: "sessions",
      ids: ["session-1", "session-2"],
      deletesUser: false,
      done: false,
    });
  });

  test("keeps unrelated users and deletes the account root only after children", () => {
    const rowsByTable = {
      sessions: [{ _id: "session-other", userId: "user-2" }],
      savedDrafts: [
        { _id: "draft-1", userId: "user-1" },
        { _id: "draft-other", userId: "user-2" },
      ],
      users: [
        { _id: "user-1", username: "owner" },
        { _id: "user-2", username: "other" },
      ],
    };

    const child = selectAccountDeletionBatch({
      userId: "user-1",
      rowsByTable,
    });
    expect(child.table).toBe("savedDrafts");
    expect(child.ids).toEqual(["draft-1"]);
    expect(child.deletesUser).toBe(false);

    const root = selectAccountDeletionBatch({
      userId: "user-1",
      rowsByTable: {
        sessions: rowsByTable.sessions,
        savedDrafts: [{ _id: "draft-other", userId: "user-2" }],
        users: rowsByTable.users,
      },
    });
    expect(root).toEqual({
      table: "users",
      ids: ["user-1"],
      deletesUser: true,
      done: false,
    });
  });
});
