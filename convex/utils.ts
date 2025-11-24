import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function getUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export function getDateKey(date = new Date()) {
  return date.toISOString().split("T")[0] ?? "";
}
