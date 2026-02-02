/**
 * Technique Activation Action — the core gameplay action where a player
 * clicks a technique and the system resolves it deterministically, logs
 * the activation, awards XP, then returns a summary for AI DM narration.
 */

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { getTechniqueById } from "../data/techniqueCatalog";
import type { TechniqueContext } from "../data/techniqueCatalog";
import { getSkillById } from "../data/skillCatalog";
import type { Ability } from "../data/skillCatalog";
import {
  calculateActorPower,
  calculateTargetResistance,
  determinePotency,
  calculateEffects,
  calculateXpAward,
} from "../lib/techniqueResolution";
import type { Potency } from "../lib/techniqueResolution";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivationSummaryInput {
  actorName: string;
  techniqueName: string;
  skillName: string;
  actorTier: number;
  targetName?: string;
  potency: string;
  effectsApplied: Record<string, unknown>;
  context: string;
}

// ---------------------------------------------------------------------------
// Pure helper (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Build a markdown summary of a technique activation for the AI DM to
 * narrate.  The DM should embellish the result but must not contradict
 * the mechanical effects listed here.
 */
export function buildActivationSummary(input: ActivationSummaryInput): string {
  const {
    actorName,
    techniqueName,
    skillName,
    actorTier,
    targetName,
    potency,
    effectsApplied,
    context,
  } = input;

  const effectEntries = Object.entries(effectsApplied);
  const effectsStr =
    effectEntries.length > 0
      ? effectEntries.map(([k, v]) => `${k}: ${v}`).join(", ")
      : "none";

  const lines = [
    `## Technique Activated`,
    `- Actor: ${actorName} used "${techniqueName}" (${skillName}, Tier ${actorTier})`,
    `- Target: ${targetName ?? "none"}`,
    `- Potency: ${potency}`,
    `- Effects applied: ${effectsStr}`,
    `- Context: ${context}`,
    ``,
    `Narrate the outcome. Do NOT contradict the mechanical effects.`,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Internal mutation — log to techniqueActivations table
// ---------------------------------------------------------------------------

export const logActivation = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    actorId: v.string(),
    actorType: v.union(v.literal("character"), v.literal("npc")),
    targetId: v.optional(v.string()),
    targetType: v.optional(
      v.union(v.literal("character"), v.literal("npc")),
    ),
    techniqueId: v.string(),
    skillId: v.string(),
    context: v.union(
      v.literal("combat"),
      v.literal("scene"),
      v.literal("social"),
      v.literal("exploration"),
    ),
    actorPower: v.number(),
    targetResistance: v.number(),
    potency: v.string(),
    effectsApplied: v.any(),
    xpAwarded: v.number(),
    bonusXp: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("techniqueActivations", args);
  },
});

// ---------------------------------------------------------------------------
// Action — activateTechnique
// ---------------------------------------------------------------------------

export const activateTechnique = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    techniqueId: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(
      v.union(v.literal("character"), v.literal("npc")),
    ),
    context: v.union(
      v.literal("combat"),
      v.literal("scene"),
      v.literal("social"),
      v.literal("exploration"),
    ),
  },
  handler: async (ctx, args) => {
    const { campaignId, characterId, techniqueId, targetId, targetType, context } = args;

    // 1. Validate technique exists and supports the requested context
    const technique = getTechniqueById(techniqueId);
    if (!technique) {
      throw new Error(`Unknown technique: ${techniqueId}`);
    }
    if (!technique.contexts.includes(context as TechniqueContext)) {
      throw new Error(
        `Technique "${technique.name}" does not support context "${context}". ` +
          `Supported: ${technique.contexts.join(", ")}`,
      );
    }

    // 2. Get skill definition
    const skill = getSkillById(technique.skillId);
    if (!skill) {
      throw new Error(`Unknown skill: ${technique.skillId}`);
    }

    // 3. Get the character's data (abilities)
    const character = (await ctx.runQuery(api.characters.get, {
      characterId,
    })) as Doc<"characters"> | null;
    if (!character) {
      throw new Error("Character not found");
    }

    // 4. Get the character's entity skill for this technique's skill
    const entitySkills = (await ctx.runQuery(api.skills.getEntitySkills, {
      entityId: characterId,
      entityType: "character",
      campaignId,
    })) as Array<{
      skillId: string;
      currentTier: number;
      ceiling: number;
      practiceXp: number;
    }>;

    const entitySkill = entitySkills.find(
      (es) => es.skillId === technique.skillId,
    );
    if (!entitySkill) {
      throw new Error(
        `Character does not have skill "${skill.name}" initialized`,
      );
    }

    // 5. Verify the technique is learned by the character
    const entityTechniques = (await ctx.runQuery(
      api.skills.getEntityTechniques,
      {
        entityId: characterId,
        entityType: "character",
        campaignId,
      },
    )) as Array<{
      techniqueId: string;
      skillId: string;
      timesUsed: number;
      usesToday: number;
      lastDayReset: number;
    }>;

    const entityTechnique = entityTechniques.find(
      (et) => et.techniqueId === techniqueId,
    );
    if (!entityTechnique) {
      throw new Error(
        `Character has not learned technique "${technique.name}"`,
      );
    }

    // 5b. Enforce cooldown — if the technique has a daily use limit,
    // check whether the character has already hit it today
    if (technique.cooldown > 0) {
      const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
      const usesToday =
        entityTechnique.lastDayReset === currentDay
          ? entityTechnique.usesToday
          : 0;
      if (usesToday >= technique.cooldown) {
        throw new Error(
          `Technique "${technique.name}" is on cooldown (${usesToday}/${technique.cooldown} uses today)`,
        );
      }
    }

    // 6. Calculate actor power
    const abilityScore =
      character.abilities[skill.baseAbility as Ability] ?? 10;
    const actorPower = calculateActorPower(
      entitySkill.currentTier,
      abilityScore,
      technique.rollBonus,
    );

    // 7. If there's a target, calculate target resistance
    let targetResistance = 0;
    let targetName: string | undefined;

    if (targetId && targetType) {
      if (targetType === "character") {
        const targetChar = (await ctx.runQuery(api.characters.get, {
          characterId: targetId as Doc<"characters">["_id"],
        })) as Doc<"characters"> | null;
        if (!targetChar) {
          throw new Error("Target character not found");
        }
        targetName = targetChar.name;

        // Get target's counter skill tier
        const targetSkills = (await ctx.runQuery(
          api.skills.getEntitySkills,
          {
            entityId: targetId,
            entityType: "character",
            campaignId,
          },
        )) as Array<{ skillId: string; currentTier: number }>;

        // Find counter skill (any skill with matching counterAbility)
        const counterAbilityScore =
          targetChar.abilities[skill.counterAbility as Ability] ?? 10;
        const counterSkill = targetSkills.find(
          (ts) => ts.skillId === technique.skillId,
        );
        const counterTier = counterSkill?.currentTier ?? 0;

        targetResistance = calculateTargetResistance(
          counterTier,
          counterAbilityScore,
        );
      } else {
        // targetType === "npc"
        const targetNpc = (await ctx.runQuery(api.npcs.get, {
          npcId: targetId as Doc<"npcs">["_id"],
        })) as Doc<"npcs"> | null;
        if (!targetNpc) {
          throw new Error("Target NPC not found");
        }
        targetName = targetNpc.name;

        // Get NPC's counter skill tier
        const npcSkills = (await ctx.runQuery(api.skills.getEntitySkills, {
          entityId: targetId,
          entityType: "npc",
          campaignId,
        })) as Array<{ skillId: string; currentTier: number }>;

        const counterAbilityScore =
          targetNpc.abilities[skill.counterAbility as Ability] ?? 10;
        const counterSkill = npcSkills.find(
          (ns) => ns.skillId === technique.skillId,
        );
        const counterTier = counterSkill?.currentTier ?? 0;

        targetResistance = calculateTargetResistance(
          counterTier,
          counterAbilityScore,
        );
      }
    }

    // 8. Determine potency and calculate scaled effects
    const potency = determinePotency(actorPower, targetResistance);
    const effectsApplied = calculateEffects(
      technique.effects,
      context as TechniqueContext,
      potency,
    );

    // 9. Record the technique use (for daily cap tracking)
    // Use current day as a simple integer (days since epoch)
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const useResult = (await ctx.runMutation(api.skills.recordTechniqueUse, {
      entityId: characterId,
      entityType: "character",
      techniqueId,
      currentDay,
    })) as { usesToday: number };

    // 10. Calculate and award XP
    const isFirstUse = entityTechnique.timesUsed === 0;
    const targetTierHigher =
      targetResistance > 0 &&
      targetResistance > entitySkill.currentTier * 3;
    const xp = calculateXpAward({
      isFirstUse,
      targetTierHigher,
      potency: potency as Potency,
      usesToday: useResult.usesToday,
      techniqueTier: technique.tierRequired,
      actorTier: entitySkill.currentTier,
    });

    if (xp > 0) {
      await ctx.runMutation(api.skills.awardSkillXp, {
        entityId: characterId,
        entityType: "character",
        campaignId,
        skillId: technique.skillId,
        xp,
      });
    }

    // 11. Log the activation to techniqueActivations table
    const now = Date.now();
    await ctx.runMutation(
      internal.game.techniqueAction.logActivation,
      {
        campaignId,
        actorId: characterId,
        actorType: "character" as const,
        targetId,
        targetType,
        techniqueId,
        skillId: technique.skillId,
        context,
        actorPower,
        targetResistance,
        potency,
        effectsApplied,
        xpAwarded: xp,
        bonusXp: 0,
        timestamp: now,
      },
    );

    // 12. Build and return the DM summary
    const summary = buildActivationSummary({
      actorName: character.name,
      techniqueName: technique.name,
      skillName: skill.name,
      actorTier: entitySkill.currentTier,
      targetName,
      potency,
      effectsApplied: effectsApplied as Record<string, unknown>,
      context,
    });

    // 13. Get AI narration for the activation
    let narration: string | undefined;
    try {
      const narrationResult = await ctx.runAction(
        api.ai.dm.narrateTechniqueOutcome,
        { techniqueSummary: summary },
      );
      narration = narrationResult?.response?.narration;
    } catch {
      // Narration is non-critical — technique still resolved successfully
      narration = undefined;
    }

    return {
      potency,
      effectsApplied,
      xpAwarded: xp,
      summary,
      narration,
    };
  },
});
