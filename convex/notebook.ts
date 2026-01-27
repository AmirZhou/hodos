import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// SM-2 Spaced Repetition Algorithm
export const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 365;

type Rating = "wrong" | "hard" | "medium" | "easy";

interface ReviewResult {
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: number;
}

export function calculateNextReview(
  currentIntervalDays: number,
  currentEaseFactor: number,
  rating: Rating
): ReviewResult {
  let newInterval: number;
  let newEaseFactor = currentEaseFactor;

  if (rating === "wrong") {
    // Reset to beginning
    newInterval = 1;
    newEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.2);
  } else if (currentIntervalDays === 0) {
    // First review
    newInterval = 1;
  } else if (currentIntervalDays === 1) {
    // Second review
    newInterval = 3;
  } else {
    // Subsequent reviews
    switch (rating) {
      case "hard":
        newInterval = Math.floor(currentIntervalDays * 1.2);
        newEaseFactor = Math.max(MIN_EASE_FACTOR, currentEaseFactor - 0.15);
        break;
      case "medium":
        newInterval = Math.ceil(currentIntervalDays * currentEaseFactor);
        break;
      case "easy":
        newInterval = Math.round(currentIntervalDays * currentEaseFactor * 1.3);
        newEaseFactor = currentEaseFactor + 0.15;
        break;
      default:
        newInterval = Math.ceil(currentIntervalDays * currentEaseFactor);
    }
  }

  // Cap at maximum interval
  newInterval = Math.min(newInterval, MAX_INTERVAL_DAYS);

  // Calculate next review date
  const now = Date.now();
  const nextReviewDate = now + newInterval * 24 * 60 * 60 * 1000;

  return {
    intervalDays: newInterval,
    easeFactor: newEaseFactor,
    nextReviewDate,
  };
}

// Save a sentence to the notebook
export const save = mutation({
  args: {
    userId: v.id("users"),
    frenchText: v.string(),
    englishText: v.string(),
    grammarNotes: v.array(v.string()),
    vocabularyItems: v.array(
      v.object({
        word: v.string(),
        translation: v.string(),
        partOfSpeech: v.string(),
      })
    ),
    usageNote: v.string(),
    gameLogId: v.id("gameLog"),
    campaignId: v.id("campaigns"),
    sceneSummary: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if already saved (same gameLogId and user)
    const existing = await ctx.db
      .query("notebook")
      .withIndex("by_game_log", (q) => q.eq("gameLogId", args.gameLogId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    // First review tomorrow
    const nextReviewDate = now + 24 * 60 * 60 * 1000;

    return await ctx.db.insert("notebook", {
      ...args,
      tags: args.tags ?? [],
      userNotes: "",
      nextReviewDate,
      intervalDays: 0,
      easeFactor: DEFAULT_EASE_FACTOR,
      reviewCount: 0,
      createdAt: now,
    });
  },
});

// Get all notebook entries for a user
export const getAll = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebook")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get a single notebook entry by ID
export const getById = query({
  args: {
    id: v.id("notebook"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get entries due for review
export const getDueForReview = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const entries = await ctx.db
      .query("notebook")
      .withIndex("by_user_and_review", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to only due items
    return entries.filter((e) => e.nextReviewDate <= now);
  },
});

// Get count of items due for review
export const getDueCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const entries = await ctx.db
      .query("notebook")
      .withIndex("by_user_and_review", (q) => q.eq("userId", args.userId))
      .collect();

    return entries.filter((e) => e.nextReviewDate <= now).length;
  },
});

// Record a review result
export const recordReview = mutation({
  args: {
    entryId: v.id("notebook"),
    rating: v.union(
      v.literal("wrong"),
      v.literal("hard"),
      v.literal("medium"),
      v.literal("easy")
    ),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Notebook entry not found");
    }

    const { intervalDays, easeFactor, nextReviewDate } = calculateNextReview(
      entry.intervalDays,
      entry.easeFactor,
      args.rating
    );

    await ctx.db.patch(args.entryId, {
      intervalDays,
      easeFactor,
      nextReviewDate,
      reviewCount: entry.reviewCount + 1,
      lastReviewDate: Date.now(),
    });
  },
});

// Update user notes
export const updateNotes = mutation({
  args: {
    entryId: v.id("notebook"),
    userNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, {
      userNotes: args.userNotes,
    });
  },
});

// Add tags to an entry
export const addTags = mutation({
  args: {
    entryId: v.id("notebook"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Notebook entry not found");
    }

    const newTags = [...new Set([...entry.tags, ...args.tags])];
    await ctx.db.patch(args.entryId, { tags: newTags });
  },
});

// Delete a notebook entry
export const remove = mutation({
  args: {
    entryId: v.id("notebook"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.entryId);
  },
});

// Get entries by campaign
export const getByCampaign = query({
  args: {
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notebook")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

// Get a single entry with context
export const getWithContext = query({
  args: {
    entryId: v.id("notebook"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      return null;
    }

    // Get the game log entry
    const gameLog = await ctx.db.get(entry.gameLogId);

    // Get surrounding log entries for context
    let contextLogs: any[] = [];
    if (gameLog) {
      const allLogs = await ctx.db
        .query("gameLog")
        .withIndex("by_campaign_and_time", (q) =>
          q.eq("campaignId", entry.campaignId)
        )
        .collect();

      const logIndex = allLogs.findIndex((l) => l._id === entry.gameLogId);
      if (logIndex >= 0) {
        // Get 3 before and 3 after
        const start = Math.max(0, logIndex - 3);
        const end = Math.min(allLogs.length, logIndex + 4);
        contextLogs = allLogs.slice(start, end);
      }
    }

    return {
      ...entry,
      gameLog,
      contextLogs,
    };
  },
});
