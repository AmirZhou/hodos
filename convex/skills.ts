/**
 * Skills module — queries and mutations for the entity skill system.
 *
 * Pure helper functions (canLearnTechnique, canTierUp) are exported for
 * unit testing.  Queries and mutations operate on the entitySkills,
 * entityTechniques, teachingAvailability, and ceilingRaises tables.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { XP_THRESHOLDS } from "./data/skillCatalog";
import { getTechniqueById } from "./data/techniqueCatalog";

// ============ SHARED VALIDATORS ============

const entityTypeValidator = v.union(
  v.literal("character"),
  v.literal("npc"),
);

// ============ PURE HELPERS (exported for testing) ============

/**
 * Returns true when the entity's current tier meets the technique's tier
 * requirement AND every prerequisite technique has already been learned.
 */
export function canLearnTechnique(
  currentTier: number,
  tierRequired: number,
  prerequisites: string[],
  learnedTechniques: Set<string>,
): boolean {
  if (currentTier < tierRequired) return false;
  for (const prereq of prerequisites) {
    if (!learnedTechniques.has(prereq)) return false;
  }
  return true;
}

/**
 * Returns true when the entity can advance to the next tier:
 * - currentTier < 8 (hard cap)
 * - currentTier < ceiling (soft cap from NPC training / discoveries)
 * - practiceXp >= XP_THRESHOLDS[currentTier]
 */
export function canTierUp(
  practiceXp: number,
  currentTier: number,
  ceiling: number,
): boolean {
  if (currentTier >= 8) return false;
  if (currentTier >= ceiling) return false;
  const threshold = XP_THRESHOLDS[currentTier];
  if (threshold === undefined) return false;
  return practiceXp >= threshold;
}

// ============ QUERIES ============

/** Fetch all skills for an entity in a campaign. */
export const getEntitySkills = query({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType),
      )
      .collect();
  },
});

/** Fetch all learned techniques for an entity in a campaign. */
export const getEntityTechniques = query({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entityTechniques")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType),
      )
      .collect();
  },
});

/** Fetch everything an NPC can teach. */
export const getTeachingOptions = query({
  args: {
    npcId: v.id("npcs"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teachingAvailability")
      .withIndex("by_npc", (q) => q.eq("npcId", args.npcId))
      .collect();
  },
});

// ============ MUTATIONS ============

/** Create a new entitySkill record for an entity. */
export const initializeSkill = mutation({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    currentTier: v.number(),
    ceiling: v.number(),
  },
  handler: async (ctx, args) => {
    const xpToNextTier = XP_THRESHOLDS[args.currentTier] ?? 0;
    await ctx.db.insert("entitySkills", {
      entityId: args.entityId,
      entityType: args.entityType,
      campaignId: args.campaignId,
      skillId: args.skillId,
      currentTier: args.currentTier,
      ceiling: args.ceiling,
      practiceXp: 0,
      xpToNextTier,
    });
  },
});

/** Learn a technique — validates tier, prerequisites, and uniqueness. */
export const learnTechnique = mutation({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    campaignId: v.id("campaigns"),
    techniqueId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Validate technique exists
    const technique = getTechniqueById(args.techniqueId);
    if (!technique) {
      throw new Error(`Unknown technique: ${args.techniqueId}`);
    }

    // 2. Check not already learned (using by_entity_technique index)
    const existing = await ctx.db
      .query("entityTechniques")
      .withIndex("by_entity_technique", (q) =>
        q
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType)
          .eq("techniqueId", args.techniqueId),
      )
      .first();
    if (existing) {
      throw new Error(`Technique ${args.techniqueId} already learned`);
    }

    // 3. Check tier requirement — find the entity's skill record
    const entitySkill = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType),
      )
      .filter((q) => q.eq(q.field("skillId"), technique.skillId))
      .first();

    const currentTier = entitySkill?.currentTier ?? 0;

    // 4. Check prerequisites — gather learned techniques for this entity
    const learnedRows = await ctx.db
      .query("entityTechniques")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType),
      )
      .collect();
    const learnedSet = new Set(learnedRows.map((r) => r.techniqueId));

    if (
      !canLearnTechnique(
        currentTier,
        technique.tierRequired,
        technique.prerequisites,
        learnedSet,
      )
    ) {
      throw new Error(
        `Cannot learn ${args.techniqueId}: tier or prerequisite requirement not met`,
      );
    }

    // 5. Insert
    await ctx.db.insert("entityTechniques", {
      entityId: args.entityId,
      entityType: args.entityType,
      campaignId: args.campaignId,
      techniqueId: args.techniqueId,
      skillId: technique.skillId,
      timesUsed: 0,
      lastUsedAt: 0,
      usesToday: 0,
      lastDayReset: 0,
    });
  },
});

/**
 * Award practice XP to a skill and auto-tier-up in a loop when thresholds
 * are met.
 */
export const awardSkillXp = mutation({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    xp: v.number(),
  },
  handler: async (ctx, args) => {
    const entitySkill = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType),
      )
      .filter((q) => q.eq(q.field("skillId"), args.skillId))
      .first();

    if (!entitySkill) {
      throw new Error(
        `Entity skill not found: ${args.skillId} for ${args.entityId}`,
      );
    }

    let { practiceXp, currentTier, ceiling } = entitySkill;
    practiceXp += args.xp;

    // Auto tier-up loop
    while (canTierUp(practiceXp, currentTier, ceiling)) {
      const threshold = XP_THRESHOLDS[currentTier]!;
      practiceXp -= threshold;
      currentTier += 1;
    }

    const xpToNextTier = XP_THRESHOLDS[currentTier] ?? 0;

    await ctx.db.patch(entitySkill._id, {
      practiceXp,
      currentTier,
      xpToNextTier,
    });
  },
});

/**
 * Raise the tier ceiling for a character's skill.  Only upgrades (no
 * downgrade).  Writes an audit record to ceilingRaises.
 */
export const raiseCeiling = mutation({
  args: {
    characterId: v.id("characters"),
    campaignId: v.id("campaigns"),
    skillId: v.string(),
    newCeiling: v.number(),
    source: v.union(
      v.literal("npc_training"),
      v.literal("discovery"),
      v.literal("milestone"),
    ),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the entity skill using the character id as a string entityId
    const entitySkill = await ctx.db
      .query("entitySkills")
      .withIndex("by_campaign_entity", (q) =>
        q
          .eq("campaignId", args.campaignId)
          .eq("entityId", args.characterId)
          .eq("entityType", "character"),
      )
      .filter((q) => q.eq(q.field("skillId"), args.skillId))
      .first();

    if (!entitySkill) {
      throw new Error(
        `Entity skill not found: ${args.skillId} for character ${args.characterId}`,
      );
    }

    // Only upgrade, never downgrade
    if (args.newCeiling <= entitySkill.ceiling) return;

    const previousCeiling = entitySkill.ceiling;

    await ctx.db.patch(entitySkill._id, {
      ceiling: args.newCeiling,
    });

    // Audit record
    await ctx.db.insert("ceilingRaises", {
      characterId: args.characterId,
      campaignId: args.campaignId,
      skillId: args.skillId,
      previousCeiling,
      newCeiling: args.newCeiling,
      source: args.source,
      sourceId: args.sourceId,
      timestamp: Date.now(),
    });
  },
});

/**
 * Record a technique use — increments timesUsed, resets usesToday if a
 * new in-game day, and returns the current usesToday count.
 */
export const recordTechniqueUse = mutation({
  args: {
    entityId: v.string(),
    entityType: entityTypeValidator,
    techniqueId: v.string(),
    currentDay: v.number(),
  },
  handler: async (ctx, args) => {
    const entityTechnique = await ctx.db
      .query("entityTechniques")
      .withIndex("by_entity_technique", (q) =>
        q
          .eq("entityId", args.entityId)
          .eq("entityType", args.entityType)
          .eq("techniqueId", args.techniqueId),
      )
      .first();

    if (!entityTechnique) {
      throw new Error(
        `Entity technique not found: ${args.techniqueId} for ${args.entityId}`,
      );
    }

    let { usesToday, lastDayReset } = entityTechnique;

    // Reset daily counter if new day
    if (args.currentDay !== lastDayReset) {
      usesToday = 0;
      lastDayReset = args.currentDay;
    }

    usesToday += 1;

    await ctx.db.patch(entityTechnique._id, {
      timesUsed: entityTechnique.timesUsed + 1,
      lastUsedAt: Date.now(),
      usesToday,
      lastDayReset,
    });

    return { usesToday };
  },
});
