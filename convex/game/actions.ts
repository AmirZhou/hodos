import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import * as dice from "../dice";

// Submit a player action (the main game loop entry point)
export const submitAction = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get current game state
    const character = await ctx.runQuery(api.characters.get, {
      characterId: args.characterId,
    });
    if (!character) throw new Error("Character not found");

    // 2. Get recent game log for context
    const recentLogs = await ctx.runQuery(api.game.log.getRecent, {
      campaignId: args.campaignId,
      limit: 10,
    });

    // 3. Get session state
    const session = await ctx.runQuery(api.game.session.getCurrent, {
      campaignId: args.campaignId,
    });

    // 4. Get nearby NPCs
    const npcs = await ctx.runQuery(api.npcs.listByCampaign, {
      campaignId: args.campaignId,
    });

    // 5. Get relationships for context
    const relationships = await ctx.runQuery(api.relationships.getForCharacter, {
      characterId: args.characterId,
    });

    // Build NPC context with relationships
    const npcContext = npcs.map((npc) => {
      const rel = relationships.find((r) => r.npcId === npc._id);
      return {
        name: npc.name,
        description: npc.description,
        personality: npc.personality,
        relationshipWithPlayer: rel
          ? {
              affinity: rel.affinity,
              trust: rel.trust,
              attraction: rel.attraction,
            }
          : undefined,
      };
    });

    // 6. Log the player action
    await ctx.runMutation(api.game.log.add, {
      campaignId: args.campaignId,
      type: "action",
      contentEn: args.input,
      contentFr: args.input, // Player input stays as-is
      actorType: "character",
      actorId: args.characterId,
      actorName: character.name,
    });

    // 7. Call the AI DM
    const dmResponse = await ctx.runAction(api.ai.dm.processPlayerInput, {
      campaignId: args.campaignId,
      characterId: args.characterId,
      input: args.input,
      context: {
        recentHistory: recentLogs.map((log) => ({
          type: log.type,
          contentEn: log.contentEn,
          contentFr: log.contentFr,
          actorName: log.actorName,
        })),
        currentLocation: session?.locationId ? "Current Location" : undefined,
        nearbyNpcs: npcContext,
        characterStats: {
          name: character.name,
          level: character.level,
          hp: character.hp,
          maxHp: character.maxHp,
          abilities: character.abilities,
        },
        sessionMode: session?.mode || "exploration",
      },
    });

    const response = dmResponse.response;

    // 8. Handle dice rolls if needed
    let rollResult = null;
    if (response.requiresRoll?.needed) {
      const roll = response.requiresRoll;
      const ability = roll.ability as keyof typeof character.abilities;
      const abilityScore = character.abilities[ability] || 10;

      // Check if character is proficient in the skill
      const skillProficiency = roll.skill ? (character.skills[roll.skill] || 0) : 0;
      const isProficient = skillProficiency >= 1;
      const hasExpertise = skillProficiency >= 2;

      const checkResult = dice.makeAbilityCheck(
        abilityScore,
        character.proficiencyBonus,
        isProficient,
        hasExpertise
      );

      const success = checkResult.total >= roll.dc;
      const isCritical = checkResult.naturalRoll === 20;
      const isCriticalMiss = checkResult.naturalRoll === 1;

      rollResult = {
        ...checkResult,
        dc: roll.dc,
        success: isCritical || (!isCriticalMiss && success),
        isCritical,
        isCriticalMiss,
        skill: roll.skill,
        ability: roll.ability,
      };

      // Log the roll
      await ctx.runMutation(api.game.log.add, {
        campaignId: args.campaignId,
        type: "roll",
        contentEn: `${character.name} rolls ${roll.skill || roll.ability}: ${checkResult.naturalRoll} + ${checkResult.modifier} = ${checkResult.total} vs DC ${roll.dc} - ${rollResult.success ? "SUCCESS" : "FAILURE"}${isCritical ? " (CRITICAL!)" : ""}${isCriticalMiss ? " (CRITICAL MISS!)" : ""}`,
        contentFr: `${character.name} lance ${roll.skill || roll.ability}: ${checkResult.naturalRoll} + ${checkResult.modifier} = ${checkResult.total} contre DD ${roll.dc} - ${rollResult.success ? "SUCCÈS" : "ÉCHEC"}${isCritical ? " (CRITIQUE!)" : ""}${isCriticalMiss ? " (ÉCHEC CRITIQUE!)" : ""}`,
        actorType: "character",
        actorId: args.characterId,
        actorName: character.name,
        roll: {
          type: roll.type,
          dice: `1d20+${checkResult.modifier}`,
          result: checkResult.total,
          dc: roll.dc,
          success: rollResult.success,
        },
      });

      // Get narrative for the roll outcome
      const rollNarration = await ctx.runAction(api.ai.dm.narrateRollOutcome, {
        rollType: roll.type,
        skill: roll.skill,
        rollResult: checkResult.naturalRoll,
        modifier: checkResult.modifier,
        total: checkResult.total,
        dc: roll.dc,
        success: rollResult.success,
        isCritical,
        isCriticalMiss,
        actionAttempted: args.input,
        context: response.narration?.en || "",
      });

      // Log the narrated outcome
      await ctx.runMutation(api.game.log.add, {
        campaignId: args.campaignId,
        type: "narration",
        contentEn: rollNarration.response.narration?.en || "",
        contentFr: rollNarration.response.narration?.fr || "",
        actorType: "dm",
        annotations: {
          vocabulary: rollNarration.response.vocabularyHighlights || [],
        },
      });

      // Update suggested actions based on roll outcome
      response.suggestedActions = rollNarration.response.followUpOptions || response.suggestedActions;
    } else {
      // No roll needed - just log the narration
      if (response.narration) {
        await ctx.runMutation(api.game.log.add, {
          campaignId: args.campaignId,
          type: "narration",
          contentEn: response.narration.en,
          contentFr: response.narration.fr,
          actorType: "dm",
          annotations: {
            vocabulary: response.vocabularyHighlights || [],
          },
        });
      }
    }

    // 9. Log NPC dialogue if any
    if (response.npcDialogue) {
      for (const dialogue of response.npcDialogue) {
        await ctx.runMutation(api.game.log.add, {
          campaignId: args.campaignId,
          type: "dialogue",
          contentEn: dialogue.en,
          contentFr: dialogue.fr,
          actorType: "npc",
          actorName: dialogue.name,
        });
      }
    }

    // 10. Apply world state changes
    if (response.worldStateChanges?.relationshipChanges) {
      for (const [npcName, changes] of Object.entries(response.worldStateChanges.relationshipChanges)) {
        const npc = npcs.find((n) => n.name === npcName);
        if (npc) {
          const rel = relationships.find((r) => r.npcId === npc._id);
          if (rel) {
            const typedChanges = changes as { affinity?: number; trust?: number; attraction?: number };
            await ctx.runMutation(api.relationships.update, {
              relationshipId: rel._id,
              affinity: rel.affinity + (typedChanges.affinity || 0),
              trust: rel.trust + (typedChanges.trust || 0),
              attraction: rel.attraction + (typedChanges.attraction || 0),
            });
          }
        }
      }
    }

    // 11. Update session timestamp
    if (session) {
      await ctx.runMutation(api.game.session.updateLastAction, {
        sessionId: session._id,
      });
    }

    return {
      narration: response.narration,
      npcDialogue: response.npcDialogue,
      roll: rollResult,
      suggestedActions: response.suggestedActions,
      vocabularyHighlights: response.vocabularyHighlights,
    };
  },
});

// Quick action - pre-defined choices
export const submitQuickAction = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    actionType: v.string(),
    actionText: v.object({
      en: v.string(),
      fr: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Quick actions are handled the same as free text, using the English version
    return ctx.runAction(api.game.actions.submitAction, {
      campaignId: args.campaignId,
      characterId: args.characterId,
      input: args.actionText.en,
    });
  },
});
