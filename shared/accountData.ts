export const ACCOUNT_USER_TABLES = [
  {
    table: "sessions",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 10,
  },
  {
    table: "xTokens",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 20,
  },
  {
    table: "scannerSettings",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 30,
  },
  {
    table: "usage",
    ownershipField: "userId",
    indexName: "by_user_month",
    relationshipFields: ["userId", "month"],
    deletionOrder: 40,
  },
  {
    table: "opportunities",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "tweetId"],
    deletionOrder: 50,
  },
  {
    table: "savedDrafts",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "analysisId", "replyId"],
    deletionOrder: 60,
  },
  {
    table: "generatedReplies",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "analysisId", "voiceProfileId"],
    deletionOrder: 70,
  },
  {
    table: "modelEvals",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "analysisId"],
    deletionOrder: 80,
  },
  {
    table: "tweetAnalyses",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "projectId", "tweetId"],
    deletionOrder: 90,
  },
  {
    table: "voiceProfiles",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 100,
  },
  {
    table: "researchProfiles",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId", "runId", "handle"],
    deletionOrder: 110,
  },
  {
    table: "researchRuns",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 120,
  },
  {
    table: "projects",
    ownershipField: "userId",
    indexName: "by_user",
    relationshipFields: ["userId"],
    deletionOrder: 130,
  },
] as const;

export const ACCOUNT_ROOT_TABLE = {
  table: "users",
  ownershipField: "_id",
  relationshipFields: ["_id", "xUserId", "username"],
  deletionOrder: 140,
} as const;

export type AccountUserTable = (typeof ACCOUNT_USER_TABLES)[number]["table"];
export type AccountTable = AccountUserTable | typeof ACCOUNT_ROOT_TABLE.table;

export type AccountTableInventory = {
  table: AccountTable;
  count: number;
  ownershipField: string;
  relationshipFields: readonly string[];
  deletionOrder: number;
};

export type AccountInventory = {
  generatedAt: string;
  dryRun: true;
  userId: string;
  tables: AccountTableInventory[];
  totalRows: number;
};

export type AccountRowsByTable = Partial<
  Record<AccountTable, Array<Record<string, unknown>>>
>;

export function tableBelongsToAccount(
  table: AccountTable,
  row: Record<string, unknown>,
  userId: string
): boolean {
  if (table === ACCOUNT_ROOT_TABLE.table) {
    return row._id === userId;
  }

  const descriptor = ACCOUNT_USER_TABLES.find((entry) => entry.table === table);
  if (!descriptor) return false;
  return row[descriptor.ownershipField] === userId;
}

export function inventoryCountsFromRows(
  rowsByTable: AccountRowsByTable,
  userId: string
): Record<AccountTable, number> {
  const counts = {} as Record<AccountTable, number>;
  for (const descriptor of ACCOUNT_USER_TABLES) {
    counts[descriptor.table] = (rowsByTable[descriptor.table] ?? []).filter(
      (row) => tableBelongsToAccount(descriptor.table, row, userId)
    ).length;
  }
  counts.users = (rowsByTable.users ?? []).filter((row) =>
    tableBelongsToAccount("users", row, userId)
  ).length;
  return counts;
}

export function buildAccountInventory(args: {
  userId: string;
  generatedAt: string;
  counts: Record<AccountTable, number>;
}): AccountInventory {
  const tables: AccountTableInventory[] = [
    ...ACCOUNT_USER_TABLES.map((descriptor) => ({
      table: descriptor.table,
      count: args.counts[descriptor.table] ?? 0,
      ownershipField: descriptor.ownershipField,
      relationshipFields: descriptor.relationshipFields,
      deletionOrder: descriptor.deletionOrder,
    })),
    {
      table: ACCOUNT_ROOT_TABLE.table,
      count: args.counts.users ?? 0,
      ownershipField: ACCOUNT_ROOT_TABLE.ownershipField,
      relationshipFields: ACCOUNT_ROOT_TABLE.relationshipFields,
      deletionOrder: ACCOUNT_ROOT_TABLE.deletionOrder,
    },
  ].sort((a, b) => a.deletionOrder - b.deletionOrder);

  return {
    generatedAt: args.generatedAt,
    dryRun: true,
    userId: args.userId,
    tables,
    totalRows: tables.reduce((sum, table) => sum + table.count, 0),
  };
}
