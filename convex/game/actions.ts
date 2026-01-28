import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id, Doc } from "../_generated/dataModel";
import * as dice from "../dice";
import { validateItemGrants } from "./itemGrants";
import { findMatchingNpc } from "./npcNameResolver";

// Type definitions for the response
interface LinguisticAnalysis {
  grammar: string[];
  vocabulary: Array<{
    word: string;
    translation: string;
    partOfSpeech: string;
    usage?: string;
  }>;
  usageNotes: string[];
}

interface DMResponse {
  narration?: { en: string; fr: string };
  npcDialogue?: Array<{ name: string; en: string; fr: string }>;
  requiresRoll?: {
    needed: boolean;
    type: string;
    skill?: string;
    ability: string;
    dc: number;
    reason: string;
  };
  suggestedActions?: Array<{ en: string; fr: string; type: string }>;
  worldStateChanges?: {
    npcMood?: Record<string, string>;
    flags?: Record<string, boolean>;
    relationshipChanges?: Record<string, { affinity?: number; trust?: number; attraction?: number }>;
  };
  itemsGranted?: Array<{ itemId: string; source: string; reason: string }>;
  vocabularyHighlights?: Array<{ word: string; translation: string; note?: string }>;
  linguisticAnalysis?: LinguisticAnalysis;
}

interface RollResult {
  roll: number;
  modifier: number;
  total: number;
  naturalRoll: number;
  dc: number;
  success: boolean;
  isCritical: boolean;
  isCriticalMiss: boolean;
  skill?: string;
  ability: string;
}

interface ActionResult {
  narration?: { en: string; fr: string };
  npcDialogue?: Array<{ name: string; en: string; fr: string }>;
  roll?: RollResult | null;
  suggestedActions?: Array<{ en: string; fr: string; type: string }>;
  vocabularyHighlights?: Array<{ word: string; translation: string; note?: string }>;
  linguisticAnalysis?: LinguisticAnalysis;
  // For pending roll responses
  success?: boolean;
  requiresRoll?: boolean;
  rollInfo?: {
    type: string;
    skill?: string;
    ability: string;
    dc: number;
    reason: string;
  };
}

// Sanitize vocabulary items to only include allowed fields
// AI may return extra fields like 'fr' that the validator doesn't accept
export function sanitizeVocabulary(
  vocabulary: Array<Record<string, unknown>> | undefined
): Array<{ word: string; translation: string; note?: string }> {
  if (!vocabulary) return [];

  return vocabulary.map((item) => {
    const sanitized: { word: string; translation: string; note?: string } = {
      word: String(item.word || ""),
      translation: String(item.translation || ""),
    };
    if (item.note !== undefined) {
      sanitized.note = String(item.note);
    }
    return sanitized;
  });
}

// Sanitize linguistic analysis from AI response
export function sanitizeLinguisticAnalysis(
  analysis: LinguisticAnalysis | Record<string, unknown> | undefined
): LinguisticAnalysis | undefined {
  if (!analysis) return undefined;

  const grammar = Array.isArray(analysis.grammar)
    ? analysis.grammar.map((g) => String(g))
    : [];

  const vocabulary = Array.isArray(analysis.vocabulary)
    ? analysis.vocabulary.map((item: Record<string, unknown>) => ({
        word: String(item.word || ""),
        translation: String(item.translation || ""),
        partOfSpeech: String(item.partOfSpeech || "unknown"),
        ...(item.usage !== undefined && { usage: String(item.usage) }),
      }))
    : [];

  const usageNotes = Array.isArray(analysis.usageNotes)
    ? analysis.usageNotes.map((n) => String(n))
    : [];

  // Only return if there's actual content
  if (grammar.length === 0 && vocabulary.length === 0 && usageNotes.length === 0) {
    return undefined;
  }

  return { grammar, vocabulary, usageNotes };
}

// Helper function to execute the main action logic
async function executeAction(
  ctx: any,
  campaignId: Id<"campaigns">,
  characterId: Id<"characters">,
  input: string
): Promise<ActionResult> {
  // 1. Get current game state
  const character = await ctx.runQuery(api.characters.get, {
    characterId,
  }) as Doc<"characters"> | null;
  if (!character) throw new Error("Character not found");

  // 2. Get recent game log for context
  const recentLogs = await ctx.runQuery(api.game.log.getRecent, {
    campaignId,
    limit: 10,
  }) as Doc<"gameLog">[];

  // 3. Get session state
  const session = await ctx.runQuery(api.game.session.getCurrent, {
    campaignId,
  }) as Doc<"gameSessions"> | null;

  // 4. Get nearby NPCs
  const npcs = await ctx.runQuery(api.npcs.listByCampaign, {
    campaignId,
  }) as Doc<"npcs">[];

  // 5. Get relationships for context
  const relationships = await ctx.runQuery(api.relationships.getForCharacter, {
    characterId,
  }) as Doc<"relationships">[];

  // Build NPC context with relationships
  const npcContext = npcs.map((npc: Doc<"npcs">) => {
    const rel = relationships.find((r: Doc<"relationships">) => r.npcId === npc._id);
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
    campaignId,
    type: "action",
    contentEn: input,
    contentFr: input, // Player input stays as-is
    actorType: "character",
    actorId: characterId,
    actorName: character.name,
  });

  // 7. Call the AI DM
  const dmResponse = await ctx.runAction(api.ai.dm.processPlayerInput, {
    campaignId,
    characterId,
    input,
    llmProvider: session?.llmProvider,
    context: {
      recentHistory: recentLogs.map((log: Doc<"gameLog">) => ({
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
        equipped: Object.entries(character.equipped)
          .filter(([, v]) => v)
          .map(([slot, item]) => `${slot}: ${(item as any).name}`)
          .join(", "),
        inventoryCount: character.inventory.length,
      },
      sessionMode: session?.mode || "exploration",
    },
  }) as { response: DMResponse; usage: any };

  const response = dmResponse.response;

  // 8. Handle dice rolls if needed
  if (response.requiresRoll?.needed) {
    const roll = response.requiresRoll;

    // Log the initial narration if any (before the roll prompt)
    if (response.narration) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "narration",
        contentEn: response.narration.en,
        contentFr: response.narration.fr,
        actorType: "dm",
        annotations: {
          vocabulary: sanitizeVocabulary(response.vocabularyHighlights),
        },
        linguisticAnalysis: sanitizeLinguisticAnalysis(response.linguisticAnalysis),
      });
    }

    // Save as pending roll for user to execute interactively
    if (session) {
      await ctx.runMutation(api.game.session.setPendingRoll, {
        sessionId: session._id,
        pendingRoll: {
          type: roll.type,
          skill: roll.skill,
          ability: roll.ability,
          dc: roll.dc,
          reason: roll.reason,
          characterId,
          actionContext: input,
        },
      });
    }

    // Return early - user will click dice to roll
    return {
      success: true,
      requiresRoll: true,
      rollInfo: {
        type: roll.type,
        skill: roll.skill,
        ability: roll.ability,
        dc: roll.dc,
        reason: roll.reason,
      },
    };
  } else {
    // No roll needed - just log the narration
    if (response.narration) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "narration",
        contentEn: response.narration.en,
        contentFr: response.narration.fr,
        actorType: "dm",
        annotations: {
          vocabulary: sanitizeVocabulary(response.vocabularyHighlights),
        },
        linguisticAnalysis: sanitizeLinguisticAnalysis(response.linguisticAnalysis),
      });
    }
  }

  // 9. Auto-create NPCs mentioned in dialogue and log dialogue
  if (response.npcDialogue) {
    // Extract unique NPC names from dialogue
    const npcNames = [...new Set(response.npcDialogue.map((d) => d.name))];

    // Auto-create NPCs and relationships for any newly mentioned characters
    for (const npcName of npcNames) {
      // Check if NPC already exists using fuzzy name matching
      const matchId = findMatchingNpc(npcName, npcs);
      const existingNpc = matchId ? npcs.find((n: Doc<"npcs">) => n._id === matchId) : null;

      if (!existingNpc) {
        // Auto-create the NPC
        const newNpcId = await ctx.runMutation(api.game.npcs.getOrCreate, {
          campaignId,
          name: npcName,
        });

        // Auto-create a relationship with the player character
        await ctx.runMutation(api.relationships.create, {
          campaignId,
          characterId,
          npcId: newNpcId,
          initialAffinity: 0,
          initialTrust: 10, // Small initial trust from meeting
          initialAttraction: 0,
        });
      } else {
        // NPC exists, check if relationship exists
        const hasRelationship = relationships.some(
          (r: Doc<"relationships">) => r.npcId === existingNpc._id
        );
        if (!hasRelationship) {
          // Create relationship if it doesn't exist
          await ctx.runMutation(api.relationships.create, {
            campaignId,
            characterId,
            npcId: existingNpc._id,
            initialAffinity: 0,
            initialTrust: 10,
            initialAttraction: 0,
          });
        }
      }
    }

    // Log the dialogue (attach linguistic analysis to each for French learning)
    for (const dialogue of response.npcDialogue) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "dialogue",
        contentEn: dialogue.en,
        contentFr: dialogue.fr,
        actorType: "npc",
        actorName: dialogue.name,
        annotations: {
          vocabulary: sanitizeVocabulary(response.vocabularyHighlights),
        },
        linguisticAnalysis: sanitizeLinguisticAnalysis(response.linguisticAnalysis),
      });
    }
  }

  // 10. Apply world state changes
  if (response.worldStateChanges?.relationshipChanges) {
    for (const [npcName, changes] of Object.entries(response.worldStateChanges.relationshipChanges)) {
      const npcMatchId = findMatchingNpc(npcName, npcs);
      const npc = npcMatchId ? npcs.find((n: Doc<"npcs">) => n._id === npcMatchId) : null;
      if (npc) {
        const rel = relationships.find((r: Doc<"relationships">) => r.npcId === npc._id);
        if (rel) {
          await ctx.runMutation(api.relationships.update, {
            relationshipId: rel._id,
            affinity: rel.affinity + (changes.affinity || 0),
            trust: rel.trust + (changes.trust || 0),
            attraction: rel.attraction + (changes.attraction || 0),
          });
        }
      }
    }
  }

  // 11. Process item grants from DM (validated)
  if (response.itemsGranted) {
    const { valid, warnings } = validateItemGrants(response.itemsGranted, {
      characterLevel: character.level,
      maxPerResponse: 3,
    });

    for (const w of warnings) {
      console.warn("[ItemGrant]", w);
    }

    for (const grant of valid) {
      try {
        await ctx.runMutation(api.equipment.addItemToInventory, {
          characterId,
          itemId: grant.itemId,
        });
        await ctx.runMutation(api.game.log.add, {
          campaignId,
          type: "system",
          contentEn: `Received item: ${grant.itemName} (${grant.reason})`,
          contentFr: `Objet reçu : ${grant.itemName} (${grant.reason})`,
        });
      } catch (e) {
        console.warn("[ItemGrant] Failed to add item:", grant.itemId, e);
      }
    }
  }

  // 12. Update session timestamp and suggested actions
  if (session) {
    await ctx.runMutation(api.game.session.updateLastAction, {
      sessionId: session._id,
      suggestedActions: response.suggestedActions,
    });
  }

  return {
    narration: response.narration,
    npcDialogue: response.npcDialogue,
    roll: null,
    suggestedActions: response.suggestedActions,
    vocabularyHighlights: sanitizeVocabulary(response.vocabularyHighlights),
    linguisticAnalysis: sanitizeLinguisticAnalysis(response.linguisticAnalysis),
  };
}

// Submit a player action (the main game loop entry point)
export const submitAction = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    input: v.string(),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    return executeAction(ctx, args.campaignId, args.characterId, args.input);
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
  handler: async (ctx, args): Promise<ActionResult> => {
    // Quick actions are handled the same as free text, using the English version
    return executeAction(ctx, args.campaignId, args.characterId, args.actionText.en);
  },
});

// Execute a pending roll (user clicked the dice)
export const executeRoll = action({
  args: {
    campaignId: v.id("campaigns"),
    sessionId: v.id("gameSessions"),
    characterId: v.id("characters"),
    // The actual d20 roll result (1-20) - passed from frontend animation
    naturalRoll: v.number(),
  },
  handler: async (ctx, args) => {
    const { campaignId, sessionId, characterId, naturalRoll } = args;

    // Get session with pending roll
    const session = await ctx.runQuery(api.game.session.getCurrent, { campaignId });
    if (!session || !session.pendingRoll) {
      throw new Error("No pending roll found");
    }

    const roll = session.pendingRoll;

    // Get character for modifiers
    const character = await ctx.runQuery(api.characters.get, { characterId });
    if (!character) {
      throw new Error("Character not found");
    }

    // Calculate modifiers
    const ability = roll.ability as keyof typeof character.abilities;
    const abilityScore = character.abilities[ability] || 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);

    const skillProficiency = roll.skill ? (character.skills[roll.skill] || 0) : 0;
    const isProficient = skillProficiency >= 1;
    const hasExpertise = skillProficiency >= 2;

    let modifier = abilityMod;
    if (isProficient) modifier += character.proficiencyBonus;
    if (hasExpertise) modifier += character.proficiencyBonus; // Expertise doubles prof bonus

    const total = naturalRoll + modifier;
    const success = total >= roll.dc;
    const isCritical = naturalRoll === 20;
    const isCriticalMiss = naturalRoll === 1;
    const finalSuccess = isCritical || (!isCriticalMiss && success);

    // Log the roll
    await ctx.runMutation(api.game.log.add, {
      campaignId,
      type: "roll",
      contentEn: `${character.name} rolls ${roll.skill || roll.ability}: ${naturalRoll} + ${modifier} = ${total} vs DC ${roll.dc} - ${finalSuccess ? "SUCCESS" : "FAILURE"}${isCritical ? " (CRITICAL!)" : ""}${isCriticalMiss ? " (CRITICAL MISS!)" : ""}`,
      contentFr: `${character.name} lance ${roll.skill || roll.ability}: ${naturalRoll} + ${modifier} = ${total} contre DD ${roll.dc} - ${finalSuccess ? "SUCCÈS" : "ÉCHEC"}${isCritical ? " (CRITIQUE!)" : ""}${isCriticalMiss ? " (ÉCHEC CRITIQUE!)" : ""}`,
      actorType: "character",
      actorId: characterId,
      actorName: character.name,
      roll: {
        type: roll.type,
        dice: `1d20+${modifier}`,
        result: total,
        dc: roll.dc,
        success: finalSuccess,
      },
    });

    // Get narrative for the roll outcome
    const rollNarration = await ctx.runAction(api.ai.dm.narrateRollOutcome, {
      rollType: roll.type,
      skill: roll.skill ?? undefined,
      rollResult: naturalRoll,
      modifier,
      total,
      dc: roll.dc,
      success: finalSuccess,
      isCritical,
      isCriticalMiss,
      actionAttempted: roll.actionContext,
      context: roll.reason,
      llmProvider: session.llmProvider,
    }) as { response: any; usage: any };

    // Log the narrated outcome
    await ctx.runMutation(api.game.log.add, {
      campaignId,
      type: "narration",
      contentEn: rollNarration.response.narration?.en || "",
      contentFr: rollNarration.response.narration?.fr || "",
      actorType: "dm",
      annotations: {
        vocabulary: sanitizeVocabulary(rollNarration.response.vocabularyHighlights),
      },
      linguisticAnalysis: sanitizeLinguisticAnalysis(rollNarration.response.linguisticAnalysis),
    });

    // Clear the pending roll
    await ctx.runMutation(api.game.session.clearPendingRoll, { sessionId });

    // Update suggested actions
    if (rollNarration.response.followUpOptions) {
      await ctx.runMutation(api.game.session.updateLastAction, {
        sessionId,
        suggestedActions: rollNarration.response.followUpOptions,
      });
    }

    return {
      success: true,
      rollResult: {
        naturalRoll,
        modifier,
        total,
        dc: roll.dc,
        success: finalSuccess,
        isCritical,
        isCriticalMiss,
      },
    };
  },
});
