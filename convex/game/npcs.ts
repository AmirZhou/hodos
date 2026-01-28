import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

interface NPCDialogue {
  name: string;
  text: string;
}

interface AIResponse {
  npcDialogue?: NPCDialogue[];
}

// Extract unique NPC names from AI response
export function extractNPCsFromResponse(response: AIResponse): string[] {
  if (!response.npcDialogue || response.npcDialogue.length === 0) {
    return [];
  }

  const names = response.npcDialogue.map((d) => d.name);
  return [...new Set(names)];
}

// Get or create an NPC by name for a campaign
export const getOrCreate = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if NPC already exists (fuzzy match on normalized name)
    const { findMatchingNpc } = await import("./npcNameResolver");
    const campaignNpcs = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();

    const matchId = findMatchingNpc(args.name, campaignNpcs);
    if (matchId) {
      return matchId;
    }

    // Create new NPC with default values
    const now = Date.now();
    return await ctx.db.insert("npcs", {
      campaignId: args.campaignId,
      name: args.name,
      pronouns: "they/them",
      description: args.description || `A character named ${args.name}`,
      personality: "Unknown - discovered through interaction",
      level: 1,
      hp: 10,
      maxHp: 10,
      ac: 10,
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      isAlive: true,
      conditions: [],
      memories: [],
      autoCreated: true,
      firstMetAt: now,
      // Default intimacy profile
      intimacyProfile: {
        orientation: "unknown",
        roleIdentity: {
          power: 50,
          action: 50,
          sensation: 50,
          service: 50,
          flexibility: 50,
        },
        kinks: {},
        aftercareNeed: 50,
        trustThreshold: 50,
      },
    });
  },
});

// Get NPCs the player has interacted with in this campaign
export const getInteractedNPCs = query({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    // Get all NPCs for this campaign that have relationships with this character
    const relationships = await ctx.db
      .query("relationships")
      .withIndex("by_character", (q) => q.eq("characterId", args.characterId))
      .collect();

    // Get the NPC details for each relationship
    const npcsWithRelationships = await Promise.all(
      relationships.map(async (rel) => {
        const npc = await ctx.db.get(rel.npcId);
        if (!npc || npc.campaignId !== args.campaignId) return null;

        return {
          _id: npc._id,
          name: npc.name,
          portrait: npc.portrait,
          description: npc.description,
          relationship: {
            affinity: rel.affinity,
            trust: rel.trust,
            attraction: rel.attraction,
          },
        };
      })
    );

    return npcsWithRelationships.filter(Boolean);
  },
});

// Get all NPCs in a campaign (for sidebar)
export const getByCampaign = query({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    const npcs = await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .collect();

    return npcs.map((npc) => ({
      _id: npc._id,
      name: npc.name,
      portrait: npc.portrait,
      description: npc.description,
      descriptionFr: npc.descriptionFr,
      currentLocationId: npc.currentLocationId,
      autoCreated: npc.autoCreated,
      firstMetAt: npc.firstMetAt,
    }));
  },
});
