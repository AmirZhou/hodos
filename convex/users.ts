import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Sync Clerk user identity into Convex users table.
// Called on sign-in to upsert the user record.
export const syncClerkUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const clerkId = identity.subject;
    const email = (identity.email ?? "").toLowerCase().trim();
    const displayName =
      identity.name ?? identity.nickname ?? email.split("@")[0];

    // 1. Look up by clerkId
    const byClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (byClerkId) {
      // Update email/displayName if changed
      const updates: Record<string, string> = {};
      if (email && byClerkId.email !== email) updates.email = email;
      if (displayName && byClerkId.displayName !== displayName)
        updates.displayName = displayName;
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(byClerkId._id, updates);
      }
      return await ctx.db.get(byClerkId._id);
    }

    // 2. Migration path: look up by email, link clerkId
    if (email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (byEmail) {
        await ctx.db.patch(byEmail._id, { clerkId });
        return await ctx.db.get(byEmail._id);
      }
    }

    // 3. Create new user
    const userId = await ctx.db.insert("users", {
      clerkId,
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

// Query user by Clerk subject ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

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
        explicitContent: true,
        videoEnabled: true,
        intensityPreference: 5,
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
    settings: v.object({
      explicitContent: v.boolean(),
      videoEnabled: v.boolean(),
      intensityPreference: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await ctx.db.patch(userId, { settings: args.settings });
  },
});

export const updateDisplayName = mutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await ctx.db.patch(userId, { displayName: args.displayName });
  },
});
