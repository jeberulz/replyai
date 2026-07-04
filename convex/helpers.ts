import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function userBySessionToken(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  return await ctx.db.get(session.userId);
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<Doc<"users">> {
  const user = await userBySessionToken(ctx, token);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export function currentMonth(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 7);
}
