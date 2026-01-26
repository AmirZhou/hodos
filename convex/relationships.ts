import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    npcId: v.id("npcs"),
    initialAffinity: v.optional(v.number()),
    initialTrust: v.optional(v.number()),
    initialAttraction: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if relationship already exists
    const existing = await ctx.db
      .query("relationships")
      .withIndex("by_character_and_npc", (q) =>
        q.eq("characterId", args.characterId).eq("npcId", args.npcId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("relationships", {
      campaignId: args.campaignId,
      characterId: args.characterId,
      npcId: args.npcId,
      affinity: args.initialAffinity ?? 0,
      trust: args.initialTrust ?? 0,
      attraction: args.initialAttraction ?? 0,
      tension: 0,
      intimacy: 0,
      history: [],
      flags: {},
    });
  },
});

export const get = query({
  args: {
    characterId: v.id("characters"),
    npcId: v.id("npcs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("relationships")
      .withIndex("by_character_and_npc", (q) =>
        q.eq("characterId", args.characterId).eq("npcId", args.npcId)
      )
      .first();
  },
});

export const getForCharacter = query({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("relationships")
      .withIndex("by_character", (q) => q.eq("characterId", args.characterId))
      .collect();

    // Enrich with NPC data
    return Promise.all(
      relationships.map(async (rel) => {
        const npc = await ctx.db.get(rel.npcId);
        return {
          ...rel,
          npc: npc ? { name: npc.name, portrait: npc.portrait } : null,
        };
      })
    );
  },
});

export const update = mutation({
  args: {
    relationshipId: v.id("relationships"),
    affinity: v.optional(v.number()),
    trust: v.optional(v.number()),
    attraction: v.optional(v.number()),
    tension: v.optional(v.number()),
    intimacy: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { relationshipId, ...updates } = args;

    // Clamp values to valid ranges
    const clampedUpdates: Record<string, number> = {};
    if (updates.affinity !== undefined) {
      clampedUpdates.affinity = Math.max(-100, Math.min(100, updates.affinity));
    }
    if (updates.trust !== undefined) {
      clampedUpdates.trust = Math.max(0, Math.min(100, updates.trust));
    }
    if (updates.attraction !== undefined) {
      clampedUpdates.attraction = Math.max(0, Math.min(100, updates.attraction));
    }
    if (updates.tension !== undefined) {
      clampedUpdates.tension = Math.max(0, Math.min(100, updates.tension));
    }
    if (updates.intimacy !== undefined) {
      clampedUpdates.intimacy = Math.max(0, Math.min(100, updates.intimacy));
    }

    await ctx.db.patch(relationshipId, clampedUpdates);
  },
});

export const addHistoryEvent = mutation({
  args: {
    relationshipId: v.id("relationships"),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship) throw new Error("Relationship not found");

    await ctx.db.patch(args.relationshipId, {
      history: [...relationship.history, args.event],
    });
  },
});

export const setFlag = mutation({
  args: {
    relationshipId: v.id("relationships"),
    flag: v.string(),
    value: v.boolean(),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship) throw new Error("Relationship not found");

    await ctx.db.patch(args.relationshipId, {
      flags: {
        ...relationship.flags,
        [args.flag]: args.value,
      },
    });
  },
});

export const setDynamic = mutation({
  args: {
    relationshipId: v.id("relationships"),
    dynamic: v.object({
      type: v.union(
        v.literal("none"),
        v.literal("scene-only"),
        v.literal("ongoing"),
        v.literal("24/7")
      ),
      protocolLevel: v.number(),
      roles: v.object({
        character: v.string(),
        npc: v.string(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.relationshipId, {
      dynamic: args.dynamic,
    });
  },
});

// Calculate compatibility score between character and NPC
export const calculateCompatibility = query({
  args: {
    characterId: v.id("characters"),
    npcId: v.id("npcs"),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    const npc = await ctx.db.get(args.npcId);

    if (!character || !npc) {
      throw new Error("Character or NPC not found");
    }

    const charProfile = character.intimacyProfile;
    const npcProfile = npc.intimacyProfile;

    // Calculate role compatibility
    // Complementary roles (dom + sub) score higher than matching roles
    const powerCompat =
      100 - Math.abs(charProfile.roleIdentity.power + npcProfile.roleIdentity.power - 100);
    const actionCompat =
      100 - Math.abs(charProfile.roleIdentity.action + npcProfile.roleIdentity.action - 100);
    const sensationCompat =
      100 - Math.abs(charProfile.roleIdentity.sensation + npcProfile.roleIdentity.sensation - 100);

    // Calculate kink overlap
    const charKinks = new Set(
      Object.entries(charProfile.kinks)
        .filter(([_, v]) => v > 0)
        .map(([k]) => k)
    );
    const npcKinks = new Set(
      Object.entries(npcProfile.kinks)
        .filter(([_, v]) => v > 0)
        .map(([k]) => k)
    );

    const sharedKinks = [...charKinks].filter((k) => npcKinks.has(k));
    const kinkOverlap =
      charKinks.size > 0 || npcKinks.size > 0
        ? (sharedKinks.length / Math.max(charKinks.size, npcKinks.size)) * 100
        : 50;

    // Check for limit conflicts
    const charLimits = new Set(
      Object.entries(charProfile.kinks)
        .filter(([_, v]) => v === -2)
        .map(([k]) => k)
    );
    const npcLimits = new Set(
      Object.entries(npcProfile.kinks)
        .filter(([_, v]) => v === -2)
        .map(([k]) => k)
    );

    // If character's interests conflict with NPC's hard limits (or vice versa), reduce compatibility
    const charInterests = new Set(
      Object.entries(charProfile.kinks)
        .filter(([_, v]) => v >= 2)
        .map(([k]) => k)
    );
    const npcInterests = new Set(
      Object.entries(npcProfile.kinks)
        .filter(([_, v]) => v >= 2)
        .map(([k]) => k)
    );

    const limitConflicts =
      [...charInterests].filter((k) => npcLimits.has(k)).length +
      [...npcInterests].filter((k) => charLimits.has(k)).length;

    const limitPenalty = limitConflicts * 15;

    // Overall compatibility score
    const rawScore =
      (powerCompat * 0.3 +
        actionCompat * 0.2 +
        sensationCompat * 0.2 +
        kinkOverlap * 0.3) -
      limitPenalty;

    const compatibility = Math.max(0, Math.min(100, rawScore));

    return {
      overall: Math.round(compatibility),
      roleCompatibility: Math.round((powerCompat + actionCompat + sensationCompat) / 3),
      kinkOverlap: Math.round(kinkOverlap),
      sharedKinks,
      limitConflicts,
      details: {
        powerCompat: Math.round(powerCompat),
        actionCompat: Math.round(actionCompat),
        sensationCompat: Math.round(sensationCompat),
      },
    };
  },
});
