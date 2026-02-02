import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id, Doc } from "../_generated/dataModel";
import { validateItemGrants } from "./itemGrants";
import { findMatchingNpc } from "./npcNameResolver";
import { validateStringLength, clampAffinity, clampPercentage } from "../lib/validation";
import { getTechniqueById } from "../data/techniqueCatalog";
import { getSkillById } from "../data/skillCatalog";

// Type definitions for the response
interface DMResponse {
  narration?: string;
  npcDialogue?: Array<{ name: string; text: string }>;
  requiresRoll?: {
    needed: boolean;
    type: string;
    skill?: string;
    ability: string;
    dc: number;
    reason: string;
    stakes?: string;
  };
  suggestedActions?: Array<{ text: string; type: string }>;
  worldStateChanges?: {
    npcMood?: Record<string, string>;
    flags?: Record<string, boolean>;
    relationshipChanges?: Record<string, { affinity?: number; trust?: number; attraction?: number }>;
  };
  suggestTechnique?: string; // technique_id if DM thinks freeform action matches a known technique
  itemsGranted?: Array<{ itemId: string; source: string; reason: string }>;
  containersCreated?: Array<{
    containerType: "ground" | "chest" | "corpse" | "container";
    name: string;
    description?: string;
    itemIds: string[];
  }>;
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
  narration?: string;
  npcDialogue?: Array<{ name: string; text: string }>;
  roll?: RollResult | null;
  suggestedActions?: Array<{ text: string; type: string }>;
  suggestTechnique?: string;
  // For pending roll responses
  success?: boolean;
  requiresRoll?: boolean;
  rollInfo?: {
    type: string;
    skill?: string;
    ability: string;
    dc: number;
    reason: string;
    stakes?: string;
  };
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

  // 1b. Rate limit check
  await ctx.runMutation(internal.game.rateLimitCheck.check, {
    userId: character.userId,
    action: "game_action",
  });

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

  // Build NPC context filtered by location and relationship
  const buildNpcEntry = (npc: Doc<"npcs">, location: "here" | "elsewhere") => {
    const rel = relationships.find((r: Doc<"relationships">) => r.npcId === npc._id);
    return {
      name: npc.name,
      description: npc.description,
      personality: npc.personality,
      location,
      relationshipWithPlayer: rel
        ? {
            affinity: rel.affinity,
            trust: rel.trust,
            attraction: rel.attraction,
          }
        : undefined,
    };
  };

  // NPCs physically at the current location (can be introduced)
  const npcsAtLocation = npcs
    .filter((npc: Doc<"npcs">) =>
      npc.isAlive && session?.locationId && npc.currentLocationId === session.locationId
    )
    .map((npc: Doc<"npcs">) => buildNpcEntry(npc, "here"));

  // Known NPCs elsewhere (have a relationship but not at this location)
  const knownNpcsElsewhere = npcs
    .filter((npc: Doc<"npcs">) => {
      if (!npc.isAlive) return false;
      if (session?.locationId && npc.currentLocationId === session.locationId) return false;
      return relationships.some((r: Doc<"relationships">) => r.npcId === npc._id);
    })
    .map((npc: Doc<"npcs">) => buildNpcEntry(npc, "elsewhere"));

  const npcContext = [...npcsAtLocation, ...knownNpcsElsewhere];

  // 5b. Get equipped items and inventory count for DM context
  const equippedSlotMap = await ctx.runQuery(api.equipment.getEquipment, {
    characterId,
  }) as Record<string, any>;
  const inventoryItems = await ctx.runQuery(api.equipment.getInventory, {
    characterId,
  }) as any[];

  // 5c. Get loot containers at current location for DM context
  let lootContainersContext: string | undefined;
  if (session?.locationId) {
    const containers = await ctx.runQuery(api.game.loot.getContainersForDMContext, {
      campaignId,
      locationId: session.locationId,
    }) as Array<{ name: string; containerType: string; isLocked: boolean; isOpened: boolean; isLooted: boolean; itemCount: number }>;

    if (containers.length > 0) {
      lootContainersContext = containers
        .map((c) => {
          const status = c.isLooted
            ? "looted"
            : c.isLocked
              ? "locked"
              : c.isOpened
                ? `open, ${c.itemCount} items`
                : `closed, ${c.itemCount} items`;
          return `- ${c.name} (${c.containerType}): ${status}`;
        })
        .join("\n");
    }
  }

  // 5d. Get character's learned techniques for DM context
  const entityTechniques = await ctx.runQuery(api.skills.getEntityTechniques, {
    entityId: characterId as string,
    entityType: "character",
    campaignId,
  }) as Array<{ techniqueId: string; skillId: string }>;

  // Build technique context for DM
  const techniqueContext = entityTechniques.map((et) => {
    const tech = getTechniqueById(et.techniqueId);
    const skill = getSkillById(tech?.skillId ?? "");
    return {
      name: tech?.name ?? et.techniqueId,
      skillName: skill?.name ?? "",
      tier: tech?.tierRequired ?? 0,
    };
  });

  // 6. Log the player action
  await ctx.runMutation(api.game.log.add, {
    campaignId,
    type: "action",
    content: input,
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
        content: log.content,
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
        equipped: Object.entries(equippedSlotMap)
          .filter(([, item]) => item)
          .map(([slot, item]) => `${slot}: ${(item as any).name}`)
          .join(", "),
        inventoryCount: inventoryItems.length,
      },
      sessionMode: session?.mode || "exploration",
      lootContainers: lootContainersContext,
      characterTechniques: techniqueContext,
    },
  }) as { response: DMResponse; usage: any };

  const response = dmResponse.response;

  // Debug: log the requiresRoll response
  console.log("[DM Response] requiresRoll:", JSON.stringify(response.requiresRoll));

  // === AI Output Validation ===
  // Validate narration length (max 5000 chars)
  if (response.narration && response.narration.length > 5000) {
    response.narration = response.narration.slice(0, 5000);
    console.warn("[Validation] Narration truncated to 5000 chars");
  }

  // Validate NPC creation rate (max 2 new NPCs per response)
  if (response.npcDialogue) {
    const existingNames = new Set(npcs.map((n: Doc<"npcs">) => n.name.toLowerCase()));
    const newNpcNames = [...new Set(response.npcDialogue.map((d) => d.name))]
      .filter((name) => !findMatchingNpc(name, npcs));
    if (newNpcNames.length > 2) {
      console.warn(`[Validation] AI tried to create ${newNpcNames.length} NPCs, limiting to 2`);
      // Keep only dialogue from existing NPCs + first 2 new ones
      const allowedNewNames = new Set(newNpcNames.slice(0, 2));
      response.npcDialogue = response.npcDialogue.filter((d) => {
        const isExisting = existingNames.has(d.name.toLowerCase()) || !!findMatchingNpc(d.name, npcs);
        return isExisting || allowedNewNames.has(d.name);
      });
    }
  }

  // Validate relationship changes are within valid ranges
  if (response.worldStateChanges?.relationshipChanges) {
    for (const [npcName, changes] of Object.entries(response.worldStateChanges.relationshipChanges)) {
      if (changes.affinity !== undefined) {
        changes.affinity = Math.max(-20, Math.min(20, changes.affinity));
      }
      if (changes.trust !== undefined) {
        changes.trust = Math.max(-20, Math.min(20, changes.trust));
      }
      if (changes.attraction !== undefined) {
        changes.attraction = Math.max(-20, Math.min(20, changes.attraction));
      }
    }
  }

  // 8. Handle dice rolls if needed
  if (response.requiresRoll?.needed) {
    const roll = response.requiresRoll;

    // Log the initial narration if any (before the roll prompt)
    if (response.narration) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "narration",
        content: response.narration,
        actorType: "dm",
      });
    }

    // Save as pending roll for user to execute interactively
    if (session) {
      await ctx.runMutation(api.game.session.setPendingRoll, {
        sessionId: session._id,
        pendingRoll: {
          type: roll.type,
          skill: roll.skill ?? undefined,
          ability: roll.ability,
          dc: roll.dc,
          reason: roll.reason,
          stakes: roll.stakes ?? undefined,
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
        stakes: roll.stakes,
      },
    };
  } else {
    // No roll needed - just log the narration
    if (response.narration) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "narration",
        content: response.narration,
        actorType: "dm",
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

    // Log the dialogue
    for (const dialogue of response.npcDialogue) {
      await ctx.runMutation(api.game.log.add, {
        campaignId,
        type: "dialogue",
        content: dialogue.text,
        actorType: "npc",
        actorName: dialogue.name,
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
          content: `Received item: ${grant.itemName} (${grant.reason})`,
        });
      } catch (e) {
        console.warn("[ItemGrant] Failed to add item:", grant.itemId, e);
      }
    }
  }

  // 12. Process container creation from DM
  if (response.containersCreated && session?.locationId) {
    for (const containerSpec of response.containersCreated) {
      try {
        await ctx.runMutation(api.game.loot.seedContainer, {
          campaignId,
          locationId: session.locationId,
          containerType: containerSpec.containerType,
          name: containerSpec.name,
          description: containerSpec.description,
          itemIds: containerSpec.itemIds,
          sourceType: "dm",
        });
        await ctx.runMutation(api.game.log.add, {
          campaignId,
          type: "system",
          content: `A ${containerSpec.containerType === "ground" ? "pile of items" : containerSpec.name} appeared.`,
        });
      } catch (e) {
        console.warn("[ContainerCreation] Failed:", containerSpec.name, e);
      }
    }
  }

  // 13. Update session timestamp and suggested actions
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
    suggestTechnique: response.suggestTechnique,
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
    actionText: v.string(),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    return executeAction(ctx, args.campaignId, args.characterId, args.actionText);
  },
});

interface ExecuteRollResult {
  success: boolean;
  rollResult: {
    naturalRoll: number;
    modifier: number;
    total: number;
    dc: number;
    success: boolean;
    isCritical: boolean;
    isCriticalMiss: boolean;
  };
}

// Execute a pending roll (user clicked the dice)
export const executeRoll = action({
  args: {
    campaignId: v.id("campaigns"),
    sessionId: v.id("gameSessions"),
    characterId: v.id("characters"),
    // The actual d20 roll result (1-20) - passed from frontend animation
    naturalRoll: v.number(),
  },
  handler: async (ctx, args): Promise<ExecuteRollResult> => {
    const { campaignId, sessionId, characterId, naturalRoll } = args;

    // Get session with pending roll
    const session = await ctx.runQuery(api.game.session.getCurrent, { campaignId }) as Doc<"gameSessions"> | null;
    if (!session || !session.pendingRoll) {
      throw new Error("No pending roll found");
    }

    const roll = session.pendingRoll as {
      type: string;
      skill?: string;
      ability: string;
      dc: number;
      reason: string;
      characterId: Id<"characters">;
      actionContext: string;
    };

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
      content: `${character.name} rolls ${roll.skill || roll.ability}: ${naturalRoll} + ${modifier} = ${total} vs DC ${roll.dc} - ${finalSuccess ? "SUCCESS" : "FAILURE"}${isCritical ? " (CRITICAL!)" : ""}${isCriticalMiss ? " (CRITICAL MISS!)" : ""}`,
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
      content: rollNarration.response.narration || "",
      actorType: "dm",
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
