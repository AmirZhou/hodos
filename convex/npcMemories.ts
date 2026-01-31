import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireCampaignMember } from "./lib/auth";

// Types
export interface KeyMoment {
  timestamp: number;
  summary: string;
  emotionalImpact: number;
  tags: string[];
}

export interface EmotionalState {
  currentMood: string;
  feelingsTowardCharacter: string;
  trustLevel: number;
  attractionLevel: number;
  lastUpdated: number;
}

// Input type for updating emotional state (lastUpdated is auto-set)
export interface EmotionalStateInput {
  currentMood: string;
  feelingsTowardCharacter: string;
  trustLevel: number;
  attractionLevel: number;
}

export interface RelationshipStatus {
  type: "stranger" | "acquaintance" | "friend" | "intimate" | "rival";
  dynamicEstablished: boolean;
  sharedSecrets: string[];
}

export interface NpcMemoryData {
  keyMoments: KeyMoment[];
  emotionalState: EmotionalState;
  relationshipStatus: RelationshipStatus;
}

// Constants
export const MAX_KEY_MOMENTS = 10;

// Pure helper functions (exported for testing)
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function createDefaultMemory(): NpcMemoryData {
  return {
    keyMoments: [],
    emotionalState: {
      currentMood: "neutral",
      feelingsTowardCharacter: "indifferent",
      trustLevel: 50,
      attractionLevel: 0,
      lastUpdated: Date.now(),
    },
    relationshipStatus: {
      type: "stranger",
      dynamicEstablished: false,
      sharedSecrets: [],
    },
  };
}

export function addKeyMomentToMemory(
  memory: NpcMemoryData,
  moment: KeyMoment
): NpcMemoryData {
  const newMoments = [...memory.keyMoments, moment];
  // Keep only the most recent MAX_KEY_MOMENTS
  const trimmedMoments =
    newMoments.length > MAX_KEY_MOMENTS
      ? newMoments.slice(newMoments.length - MAX_KEY_MOMENTS)
      : newMoments;

  return {
    ...memory,
    keyMoments: trimmedMoments,
  };
}

export function updateEmotionalStateInMemory(
  memory: NpcMemoryData,
  newState: EmotionalStateInput
): NpcMemoryData {
  return {
    ...memory,
    emotionalState: {
      ...newState,
      trustLevel: clampValue(newState.trustLevel, 0, 100),
      attractionLevel: clampValue(newState.attractionLevel, 0, 100),
      lastUpdated: Date.now(),
    },
  };
}

// Convex queries and mutations
export const get = query({
  args: {
    npcId: v.id("npcs"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("npcMemories")
      .withIndex("by_npc_and_character", (q) =>
        q.eq("npcId", args.npcId).eq("characterId", args.characterId)
      )
      .first();
  },
});

export const getByNpc = query({
  args: {
    npcId: v.id("npcs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("npcMemories")
      .withIndex("by_npc", (q) => q.eq("npcId", args.npcId))
      .collect();
  },
});

export const getByCharacter = query({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("npcMemories")
      .withIndex("by_character", (q) => q.eq("characterId", args.characterId))
      .collect();
  },
});

export const getOrCreate = mutation({
  args: {
    npcId: v.id("npcs"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const npc = await ctx.db.get(args.npcId);
    if (!npc) throw new Error("NPC not found");
    await requireCampaignMember(ctx, npc.campaignId);

    // Check if memory exists
    const existing = await ctx.db
      .query("npcMemories")
      .withIndex("by_npc_and_character", (q) =>
        q.eq("npcId", args.npcId).eq("characterId", args.characterId)
      )
      .first();

    if (existing) {
      return existing;
    }

    // Create new memory with defaults
    const defaultMemory = createDefaultMemory();
    const now = Date.now();

    const id = await ctx.db.insert("npcMemories", {
      npcId: args.npcId,
      characterId: args.characterId,
      keyMoments: defaultMemory.keyMoments,
      emotionalState: {
        ...defaultMemory.emotionalState,
        lastUpdated: now,
      },
      relationshipStatus: defaultMemory.relationshipStatus,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const addKeyMoment = mutation({
  args: {
    npcId: v.id("npcs"),
    characterId: v.id("characters"),
    moment: v.object({
      summary: v.string(),
      emotionalImpact: v.number(),
      tags: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const npc = await ctx.db.get(args.npcId);
    if (!npc) throw new Error("NPC not found");
    await requireCampaignMember(ctx, npc.campaignId);

    const memory = await ctx.db
      .query("npcMemories")
      .withIndex("by_npc_and_character", (q) =>
        q.eq("npcId", args.npcId).eq("characterId", args.characterId)
      )
      .first();

    if (!memory) {
      throw new Error("Memory not found. Call getOrCreate first.");
    }

    const fullMoment: KeyMoment = {
      timestamp: Date.now(),
      ...args.moment,
    };

    const updated = addKeyMomentToMemory(
      {
        keyMoments: memory.keyMoments,
        emotionalState: memory.emotionalState,
        relationshipStatus: memory.relationshipStatus,
      },
      fullMoment
    );

    await ctx.db.patch(memory._id, {
      keyMoments: updated.keyMoments,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(memory._id);
  },
});

export const updateEmotionalState = mutation({
  args: {
    npcId: v.id("npcs"),
    characterId: v.id("characters"),
    emotionalState: v.object({
      currentMood: v.string(),
      feelingsTowardCharacter: v.string(),
      trustLevel: v.number(),
      attractionLevel: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const npc = await ctx.db.get(args.npcId);
    if (!npc) throw new Error("NPC not found");
    await requireCampaignMember(ctx, npc.campaignId);

    const memory = await ctx.db
      .query("npcMemories")
      .withIndex("by_npc_and_character", (q) =>
        q.eq("npcId", args.npcId).eq("characterId", args.characterId)
      )
      .first();

    if (!memory) {
      throw new Error("Memory not found. Call getOrCreate first.");
    }

    const updated = updateEmotionalStateInMemory(
      {
        keyMoments: memory.keyMoments,
        emotionalState: memory.emotionalState,
        relationshipStatus: memory.relationshipStatus,
      },
      args.emotionalState
    );

    await ctx.db.patch(memory._id, {
      emotionalState: updated.emotionalState,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(memory._id);
  },
});

export const updateRelationshipStatus = mutation({
  args: {
    npcId: v.id("npcs"),
    characterId: v.id("characters"),
    relationshipStatus: v.object({
      type: v.union(
        v.literal("stranger"),
        v.literal("acquaintance"),
        v.literal("friend"),
        v.literal("intimate"),
        v.literal("rival")
      ),
      dynamicEstablished: v.boolean(),
      sharedSecrets: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("npcMemories")
      .withIndex("by_npc_and_character", (q) =>
        q.eq("npcId", args.npcId).eq("characterId", args.characterId)
      )
      .first();

    if (!memory) {
      throw new Error("Memory not found. Call getOrCreate first.");
    }

    await ctx.db.patch(memory._id, {
      relationshipStatus: args.relationshipStatus,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(memory._id);
  },
});
