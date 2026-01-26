import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreate = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      settings: {
        language: "bilingual",
        explicitContent: true,
        videoEnabled: true,
        frenchLevel: "beginner",
      },
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const updateSettings = mutation({
  args: {
    userId: v.id("users"),
    settings: v.object({
      language: v.union(v.literal("en"), v.literal("fr"), v.literal("bilingual")),
      explicitContent: v.boolean(),
      videoEnabled: v.boolean(),
      frenchLevel: v.union(
        v.literal("none"),
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      ),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { settings: args.settings });
  },
});
