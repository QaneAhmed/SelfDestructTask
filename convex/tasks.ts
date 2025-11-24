import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId, getDateKey } from "./utils";
import { incrementStats } from "./statsUtils";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return tasks;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    durationMinutes: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    source: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const durationMs = Math.max(5, args.durationMinutes) * 60 * 1000;
    return ctx.db.insert("tasks", {
      userId,
      title: args.title,
      priority: args.priority,
      createdAt: new Date().toISOString(),
      durationMs,
      expiresAt: Date.now() + durationMs,
      source: args.source,
      reasoning: args.reasoning,
    });
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found");
    }
    await ctx.db.patch(args.taskId, { title: args.title, priority: args.priority });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const userId = await getUserId(ctx);
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found");
    }
    await ctx.db.delete(taskId);
  },
});

export const complete = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const userId = await getUserId(ctx);
    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found");
    }
    await ctx.db.insert("completedEntries", {
      userId,
      title: task.title,
      priority: task.priority,
      completedAt: new Date().toISOString(),
      createdAt: task.createdAt,
      durationMs: task.durationMs,
      source: task.source,
      reasoning: task.reasoning,
    });
    await incrementStats(ctx, userId, getDateKey(), { completed: 1 });
    await ctx.db.delete(taskId);
  },
});

export const expireDue = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const expired = await ctx.db
      .query("tasks")
      .withIndex("by_user_expires", (q) => q.eq("userId", userId).lte("expiresAt", now))
      .collect();

    if (expired.length === 0) return 0;

    for (const task of expired) {
      await ctx.db.insert("expiredEntries", {
        userId,
        title: task.title,
        priority: task.priority,
        expiredAt: new Date().toISOString(),
        createdAt: task.createdAt,
        originDurationMs: task.durationMs,
        source: task.source,
        reasoning: task.reasoning,
      });
      await ctx.db.delete(task._id);
    }

    await incrementStats(ctx, userId, getDateKey(), { expired: expired.length });
    return expired.length;
  },
});
