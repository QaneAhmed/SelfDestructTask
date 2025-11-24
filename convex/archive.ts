import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./utils";

export const listCompleted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return ctx.db
      .query("completedEntries")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

export const listExpired = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return ctx.db
      .query("expiredEntries")
      .withIndex("by_user_expired", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const entries = await ctx.db
      .query("completedEntries")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(entries.map((entry) => ctx.db.delete(entry._id)));
  },
});

export const clearExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const entries = await ctx.db
      .query("expiredEntries")
      .withIndex("by_user_expired", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(entries.map((entry) => ctx.db.delete(entry._id)));
  },
});
