import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { RIVERMOOT_NPCS } from "../data/rivermootNpcs";
import { RIVERMOOT_NPC_SKILLS } from "../data/rivermootNpcSkills";
import { XP_THRESHOLDS } from "../data/skillCatalog";
import { getTechniqueById } from "../data/techniqueCatalog";

/**
 * Idempotent helper: ensures the 18 Rivermoot campaign NPCs exist.
 * Checks for any NPC with a matching templateId — if found, assumes
 * all NPCs were already seeded and returns early.
 */
export async function ensureRivermootNpcs(
  ctx: MutationCtx,
  campaignId: Id<"campaigns">,
  mapId: Id<"maps">,
): Promise<void> {
  // 1. Idempotency check — see if any Rivermoot template NPC already exists
  const existingNpcs = await ctx.db
    .query("npcs")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();

  const hasSeeded = existingNpcs.some(
    (npc) => npc.templateId && npc.templateId.startsWith("rivermoot-npc-"),
  );

  if (hasSeeded) return;

  // 2. Build location lookup: templateId -> real location Id
  const locations = await ctx.db
    .query("locations")
    .withIndex("by_map", (q) => q.eq("mapId", mapId))
    .collect();

  const locationByTemplate = new Map<string, Id<"locations">>();
  for (const loc of locations) {
    if (loc.templateId) {
      locationByTemplate.set(loc.templateId, loc._id);
    }
  }

  // 3. Insert all 18 NPCs
  for (const template of RIVERMOOT_NPCS) {
    const currentLocationId = locationByTemplate.get(template.locationTemplateId);

    await ctx.db.insert("npcs", {
      campaignId,
      templateId: template.templateId,
      name: template.name,
      pronouns: template.pronouns,
      description: template.description,
      personality: template.personality,
      level: template.level,
      hp: template.hp,
      maxHp: template.maxHp,
      ac: template.ac,
      abilities: template.abilities,
      adultStats: template.adultStats,
      kinkPreferences: template.kinkPreferences,
      hardLimits: template.hardLimits,
      desires: template.desires,
      currentLocationId,
      isAlive: true,
      conditions: [],
      memories: [],
      // autoCreated is NOT set — these are campaign-defined NPCs
      // firstMetAt is NOT set — they exist but haven't been "met" yet
    });
  }
}
