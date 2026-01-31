import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCampaignMember } from "./lib/auth";

const defaultAdultStats = {
  composure: 75,
  arousal: 0,
  dominance: 50,
  submission: 50,
};

const defaultAbilities = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    templateId: v.optional(v.string()),
    name: v.string(),
    pronouns: v.string(),
    portrait: v.optional(v.string()),
    description: v.string(),
    personality: v.string(),
    level: v.optional(v.number()),
    abilities: v.optional(
      v.object({
        strength: v.number(),
        dexterity: v.number(),
        constitution: v.number(),
        intelligence: v.number(),
        wisdom: v.number(),
        charisma: v.number(),
      })
    ),
    adultStats: v.optional(v.object({
      composure: v.number(),
      arousal: v.number(),
      dominance: v.number(),
      submission: v.number(),
    })),
    kinkPreferences: v.optional(v.record(v.string(), v.number())),
    hardLimits: v.optional(v.array(v.string())),
    desires: v.optional(v.string()),
    currentLocationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    const level = args.level || 1;
    const abilities = args.abilities || defaultAbilities;
    const conMod = Math.floor((abilities.constitution - 10) / 2);
    const maxHp = 10 + conMod + (level - 1) * (5 + conMod);

    return await ctx.db.insert("npcs", {
      campaignId: args.campaignId,
      templateId: args.templateId,
      name: args.name,
      pronouns: args.pronouns,
      portrait: args.portrait,
      description: args.description,
      personality: args.personality,
      level,
      hp: maxHp,
      maxHp,
      ac: 10 + Math.floor((abilities.dexterity - 10) / 2),
      abilities,
      adultStats: args.adultStats || defaultAdultStats,
      kinkPreferences: args.kinkPreferences || {},
      hardLimits: args.hardLimits || [],
      desires: args.desires,
      currentLocationId: args.currentLocationId,
      isAlive: true,
      conditions: [],
      memories: [],
    });
  },
});

export const get = query({
  args: { npcId: v.id("npcs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.npcId);
  },
});

export const listByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("npcs")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .filter((q) => q.eq(q.field("isAlive"), true))
      .collect();
  },
});

export const updateHp = mutation({
  args: {
    npcId: v.id("npcs"),
    hp: v.number(),
  },
  handler: async (ctx, args) => {
    const npc = await ctx.db.get(args.npcId);
    if (!npc) throw new Error("NPC not found");

    const newHp = Math.max(0, Math.min(args.hp, npc.maxHp));
    const isAlive = newHp > 0;

    await ctx.db.patch(args.npcId, { hp: newHp, isAlive });
  },
});

export const addMemory = mutation({
  args: {
    npcId: v.id("npcs"),
    memory: v.string(),
  },
  handler: async (ctx, args) => {
    const npc = await ctx.db.get(args.npcId);
    if (!npc) throw new Error("NPC not found");

    await ctx.db.patch(args.npcId, {
      memories: [...npc.memories, args.memory],
    });
  },
});

export const updateLocation = mutation({
  args: {
    npcId: v.id("npcs"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.npcId, {
      currentLocationId: args.locationId,
    });
  },
});
