import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const priority = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

export default defineSchema({
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    priority,
    createdAt: v.string(),
    durationMs: v.number(),
    expiresAt: v.number(),
    source: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_expires", ["userId", "expiresAt"]),
  completedEntries: defineTable({
    userId: v.string(),
    title: v.string(),
    priority,
    completedAt: v.string(),
    createdAt: v.string(),
    durationMs: v.number(),
    source: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  }).index("by_user_completed", ["userId", "completedAt"]),
  expiredEntries: defineTable({
    userId: v.string(),
    title: v.string(),
    priority,
    expiredAt: v.string(),
    createdAt: v.string(),
    originDurationMs: v.number(),
    source: v.optional(v.string()),
    reasoning: v.optional(v.string()),
  }).index("by_user_expired", ["userId", "expiredAt"]),
  stats: defineTable({
    userId: v.string(),
    dateKey: v.string(),
    completed: v.number(),
    expired: v.number(),
  }).index("by_user_date", ["userId", "dateKey"]),
});
