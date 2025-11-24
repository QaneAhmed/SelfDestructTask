import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getDateKey } from "./utils";

export async function incrementStats(
  ctx: MutationCtx,
  userId: string,
  dateKey: string,
  deltas: { completed?: number; expired?: number },
) {
  const existing = await ctx.db
    .query("stats")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("dateKey", dateKey))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      completed: existing.completed + (deltas.completed ?? 0),
      expired: existing.expired + (deltas.expired ?? 0),
    });
  } else {
    await ctx.db.insert("stats", {
      userId,
      dateKey,
      completed: deltas.completed ?? 0,
      expired: deltas.expired ?? 0,
    });
  }
}

export async function fetchStatsStore(ctx: QueryCtx, userId: string) {
  const entries = await ctx.db
    .query("stats")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();

  const completed: Record<string, number> = {};
  const expired: Record<string, number> = {};
  for (const entry of entries) {
    completed[entry.dateKey] = entry.completed;
    expired[entry.dateKey] = entry.expired;
  }
  return { completed, expired };
}

export function getCurrentWeekDates() {
  const dates: string[] = [];
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + mondayOffset);

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(getDateKey(current));
  }

  return dates;
}
