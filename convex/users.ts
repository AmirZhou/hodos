import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get or create user by email (simple auth)
export const getOrCreateByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return existing;
    }

    // Create new user
    const displayName = email.split("@")[0];
    const userId = await ctx.db.insert("users", {
      email,
      displayName,
      settings: {
        explicitContent: true,
        videoEnabled: true,
        intensityPreference: 5,
      },
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

// Get user by ID
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();
  },
});

// Legacy: Get or create by Clerk ID (for future Clerk integration)
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

// Legacy: Get by Clerk ID
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

export const updateDisplayName = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { displayName: args.displayName });
  },
});
