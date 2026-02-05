import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireCampaignMember } from "../lib/auth";
import { getEffectiveStats } from "../lib/statHelpers";
import { resolveAttackAdvantage, canAct, canMove, canCast, getEffectiveSpeed, isAutoCrit, hasResistanceAll, processConditionDurations, concentrationSaveDC, getOutgoingDamageMultiplier, removeConditionsOnDamage, getAcModifier, CC_CATEGORIES, applyDiminishingReturns, getDotDamage, applyOrReplaceCondition, shouldBlockCc, spellCcBaseDuration, applyCcResistance, canUseLegendaryResistance, processRepeatedSaves } from "../lib/conditions";
import type { DrTracker } from "../lib/conditions";
import { getNpcAttackBonus, getNpcDamageDice } from "../lib/npcCombat";
import { parseDiceString } from "../lib/validation";
import { getExtraAttacks, getSneakAttackDice, getRageDamageBonus, getCcBreakFeature } from "../lib/classFeatures";
import { hasSpellSlot, getCastingAbility, getSpellSaveDC, getSpellAttackBonus, getCantripDiceCount } from "../lib/spells";
import { getSpellById } from "../data/spellData";
import { getTechniqueById } from "../data/techniqueCatalog";
import { getSkillById, XP_THRESHOLDS } from "../data/skillCatalog";
import { canTierUp } from "../skills";
import {
  calculateActorPower,
  calculateTargetResistance,
  determinePotency,
  calculateEffects,
  calculateXpAward,
  potencyToCcDuration,
  applyVulnerabilityBonus,
  calculateComboBonus,
} from "../lib/techniqueResolution";
import { logAudit } from "../lib/auditLog";
import type { ActiveCondition } from "../lib/conditions";

// Default turn timeout: 2 minutes
const DEFAULT_TURN_TIMEOUT_MS = 120000;

/** Serialize an ActiveCondition to the schema-compatible shape for DB storage. */
function serializeCondition(c: ActiveCondition): {
  name: string;
  duration?: number;
  source?: string;
  saveDC?: number;
  saveAbility?: string;
} {
  return {
    name: c.name,
    ...(c.duration !== undefined ? { duration: c.duration } : {}),
    ...(c.source ? { source: c.source } : {}),
    ...(c.saveDC !== undefined ? { saveDC: c.saveDC } : {}),
    ...(c.saveAbility ? { saveAbility: c.saveAbility } : {}),
  };
}

/**
 * When concentration breaks, remove conditions applied by that spell from all targets.
 * The caller is still responsible for clearing `concentration` on the caster (via patch).
 */
async function removeConcentrationConditions(
  ctx: { db: { get: (id: any) => Promise<any>; patch: (id: any, patch: any) => Promise<void> } },
  concentration: { spellId: string; targetId?: string },
  casterId: string,
  combatants: Array<{ entityId: string; entityType: string }>,
) {
  const { spellId, targetId } = concentration;

  async function removeFromEntity(entityId: string, entityType: string) {
    if (entityType === "character") {
      const entity = await ctx.db.get(entityId as Id<"characters">);
      if (entity) {
        const filtered = entity.conditions.filter((c: { source?: string }) => c.source !== spellId);
        if (filtered.length !== entity.conditions.length) {
          await ctx.db.patch(entityId as Id<"characters">, { conditions: filtered });
        }
      }
    } else {
      const entity = await ctx.db.get(entityId as Id<"npcs">);
      if (entity) {
        const filtered = entity.conditions.filter((c: { source?: string }) => c.source !== spellId);
        if (filtered.length !== entity.conditions.length) {
          await ctx.db.patch(entityId as Id<"npcs">, { conditions: filtered });
        }
      }
    }
  }

  if (targetId) {
    // Single-target spell: remove from specific target
    const target = combatants.find(c => c.entityId === targetId);
    if (target) {
      await removeFromEntity(targetId, target.entityType);
    }
  } else {
    // AoE/self spell: scan all combatants except caster
    for (const c of combatants) {
      if (c.entityId === casterId) continue;
      await removeFromEntity(c.entityId, c.entityType);
    }
  }
}

/**
 * Check NPC concentration save after taking damage. If the save fails,
 * removes conditions from targets and clears concentration on the NPC.
 */
async function checkNpcConcentration(
  ctx: { db: { get: (id: any) => Promise<any>; patch: (id: any, patch: any) => Promise<void> } },
  npc: { concentration?: { spellId: string; targetId?: string }; abilities: { constitution: number }; level: number },
  npcEntityId: string,
  damage: number,
  combatants: Array<{ entityId: string; entityType: string }>,
) {
  if (!npc.concentration || damage <= 0) return;
  const dc = concentrationSaveDC(damage);
  const conMod = Math.floor((npc.abilities.constitution - 10) / 2);
  const profBonus = Math.max(2, Math.floor((npc.level - 1) / 4) + 2);
  const roll = Math.floor(Math.random() * 20) + 1 + conMod + profBonus;
  if (roll < dc) {
    await removeConcentrationConditions(ctx, npc.concentration, npcEntityId, combatants);
    await ctx.db.patch(npcEntityId as Id<"npcs">, { concentration: undefined });
  }
}

/**
 * Check if any ally is adjacent (within 5ft / 1 cell) to the target position.
 * Allies are combatants of the same entityType as the attacker (characters ally with characters).
 */
function hasAllyAdjacentToTarget(
  combatants: Array<{ entityId: string; entityType: string; position: { x: number; y: number } }>,
  attackerIndex: number,
  targetPosition: { x: number; y: number },
): boolean {
  const attacker = combatants[attackerIndex];
  for (let i = 0; i < combatants.length; i++) {
    if (i === attackerIndex) continue; // skip self
    const c = combatants[i];
    if (c.entityType !== attacker.entityType) continue; // not an ally
    const dist = Math.abs(c.position.x - targetPosition.x) + Math.abs(c.position.y - targetPosition.y);
    if (dist <= 1) return true; // within 5ft
  }
  return false;
}

// ============ VALIDATORS ============

const combatantInput = v.object({
  entityId: v.string(),
  entityType: v.union(v.literal("character"), v.literal("npc")),
  position: v.object({ x: v.number(), y: v.number() }),
});

const actionType = v.union(
  v.literal("attack"),
  v.literal("spell"),
  v.literal("technique"),
  v.literal("dodge"),
  v.literal("disengage"),
  v.literal("dash"),
  v.literal("help"),
  v.literal("hide"),
  v.literal("ready"),
  v.literal("use_item"),
  v.literal("second_wind"),
  v.literal("action_surge"),
  v.literal("cc_break"),
  v.literal("iron_will"),
  v.literal("other")
);

const combatAction = v.object({
  type: actionType,
  targetIndex: v.optional(v.number()),
  targetPosition: v.optional(v.object({ x: v.number(), y: v.number() })),
  weaponId: v.optional(v.string()),
  spellId: v.optional(v.string()),
  techniqueId: v.optional(v.string()),
  itemId: v.optional(v.string()),
  roll: v.optional(v.number()),
  damage: v.optional(v.number()),
  description: v.optional(v.string()),
  // Class feature flags
  reckless: v.optional(v.boolean()),        // Barbarian: Reckless Attack (advantage on STR melee, but attacked with advantage)
  smiteSlotLevel: v.optional(v.number()),   // Paladin: Divine Smite (spell slot level to expend on hit)
  stunningStrike: v.optional(v.boolean()),  // Monk: Stunning Strike (spend 1 ki, target CON save or stunned)
});

// ============ QUERIES ============

export const getCombatState = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      return null;
    }

    // Enrich combatants with entity details and derived stats
    const enrichedCombatants = await Promise.all(
      session.combat.combatants.map(async (combatant) => {
        if (combatant.entityType === "character") {
          const character = await ctx.db.get(
            combatant.entityId as Id<"characters">
          );
          if (!character) return { ...combatant, entity: null };

          const derivedStats = await getEffectiveStats(ctx, combatant.entityId as Id<"characters">);
          return {
            ...combatant,
            entity: {
              name: character.name,
              hp: character.hp,
              maxHp: derivedStats.effectiveMaxHp,
              ac: derivedStats.effectiveAc,
              portrait: character.portrait,
              conditions: character.conditions,
              deathSaves: character.deathSaves,
              concentration: character.concentration,
            },
          };
        } else {
          const npc = await ctx.db.get(combatant.entityId as Id<"npcs">);
          return {
            ...combatant,
            entity: npc
              ? {
                  name: npc.name,
                  hp: npc.hp,
                  maxHp: npc.maxHp,
                  ac: npc.ac,
                  portrait: npc.portrait,
                  conditions: npc.conditions,
                }
              : null,
          };
        }
      })
    );

    return {
      ...session.combat,
      combatants: enrichedCombatants,
      sessionId: args.sessionId,
    };
  },
});

export const getCurrentTurn = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      return null;
    }

    const combat = session.combat;
    const currentCombatant = combat.combatants[combat.currentTurnIndex];
    const now = Date.now();
    const timeElapsed = now - combat.lastTurnStartedAt;
    const timeRemaining = Math.max(0, combat.turnTimeoutMs - timeElapsed);

    return {
      combatantIndex: combat.currentTurnIndex,
      combatant: currentCombatant,
      round: combat.round,
      timeRemaining,
      isTimedOut: timeRemaining === 0,
    };
  },
});

export const getAvailableActions = query({
  args: {
    sessionId: v.id("gameSessions"),
    combatantIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      return null;
    }

    const combatant = session.combat.combatants[args.combatantIndex];
    if (!combatant) {
      return null;
    }

    const actions: string[] = [];
    const bonusActions: string[] = [];
    const reactions: string[] = [];
    const movement = combatant.movementRemaining;

    // Standard actions available if hasAction is true
    if (combatant.hasAction) {
      actions.push("attack", "technique", "dodge", "disengage", "dash", "help", "hide", "ready", "use_item");

      // Check for spells if character
      if (combatant.entityType === "character") {
        actions.push("spell");
      }
    }

    // Bonus actions and class features
    if (combatant.entityType === "character") {
      const char = await ctx.db.get(combatant.entityId as Id<"characters">);
      if (char) {
        const cls = (char.class || "").toLowerCase();

        if (combatant.hasBonusAction) {
          bonusActions.push("offhand_attack");

          // Fighter: Second Wind
          if ((cls === "fighter" || cls === "warrior") && char.classResources?.secondWind?.current) {
            bonusActions.push("second_wind");
          }
          // Rogue: Cunning Action (Dash/Disengage/Hide as bonus action)
          if (cls === "rogue" && char.level >= 2) {
            bonusActions.push("cunning_dash", "cunning_disengage", "cunning_hide");
          }
          // Bonus action spells (misty_step, etc.)
          bonusActions.push("bonus_spell");
        }

        // Action Surge (free action, not bonus)
        if ((cls === "fighter" || cls === "warrior") && char.classResources?.actionSurge?.current) {
          actions.push("action_surge");
        }
        // Reckless Attack flag (barbarian level 2+, shown as attack modifier)
        if (cls === "barbarian" && char.level >= 2 && combatant.hasAction) {
          actions.push("reckless_attack");
        }
        // Stunning Strike (monk level 5+, shown as attack modifier when ki available)
        if (cls === "monk" && char.level >= 5 && char.classResources?.ki?.current) {
          actions.push("stunning_strike");
        }
        // Divine Smite (paladin level 2+, shown when spell slots available)
        if (cls === "paladin" && char.level >= 2 && char.spellSlots) {
          const hasAnySlot = Object.values(char.spellSlots).some(s => s.used < s.max);
          if (hasAnySlot) actions.push("divine_smite");
        }

        // CC Break (class-specific)
        const ccBreak = getCcBreakFeature(cls, char.level);
        if (ccBreak) {
          const hasCcConditions = char.conditions.some(c => {
            const cat = CC_CATEGORIES[c.name];
            return cat && ccBreak.breaksCategories.includes(cat);
          });
          if (hasCcConditions) {
            // Check cooldown
            const cooldowns = combatant.ccBreakCooldowns ?? {};
            const lastUsedRound = cooldowns["cc_break"] ?? -999;
            const currentRound = session.combat!.round;
            const offCooldown = ccBreak.cooldownRounds === 0 || (currentRound - lastUsedRound >= ccBreak.cooldownRounds);

            if (offCooldown) {
              // Check action cost availability
              if (ccBreak.actionCost === "reaction" && combatant.hasReaction) {
                reactions.push("cc_break");
              } else if (ccBreak.actionCost === "bonus_action" && combatant.hasBonusAction) {
                bonusActions.push("cc_break");
              } else if (ccBreak.actionCost === "free" || ccBreak.actionCost === "passive") {
                actions.push("cc_break");
              }

              // Check resource availability
              if (ccBreak.resourceCost) {
                const resource = char.classResources?.[ccBreak.resourceCost.resource];
                if (!resource || resource.current < ccBreak.resourceCost.amount) {
                  // Remove cc_break from whichever list it was added to
                  [actions, bonusActions, reactions].forEach(list => {
                    const idx = list.indexOf("cc_break");
                    if (idx !== -1) list.splice(idx, 1);
                  });
                }
              }

              // Check raging requirement (barbarian)
              if (ccBreak.requiresRaging && !char.conditions.some(c => c.name === "raging")) {
                [actions, bonusActions, reactions].forEach(list => {
                  const idx = list.indexOf("cc_break");
                  if (idx !== -1) list.splice(idx, 1);
                });
              }
            }
          }
        }

        // Iron Will (universal, once per combat)
        if (!(combatant.ironWillUsed)) {
          const hasCc = char.conditions.some(c => CC_CATEGORIES[c.name] !== undefined);
          if (hasCc) {
            actions.push("iron_will");
          }
        }
      }
    } else if (combatant.hasBonusAction) {
      bonusActions.push("offhand_attack");
    }

    // Reactions
    if (combatant.hasReaction) {
      reactions.push("opportunity_attack", "reaction_spell");
    }

    return {
      actions,
      bonusActions,
      reactions,
      movement,
      canMove: movement > 0,
    };
  },
});

// ============ MUTATIONS ============

export const initiateCombat = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    combatants: v.array(combatantInput),
    turnTimeoutMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    const { userId } = await requireCampaignMember(ctx, session.campaignId);

    // Copy exploration positions to combatants if available
    const explorationPositions = session.explorationPositions ?? {};

    const combatantStates = await Promise.all(args.combatants.map(async (c) => {
      // Use exploration position if combatant didn't specify one, or if position is (0,0) default
      const explorationPos = explorationPositions[c.entityId];
      const position = (c.position.x === 0 && c.position.y === 0 && explorationPos)
        ? explorationPos
        : c.position;

      // Look up effective speed for the entity
      let speed = 30;
      if (c.entityType === "character") {
        try {
          const stats = await getEffectiveStats(ctx, c.entityId as Id<"characters">);
          speed = stats.effectiveSpeed;
        } catch { /* default 30 */ }
      } else {
        const npc = await ctx.db.get(c.entityId as Id<"npcs">);
        if (npc) speed = 30; // NPCs use base 30
      }

      return {
        entityId: c.entityId,
        entityType: c.entityType,
        initiative: 0,
        position,
        hasAction: true,
        hasBonusAction: true,
        hasReaction: true,
        movementRemaining: speed,
      };
    }));

    const now = Date.now();

    await ctx.db.patch(args.sessionId, {
      mode: "combat",
      combat: {
        combatants: combatantStates,
        currentTurnIndex: 0,
        round: 0, // Round 0 = rolling initiative
        phase: "rolling_initiative",
        turnTimeoutMs: args.turnTimeoutMs ?? DEFAULT_TURN_TIMEOUT_MS,
        lastTurnStartedAt: now,
      },
      lastActionAt: now,
    });

    await logAudit(ctx, userId, "combat.initiate", "gameSessions", session._id, { combatantCount: args.combatants.length });

    return { phase: "rolling_initiative", combatantCount: combatantStates.length };
  },
});

export const rollInitiative = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    combatantIndex: v.number(),
    roll: v.number(), // The d20 roll + dex modifier
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    await requireCampaignMember(ctx, session.campaignId);

    if (session.combat.phase !== "rolling_initiative") {
      throw new Error("Not in initiative rolling phase");
    }

    const combatants = [...session.combat.combatants];
    if (!combatants[args.combatantIndex]) {
      throw new Error("Invalid combatant index");
    }

    combatants[args.combatantIndex] = {
      ...combatants[args.combatantIndex],
      initiative: args.roll,
    };

    // Check if all initiatives are rolled (non-zero)
    const allRolled = combatants.every((c) => c.initiative > 0);

    if (allRolled) {
      // Sort by initiative (descending) and start combat
      combatants.sort((a, b) => b.initiative - a.initiative);

      // Reset turn resources for first combatant
      combatants[0] = {
        ...combatants[0],
        hasAction: true,
        hasBonusAction: true,
        hasReaction: true,
        movementRemaining: 30,
        turnStartedAt: Date.now(),
      };

      await ctx.db.patch(args.sessionId, {
        combat: {
          ...session.combat,
          combatants,
          currentTurnIndex: 0,
          round: 1,
          phase: "in_progress",
          lastTurnStartedAt: Date.now(),
        },
        lastActionAt: Date.now(),
      });

      return { phase: "in_progress", turnOrder: combatants.map((c) => c.entityId) };
    }

    await ctx.db.patch(args.sessionId, {
      combat: {
        ...session.combat,
        combatants,
      },
      lastActionAt: Date.now(),
    });

    return { phase: "rolling_initiative", rolled: args.combatantIndex };
  },
});

export const executeAction = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    action: combatAction,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    await requireCampaignMember(ctx, session.campaignId);

    if (session.combat.phase !== "in_progress") {
      throw new Error("Combat not in progress");
    }

    const combatants = [...session.combat.combatants];
    const currentIndex = session.combat.currentTurnIndex;
    const current = combatants[currentIndex];

    // Check if combatant can act (conditions like stunned/paralyzed/unconscious)
    let attackerConditions: string[] = [];
    if (current.entityType === "character") {
      const char = await ctx.db.get(current.entityId as Id<"characters">);
      if (char) attackerConditions = char.conditions.map(c => c.name);
    } else {
      const npc = await ctx.db.get(current.entityId as Id<"npcs">);
      if (npc) attackerConditions = npc.conditions.map(c => c.name);
    }

    if (!canAct(attackerConditions) && args.action.type !== "other" && args.action.type !== "cc_break" && args.action.type !== "iron_will") {
      throw new Error("Cannot act due to conditions");
    }

    // Determine if this is a bonus action (doesn't consume standard action)
    // Cunning Action: rogues level 2+ can Dash/Disengage/Hide as a bonus action
    let isCunningAction = false;
    if (current.entityType === "character" && ["dash", "disengage", "hide"].includes(args.action.type)) {
      const cunningChar = await ctx.db.get(current.entityId as Id<"characters">);
      if (cunningChar) {
        const cls = (cunningChar.class || "").toLowerCase();
        if (cls === "rogue" && cunningChar.level >= 2) {
          isCunningAction = true;
        }
      }
    }

    const isBonusAction = isCunningAction ||
      args.action.type === "second_wind" ||
      (args.action.type === "spell" && args.action.spellId && getSpellById(args.action.spellId)?.castingTime === "bonus_action");

    if (isBonusAction) {
      if (!current.hasBonusAction) throw new Error("No bonus action remaining");
    } else if (args.action.type === "action_surge") {
      // Action surge is free — doesn't consume action or bonus action
    } else {
      if (!current.hasAction) throw new Error("No action remaining");
    }

    let serverRoll: number | undefined;
    let serverDamage: number | undefined;
    let hitResult = false;
    let isCrit = false;
    const attackResults: Array<{ hit: boolean; damage: number; roll: number; critical: boolean }> = [];

    // ========== ATTACK RESOLUTION (with Extra Attacks) ==========
    if (args.action.type === "attack" && args.action.targetIndex !== undefined) {
      const target = combatants[args.action.targetIndex];
      if (!target) throw new Error("Invalid target");

      // Get target AC and conditions (computed once for all attacks)
      let targetAc = 10;
      let targetConditions: string[] = [];
      if (target.entityType === "character") {
        const targetStats = await getEffectiveStats(ctx, target.entityId as Id<"characters">);
        targetAc = targetStats.effectiveAc;
        const targetChar = await ctx.db.get(target.entityId as Id<"characters">);
        if (targetChar) targetConditions = targetChar.conditions.map(c => c.name);
      } else {
        const targetNpc = await ctx.db.get(target.entityId as Id<"npcs">);
        if (targetNpc) {
          targetAc = targetNpc.ac;
          targetConditions = targetNpc.conditions.map(c => c.name);
        }
      }

      // Apply cover bonus to AC
      if (session.locationId) {
        const location = await ctx.db.get(session.locationId);
        if (location?.gridData) {
          const targetCell = location.gridData.cells.find(
            c => c.x === target.position.x && c.y === target.position.y
          );
          if (targetCell?.cover === "full") throw new Error("Target has full cover and cannot be targeted");
          if (targetCell?.cover === "half") targetAc += 2;
          else if (targetCell?.cover === "three-quarters") targetAc += 5;
        }
      }

      // Apply condition-based AC modifier (e.g. armor_broken = -3)
      targetAc += getAcModifier(targetConditions);

      // Calculate attack bonus
      let attackBonus = 0;
      if (current.entityType === "character") {
        const stats = await getEffectiveStats(ctx, current.entityId as Id<"characters">);
        attackBonus = stats.attackBonus;
      } else {
        const npc = await ctx.db.get(current.entityId as Id<"npcs">);
        if (npc) attackBonus = getNpcAttackBonus(npc);
      }

      // Resolve advantage/disadvantage from conditions
      const distance = Math.abs(target.position.x - current.position.x) +
                       Math.abs(target.position.y - current.position.y);
      const isMelee = distance <= 1;
      let advState = resolveAttackAdvantage(
        attackerConditions,
        targetConditions,
        isMelee,
        isMelee,
      );

      // Determine number of attacks (Extra Attack feature)
      let numAttacks = 1;
      let charClass = "";
      let charLevel = 1;
      if (current.entityType === "character") {
        const char = await ctx.db.get(current.entityId as Id<"characters">);
        if (char) {
          charClass = (char.class || "").toLowerCase();
          charLevel = char.level;
          numAttacks = 1 + getExtraAttacks(charClass, charLevel);
        }
      }

      // Reckless Attack (barbarian level 2+): gain advantage on melee STR attacks,
      // but attacks against you have advantage until your next turn
      if (args.action.reckless && charClass === "barbarian" && charLevel >= 2 && isMelee) {
        if (advState <= 0) advState = 1; // force advantage
        // Apply "reckless" condition — attacks against have advantage until next turn
        if (current.entityType === "character") {
          const rChar = await ctx.db.get(current.entityId as Id<"characters">);
          if (rChar) {
            const conds = [...rChar.conditions];
            if (!conds.some(c => c.name === "reckless")) {
              conds.push({ name: "reckless", duration: 1, source: "reckless_attack" });
              await ctx.db.patch(current.entityId as Id<"characters">, { conditions: conds });
            }
          }
        }
      }

      let sneakAttackUsed = false; // Sneak attack: once per turn only

      // === MULTI-ATTACK LOOP ===
      for (let atkNum = 0; atkNum < numAttacks; atkNum++) {
        // Roll d20 with advantage/disadvantage
        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        let naturalRoll: number;
        if (advState === 1) naturalRoll = Math.max(roll1, roll2);
        else if (advState === -1) naturalRoll = Math.min(roll1, roll2);
        else naturalRoll = roll1;

        const atkRoll = naturalRoll + attackBonus;
        const atkCrit = naturalRoll === 20;
        const autoCrit = isAutoCrit(targetConditions, isMelee);

        if (naturalRoll === 1) {
          // Critical miss
          attackResults.push({ hit: false, damage: 0, roll: atkRoll, critical: false });
          continue;
        }

        if (!(atkCrit || autoCrit || atkRoll >= targetAc)) {
          // Miss
          attackResults.push({ hit: false, damage: 0, roll: atkRoll, critical: false });
          continue;
        }

        // === HIT — calculate damage ===
        let damageDice = "1d8";
        let damageBonus = 0;
        if (current.entityType === "character") {
          const char = await ctx.db.get(current.entityId as Id<"characters">);
          if (char) {
            const stats = await getEffectiveStats(ctx, current.entityId as Id<"characters">);
            damageBonus = stats.abilityModifiers.strength; // default to STR
            const weapon = await ctx.db
              .query("items")
              .withIndex("by_owner", (q) => q.eq("ownerId", current.entityId as Id<"characters">))
              .filter((q) =>
                q.and(
                  q.eq(q.field("status"), "equipped"),
                  q.eq(q.field("equippedSlot"), "mainHand")
                )
              )
              .first();
            if (weapon?.stats.damage) damageDice = weapon.stats.damage;

            // Sneak Attack (rogue, once per turn, requires advantage OR ally within 5ft of target)
            const allyAdjacent = hasAllyAdjacentToTarget(combatants, currentIndex, target.position);
            if (charClass === "rogue" && !sneakAttackUsed && (advState === 1 || allyAdjacent)) {
              const sneakDice = getSneakAttackDice(charLevel);
              const sneakResult = parseDiceString(`${sneakDice}d6`);
              damageBonus += sneakResult.total;
              sneakAttackUsed = true;
            }
            // Rage damage bonus (barbarian, while raging)
            if (charClass === "barbarian" && char.classResources?.rage?.current) {
              damageBonus += getRageDamageBonus(charLevel);
            }
          }
        } else {
          const npc = await ctx.db.get(current.entityId as Id<"npcs">);
          if (npc) damageDice = getNpcDamageDice(npc);
        }

        const damageResult = parseDiceString(damageDice);
        let atkDamage = damageResult.total + damageBonus;

        // Double dice on crit
        if (atkCrit || autoCrit) {
          const critExtra = parseDiceString(damageDice);
          atkDamage += critExtra.total;
        }

        // Divine Smite (paladin, on melee hit, expend spell slot for 2d8 + 1d8/slot above 1st radiant)
        if (args.action.smiteSlotLevel && charClass === "paladin" && isMelee && atkNum === 0) {
          const smiteChar = await ctx.db.get(current.entityId as Id<"characters">);
          if (smiteChar) {
            const slots = smiteChar.spellSlots || {};
            const slotKey = String(args.action.smiteSlotLevel);
            const slot = slots[slotKey];
            if (slot && slot.used < slot.max) {
              // 2d8 base + 1d8 per slot level above 1st (max 5d8)
              const smiteDice = Math.min(5, 1 + args.action.smiteSlotLevel);
              const smiteResult = parseDiceString(`${smiteDice}d8`);
              let smiteDmg = smiteResult.total;
              if (atkCrit || autoCrit) smiteDmg += parseDiceString(`${smiteDice}d8`).total; // crit doubles smite
              atkDamage += smiteDmg;
              // Consume spell slot
              await ctx.db.patch(current.entityId as Id<"characters">, {
                spellSlots: { ...slots, [slotKey]: { max: slot.max, used: slot.used + 1 } },
              });
            }
          }
        }

        // Apply resistance (petrified)
        if (hasResistanceAll(targetConditions)) {
          atkDamage = Math.floor(atkDamage / 2);
        }

        // Stunning Strike (monk level 5+, on hit, spend 1 ki, target CON save or stunned)
        if (args.action.stunningStrike && charClass === "monk" && charLevel >= 5 && isMelee && atkNum === 0) {
          const monkChar = await ctx.db.get(current.entityId as Id<"characters">);
          if (monkChar && monkChar.classResources?.ki?.current) {
            // Consume 1 ki
            await ctx.db.patch(current.entityId as Id<"characters">, {
              classResources: {
                ...monkChar.classResources,
                ki: { max: monkChar.classResources.ki.max, current: monkChar.classResources.ki.current - 1 },
              },
            });
            // Target CON save vs monk's ki save DC (8 + prof + WIS mod)
            const wisMod = Math.floor((monkChar.abilities.wisdom - 10) / 2);
            const kiSaveDC = 8 + monkChar.proficiencyBonus + wisMod;
            let targetConMod = 0;
            if (target.entityType === "character") {
              const tc = await ctx.db.get(target.entityId as Id<"characters">);
              if (tc) targetConMod = Math.floor((tc.abilities.constitution - 10) / 2);
            }
            // NPC con mod
            if (target.entityType === "npc") {
              const tn = await ctx.db.get(target.entityId as Id<"npcs">);
              if (tn) targetConMod = Math.floor((tn.abilities.constitution - 10) / 2);
            }
            const conSave = Math.floor(Math.random() * 20) + 1 + targetConMod;
            let stunSaveFailed = conSave < kiSaveDC;

            // Legendary resistance: boss NPC auto-succeeds save, consuming a charge
            if (stunSaveFailed && target.entityType === "npc") {
              const tn = await ctx.db.get(target.entityId as Id<"npcs">);
              if (tn && canUseLegendaryResistance(tn.legendaryResistances)) {
                stunSaveFailed = false;
                await ctx.db.patch(target.entityId as Id<"npcs">, {
                  legendaryResistances: {
                    max: tn.legendaryResistances!.max,
                    current: tn.legendaryResistances!.current - 1,
                  },
                });
              }
            }

            if (stunSaveFailed) {
              // Check cc_immune and apply DR
              if (target.entityType === "character") {
                const tc = await ctx.db.get(target.entityId as Id<"characters">);
                if (tc) {
                  if (!shouldBlockCc(tc.conditions.map(c => c.name), "stunned")) {
                    let dur = 1;
                    const targetDrTracker: DrTracker = combatants[args.action.targetIndex!].drTracker ?? {};
                    const drResult = applyDiminishingReturns(dur, "stunned", targetDrTracker, session.combat!.round);
                    dur = drResult.duration;
                    combatants[args.action.targetIndex!] = { ...combatants[args.action.targetIndex!], drTracker: drResult.updatedTracker };
                    if (dur > 0) {
                      const conds = applyOrReplaceCondition(tc.conditions, {
                        name: "stunned", duration: dur, source: "stunning_strike",
                        saveDC: kiSaveDC, saveAbility: "constitution",
                      });
                      await ctx.db.patch(target.entityId as Id<"characters">, { conditions: conds });
                    }
                  }
                }
              } else {
                const tn = await ctx.db.get(target.entityId as Id<"npcs">);
                if (tn) {
                  if (!shouldBlockCc(tn.conditions.map(c => c.name), "stunned")) {
                    let dur = 1;
                    const targetDrTracker: DrTracker = combatants[args.action.targetIndex!].drTracker ?? {};
                    const drResult = applyDiminishingReturns(dur, "stunned", targetDrTracker, session.combat!.round);
                    dur = drResult.duration;
                    combatants[args.action.targetIndex!] = { ...combatants[args.action.targetIndex!], drTracker: drResult.updatedTracker };
                    if (dur > 0) {
                      dur = applyCcResistance(dur, tn.eliteRank as "elite" | "boss" | undefined);
                      const conds = applyOrReplaceCondition(tn.conditions, {
                        name: "stunned", duration: dur, source: "stunning_strike",
                        saveDC: kiSaveDC, saveAbility: "constitution",
                      });
                      await ctx.db.patch(target.entityId as Id<"npcs">, { conditions: conds });
                    }
                  }
                }
              }
            }
          }
        }

        // Apply damage to target
        if (target.entityType === "character") {
          const character = await ctx.db.get(target.entityId as Id<"characters">);
          if (character && !character.conditions.some(c => c.name === "dead")) {
            // Damage at 0 HP → automatic death save failures (crit = 2 failures)
            if (character.hp === 0) {
              const ds = { ...character.deathSaves };
              ds.failures = Math.min(3, ds.failures + ((atkCrit || autoCrit) ? 2 : 1));
              const patch: Record<string, unknown> = { deathSaves: ds };
              if (ds.failures >= 3) {
                const conds = character.conditions.filter(c => c.name !== "unconscious");
                conds.push({ name: "dead" });
                patch.conditions = conds;
              }
              await ctx.db.patch(target.entityId as Id<"characters">, patch);
            } else {
              let remainingDamage = atkDamage;
              let newTempHp = character.tempHp;
              if (newTempHp > 0) {
                const absorbed = Math.min(newTempHp, remainingDamage);
                newTempHp -= absorbed;
                remainingDamage -= absorbed;
              }
              const newHp = Math.max(0, character.hp - remainingDamage);
              const patch: Record<string, unknown> = { hp: newHp, tempHp: newTempHp };
              if (newHp === 0 && character.hp > 0) {
                const currentConditions = [...character.conditions];
                if (!currentConditions.some(c => c.name === "unconscious")) {
                  currentConditions.push({ name: "unconscious" });
                }
                if (!currentConditions.some(c => c.name === "prone")) {
                  currentConditions.push({ name: "prone" });
                }
                patch.conditions = currentConditions;
                patch.deathSaves = { successes: 0, failures: 0 };
              }
              if (character.concentration && remainingDamage > 0) {
                const conSaveDC = concentrationSaveDC(remainingDamage);
                const conMod = Math.floor((character.abilities.constitution - 10) / 2);
                const conSave = Math.floor(Math.random() * 20) + 1 + conMod + character.proficiencyBonus;
                if (conSave < conSaveDC) {
                  await removeConcentrationConditions(ctx, character.concentration, target.entityId, combatants);
                  patch.concentration = undefined;
                }
              }
              await ctx.db.patch(target.entityId as Id<"characters">, patch);
            }
          }
        } else {
          const npc = await ctx.db.get(target.entityId as Id<"npcs">);
          if (npc) {
            const newHp = Math.max(0, npc.hp - atkDamage);
            await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
            await checkNpcConcentration(ctx, npc, target.entityId, atkDamage, combatants);
          }
        }

        attackResults.push({ hit: true, damage: atkDamage, roll: atkRoll, critical: atkCrit || autoCrit });
      }
      // === END MULTI-ATTACK LOOP ===

      // Aggregate results
      hitResult = attackResults.some(r => r.hit);
      serverDamage = attackResults.reduce((sum, r) => sum + r.damage, 0);
      serverRoll = attackResults[0]?.roll;
      isCrit = attackResults.some(r => r.critical);

    } else if (args.action.type === "attack" && args.action.damage) {
      // Fallback: client sent damage directly (legacy support)
      serverDamage = args.action.damage;
      if (args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (target) {
          if (target.entityType === "character") {
            const character = await ctx.db.get(target.entityId as Id<"characters">);
            if (character && !character.conditions.some(c => c.name === "dead")) {
              const newHp = Math.max(0, character.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"characters">, { hp: newHp });
            }
          } else {
            const npc = await ctx.db.get(target.entityId as Id<"npcs">);
            if (npc) {
              const newHp = Math.max(0, npc.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
              await checkNpcConcentration(ctx, npc, target.entityId, serverDamage, combatants);
            }
          }
        }
      }
      hitResult = true;

    // ========== SPELL CASTING ==========
    } else if (args.action.type === "spell" && args.action.spellId) {
      const spell = getSpellById(args.action.spellId);
      if (!spell) throw new Error("Unknown spell: " + args.action.spellId);

      if (current.entityType !== "character") throw new Error("NPCs cannot cast spells via this action");
      const caster = await ctx.db.get(current.entityId as Id<"characters">);
      if (!caster) throw new Error("Caster not found");

      // Check if caster can cast spells (silenced/confused blocks casting)
      if (!canCast(attackerConditions)) {
        throw new Error("Cannot cast spells due to conditions (silenced/confused)");
      }

      const charClass = (caster.class || "").toLowerCase();
      const castingAbility = getCastingAbility(charClass);
      if (!castingAbility) throw new Error("Class cannot cast spells");

      const castingAbilityScore = caster.abilities[castingAbility as keyof typeof caster.abilities];
      const profBonus = caster.proficiencyBonus;

      // Validate spell range
      if (spell.range > 0 && args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (target) {
          const distanceCells = Math.abs(target.position.x - current.position.x) +
                                Math.abs(target.position.y - current.position.y);
          const distanceFeet = distanceCells * 5;
          if (distanceFeet > spell.range) {
            throw new Error(`Target is out of range (${distanceFeet}ft > ${spell.range}ft)`);
          }
        }
      } else if (spell.range > 0 && args.action.targetPosition) {
        // AoE spells: check distance to target position
        const distanceCells = Math.abs(args.action.targetPosition.x - current.position.x) +
                              Math.abs(args.action.targetPosition.y - current.position.y);
        const distanceFeet = distanceCells * 5;
        if (distanceFeet > spell.range) {
          throw new Error(`Target position is out of range (${distanceFeet}ft > ${spell.range}ft)`);
        }
      }

      // Check and consume spell slot (cantrips are free)
      if (spell.level > 0) {
        const slots = caster.spellSlots || {};
        if (!hasSpellSlot(slots, spell.level)) {
          throw new Error(`No level ${spell.level} spell slot available`);
        }
        const slotKey = String(spell.level);
        const slot = slots[slotKey];
        await ctx.db.patch(current.entityId as Id<"characters">, {
          spellSlots: { ...slots, [slotKey]: { max: slot.max, used: slot.used + 1 } },
        });
      }

      // Unique source ID: prevents collision when two casters use the same spell
      const spellSourceId = `${spell.id}_${current.entityId}`;

      // Handle concentration: drop existing conditions before setting new (the concentration field itself is overwritten at the end)
      if (spell.concentration && caster.concentration) {
        await removeConcentrationConditions(ctx, caster.concentration, current.entityId, combatants);
      }

      // --- Spell attack roll spells (fire_bolt, eldritch_blast, ray_of_frost, chill_touch, scorching_ray) ---
      if (spell.attackRoll && args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (!target) throw new Error("Invalid target");

        let targetAc = 10;
        let targetConditions: string[] = [];
        if (target.entityType === "character") {
          const ts = await getEffectiveStats(ctx, target.entityId as Id<"characters">);
          targetAc = ts.effectiveAc;
          const tc = await ctx.db.get(target.entityId as Id<"characters">);
          if (tc) targetConditions = tc.conditions.map(c => c.name);
        } else {
          const tn = await ctx.db.get(target.entityId as Id<"npcs">);
          if (tn) { targetAc = tn.ac; targetConditions = tn.conditions.map(c => c.name); }
        }

        // Apply cover bonus to spell attack AC
        if (session.locationId) {
          const location = await ctx.db.get(session.locationId);
          if (location?.gridData) {
            const targetCell = location.gridData.cells.find(
              c => c.x === target.position.x && c.y === target.position.y
            );
            if (targetCell?.cover === "full") throw new Error("Target has full cover and cannot be targeted");
            if (targetCell?.cover === "half") targetAc += 2;
            else if (targetCell?.cover === "three-quarters") targetAc += 5;
          }
        }

        // Apply condition-based AC modifier (e.g. armor_broken = -3)
        targetAc += getAcModifier(targetConditions);

        const spellAttackBonus = getSpellAttackBonus(profBonus, castingAbilityScore);
        const distance = Math.abs(target.position.x - current.position.x) + Math.abs(target.position.y - current.position.y);
        const isMelee = distance <= 1;
        const advState = resolveAttackAdvantage(attackerConditions, targetConditions, isMelee, isMelee);

        // Scorching ray: 3 rays; other spells: 1 ray
        const numRays = spell.id === "scorching_ray" ? 3 : 1;

        for (let ray = 0; ray < numRays; ray++) {
          const roll1 = Math.floor(Math.random() * 20) + 1;
          const roll2 = Math.floor(Math.random() * 20) + 1;
          let naturalRoll: number;
          if (advState === 1) naturalRoll = Math.max(roll1, roll2);
          else if (advState === -1) naturalRoll = Math.min(roll1, roll2);
          else naturalRoll = roll1;

          const rollTotal = naturalRoll + spellAttackBonus;
          if (ray === 0) serverRoll = rollTotal;
          const rayIsCrit = naturalRoll === 20;

          if (naturalRoll === 1) continue; // miss

          if (rayIsCrit || rollTotal >= targetAc) {
            hitResult = true;
            if (rayIsCrit) isCrit = true;

            if (spell.damage) {
              const diceMatch = spell.damage.dice.match(/^(\d+)d(\d+)/);
              let diceCount = diceMatch ? parseInt(diceMatch[1]) : 1;
              const diceSides = diceMatch ? diceMatch[2] : "10";

              // Scale cantrips
              if (spell.level === 0 && spell.damage.scalesWithLevel) {
                diceCount = getCantripDiceCount(caster.level);
              }

              const damageDice = `${diceCount}d${diceSides}`;
              const result = parseDiceString(damageDice);
              let rayDamage = result.total;
              if (rayIsCrit) rayDamage += parseDiceString(damageDice).total;

              if (hasResistanceAll(targetConditions)) rayDamage = Math.floor(rayDamage / 2);

              serverDamage = (serverDamage || 0) + rayDamage;

              // Apply damage
              if (target.entityType === "character") {
                const ch = await ctx.db.get(target.entityId as Id<"characters">);
                if (ch && !ch.conditions.some(c => c.name === "dead")) {
                  let rem = rayDamage;
                  let tp = ch.tempHp;
                  if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
                  const newHp = Math.max(0, ch.hp - rem);
                  const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
                  if (newHp === 0 && ch.hp > 0) {
                    const conds = [...ch.conditions];
                    if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
                    if (!conds.some(c => c.name === "prone")) conds.push({ name: "prone" });
                    patch.conditions = conds;
                    patch.deathSaves = { successes: 0, failures: 0 };
                  }
                  if (ch.concentration && rem > 0) {
                    const dc = concentrationSaveDC(rem);
                    const mod = Math.floor((ch.abilities.constitution - 10) / 2);
                    if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
                      await removeConcentrationConditions(ctx, ch.concentration, target.entityId, combatants);
                      patch.concentration = undefined;
                    }
                  }
                  await ctx.db.patch(target.entityId as Id<"characters">, patch);
                }
              } else {
                const np = await ctx.db.get(target.entityId as Id<"npcs">);
                if (np) {
                  const newHp = Math.max(0, np.hp - rayDamage);
                  await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
                  await checkNpcConcentration(ctx, np, target.entityId, rayDamage, combatants);
                }
              }
            }
          }
        }

      // --- Saving throw spells (sacred_flame, burning_hands, thunderwave, fireball, hold_person) ---
      } else if (spell.saveType) {
        const spellSaveDC = getSpellSaveDC(profBonus, castingAbilityScore);
        serverRoll = spellSaveDC; // Return DC as the "roll" for display

        // Find targets: AoE or single target
        const targetIndices: number[] = [];
        if (spell.areaOfEffect && args.action.targetPosition) {
          // AoE: find all combatants within range of target position
          const aoeRadius = spell.areaOfEffect.size / 5; // convert feet to cells
          for (let i = 0; i < combatants.length; i++) {
            if (i === currentIndex) continue; // don't hit self (most AoE)
            const c = combatants[i];
            const dist = Math.abs(c.position.x - args.action.targetPosition.x) + Math.abs(c.position.y - args.action.targetPosition.y);
            if (dist <= aoeRadius) targetIndices.push(i);
          }
        } else if (args.action.targetIndex !== undefined) {
          targetIndices.push(args.action.targetIndex);
        }

        for (const tIdx of targetIndices) {
          const target = combatants[tIdx];
          if (!target) continue;

          // Get target's save modifier
          let saveMod = 0;
          let targetConditions: string[] = [];
          if (target.entityType === "character") {
            const tc = await ctx.db.get(target.entityId as Id<"characters">);
            if (tc) {
              const abilityScore = tc.abilities[spell.saveType as keyof typeof tc.abilities];
              saveMod = Math.floor((abilityScore - 10) / 2);
              targetConditions = tc.conditions.map(c => c.name);
            }
          } else {
            const tn = await ctx.db.get(target.entityId as Id<"npcs">);
            if (tn) {
              const npcAbilityScore = tn.abilities[spell.saveType as keyof typeof tn.abilities] ?? 10;
              saveMod = Math.floor((npcAbilityScore - 10) / 2);
              targetConditions = tn.conditions.map(c => c.name);
            }
          }

          const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod;
          let saveSuccess = saveRoll >= spellSaveDC;

          // Legendary resistance: boss NPC auto-succeeds save, consuming a charge
          if (!saveSuccess && target.entityType === "npc") {
            const lrNpc = await ctx.db.get(target.entityId as Id<"npcs">);
            if (lrNpc && canUseLegendaryResistance(lrNpc.legendaryResistances)) {
              saveSuccess = true;
              await ctx.db.patch(target.entityId as Id<"npcs">, {
                legendaryResistances: {
                  max: lrNpc.legendaryResistances!.max,
                  current: lrNpc.legendaryResistances!.current - 1,
                },
              });
            }
          }

          // Apply damage (half on save for damage spells)
          if (spell.damage) {
            const diceMatch = spell.damage.dice.match(/^(\d+)d(\d+)/);
            let diceCount = diceMatch ? parseInt(diceMatch[1]) : 1;
            const diceSides = diceMatch ? diceMatch[2] : "6";

            if (spell.level === 0 && spell.damage.scalesWithLevel) {
              diceCount = getCantripDiceCount(caster.level);
            }

            const result = parseDiceString(`${diceCount}d${diceSides}`);
            let dmg = result.total;
            if (saveSuccess) dmg = Math.floor(dmg / 2); // half on save

            if (hasResistanceAll(targetConditions)) dmg = Math.floor(dmg / 2);
            serverDamage = (serverDamage || 0) + dmg;

            if (target.entityType === "character") {
              const ch = await ctx.db.get(target.entityId as Id<"characters">);
              if (ch && !ch.conditions.some(c => c.name === "dead")) {
                let rem = dmg;
                let tp = ch.tempHp;
                if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
                const newHp = Math.max(0, ch.hp - rem);
                const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
                if (newHp === 0 && ch.hp > 0) {
                  const conds = [...ch.conditions];
                  if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
                  if (!conds.some(c => c.name === "prone")) conds.push({ name: "prone" });
                  patch.conditions = conds;
                  patch.deathSaves = { successes: 0, failures: 0 };
                }
                if (ch.concentration && rem > 0) {
                  const dc = concentrationSaveDC(rem);
                  const mod = Math.floor((ch.abilities.constitution - 10) / 2);
                  if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
                    await removeConcentrationConditions(ctx, ch.concentration, target.entityId, combatants);
                    patch.concentration = undefined;
                  }
                }
                await ctx.db.patch(target.entityId as Id<"characters">, patch);
              }
            } else {
              const np = await ctx.db.get(target.entityId as Id<"npcs">);
              if (np) {
                const newHp = Math.max(0, np.hp - dmg);
                await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
                await checkNpcConcentration(ctx, np, target.entityId, dmg, combatants);
              }
            }
          }

          // Apply conditions on failed save (hold_person → paralyzed, etc.)
          // Wired through DR, cc_immune check, and boss CC resistance
          if (spell.conditions && !saveSuccess) {
            hitResult = true;
            if (target.entityType === "character") {
              const ch = await ctx.db.get(target.entityId as Id<"characters">);
              if (ch) {
                let conds = [...ch.conditions];
                for (const condName of spell.conditions) {
                  if (shouldBlockCc(ch.conditions.map(c => c.name), condName)) continue;
                  let dur = spellCcBaseDuration(spell);
                  // Apply diminishing returns
                  const targetDrTracker: DrTracker = combatants[tIdx].drTracker ?? {};
                  const drResult = applyDiminishingReturns(dur, condName, targetDrTracker, session.combat!.round);
                  dur = drResult.duration;
                  combatants[tIdx] = { ...combatants[tIdx], drTracker: drResult.updatedTracker };
                  if (dur <= 0) continue; // DR immunity
                  conds = applyOrReplaceCondition(conds, {
                    name: condName,
                    duration: dur,
                    source: spellSourceId,
                    ...(spell.saveType ? { saveDC: spellSaveDC, saveAbility: spell.saveType } : {}),
                  });
                }
                await ctx.db.patch(target.entityId as Id<"characters">, { conditions: conds });
              }
            } else {
              const np = await ctx.db.get(target.entityId as Id<"npcs">);
              if (np) {
                let conds = [...np.conditions];
                for (const condName of spell.conditions) {
                  if (shouldBlockCc(np.conditions.map(c => c.name), condName)) continue;
                  let dur = spellCcBaseDuration(spell);
                  // Apply diminishing returns
                  const targetDrTracker: DrTracker = combatants[tIdx].drTracker ?? {};
                  const drResult = applyDiminishingReturns(dur, condName, targetDrTracker, session.combat!.round);
                  dur = drResult.duration;
                  combatants[tIdx] = { ...combatants[tIdx], drTracker: drResult.updatedTracker };
                  if (dur <= 0) continue; // DR immunity
                  // Apply boss CC resistance
                  dur = applyCcResistance(dur, np.eliteRank as "elite" | "boss" | undefined);
                  conds = applyOrReplaceCondition(conds, {
                    name: condName,
                    duration: dur,
                    source: spellSourceId,
                    ...(spell.saveType ? { saveDC: spellSaveDC, saveAbility: spell.saveType } : {}),
                  });
                }
                await ctx.db.patch(target.entityId as Id<"npcs">, { conditions: conds });
              }
            }
          }
        }

        if (!hitResult && (spell.damage && (serverDamage || 0) > 0)) hitResult = true;

      // --- Healing spells (cure_wounds) ---
      } else if (spell.healing && args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (!target) throw new Error("Invalid target");

        const diceMatch = spell.healing.dice.match(/^(\d+)d(\d+)/);
        const diceCount = diceMatch ? parseInt(diceMatch[1]) : 1;
        const diceSides = diceMatch ? diceMatch[2] : "8";
        const result = parseDiceString(`${diceCount}d${diceSides}`);
        const castingMod = Math.floor((castingAbilityScore - 10) / 2);
        const healAmount = result.total + castingMod;
        serverDamage = -healAmount; // negative = healing

        if (target.entityType === "character") {
          const ch = await ctx.db.get(target.entityId as Id<"characters">);
          if (ch) {
            const derivedStats = await getEffectiveStats(ctx, target.entityId as Id<"characters">);
            const newHp = Math.min(derivedStats.effectiveMaxHp, ch.hp + healAmount);
            const patch: Record<string, unknown> = { hp: newHp };
            // Remove unconscious if healed from 0
            if (ch.hp === 0 && newHp > 0) {
              patch.conditions = ch.conditions.filter(c => c.name !== "unconscious");
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            await ctx.db.patch(target.entityId as Id<"characters">, patch);
          }
        }
        hitResult = true;

      // --- Auto-hit spells (magic_missile: 3 darts, 1d4+1 each) ---
      } else if (spell.id === "magic_missile" && args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (!target) throw new Error("Invalid target");

        const numDarts = 3; // 3 at level 1, +1 per slot above 1st
        let totalDmg = 0;
        for (let d = 0; d < numDarts; d++) {
          const dart = parseDiceString("1d4+1");
          totalDmg += dart.total;
        }
        serverDamage = totalDmg;

        if (target.entityType === "character") {
          const ch = await ctx.db.get(target.entityId as Id<"characters">);
          if (ch && !ch.conditions.some(c => c.name === "dead")) {
            let rem = totalDmg;
            let tp = ch.tempHp;
            if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
            const newHp = Math.max(0, ch.hp - rem);
            const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
            if (newHp === 0 && ch.hp > 0) {
              const conds = [...ch.conditions];
              if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
              if (!conds.some(c => c.name === "prone")) conds.push({ name: "prone" });
              patch.conditions = conds;
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            if (ch.concentration && rem > 0) {
              const dc = concentrationSaveDC(rem);
              const mod = Math.floor((ch.abilities.constitution - 10) / 2);
              if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
                await removeConcentrationConditions(ctx, ch.concentration, target.entityId, combatants);
                patch.concentration = undefined;
              }
            }
            await ctx.db.patch(target.entityId as Id<"characters">, patch);
          }
        } else {
          const np = await ctx.db.get(target.entityId as Id<"npcs">);
          if (np) {
            const newHp = Math.max(0, np.hp - totalDmg);
            await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
            await checkNpcConcentration(ctx, np, target.entityId, totalDmg, combatants);
          }
        }
        hitResult = true;
      }
      // Utility spells (shield, misty_step, haste, etc.) just consume the slot — effects tracked via concentration or conditions

      // Set concentration for concentration spells (uses spellSourceId for unique tracking)
      if (spell.concentration) {
        const concTarget = args.action.targetIndex !== undefined ? combatants[args.action.targetIndex]?.entityId : undefined;
        await ctx.db.patch(current.entityId as Id<"characters">, {
          concentration: { spellId: spellSourceId, ...(concTarget ? { targetId: concTarget } : {}) },
        });
      }
    }

    // ========== TECHNIQUE RESOLUTION (deterministic) ==========
    if (args.action.type === "technique" && args.action.techniqueId) {
      const technique = getTechniqueById(args.action.techniqueId);
      if (!technique) throw new Error("Unknown technique: " + args.action.techniqueId);

      if (!technique.contexts.includes("combat")) {
        throw new Error("Technique cannot be used in combat: " + args.action.techniqueId);
      }

      const combatEffects = technique.effects.combat;
      if (!combatEffects) throw new Error("Technique has no combat effects: " + args.action.techniqueId);

      // Check if caster can use techniques (silenced/confused blocks casting)
      if (!canCast(attackerConditions)) {
        throw new Error("Cannot use techniques due to conditions (silenced/confused)");
      }

      // Look up the skill definition for ability references
      const skill = getSkillById(technique.skillId);
      if (!skill) throw new Error("Unknown skill for technique: " + technique.skillId);

      // Get actor's ability score and skill tier
      let actorAbilityScore = 10;
      let actorTier = 0;
      let actorEntityType = current.entityType;
      let isFirstUse = false;
      let usesToday = 0;

      if (current.entityType === "character") {
        const char = await ctx.db.get(current.entityId as Id<"characters">);
        if (char) {
          actorAbilityScore = char.abilities[skill.baseAbility as keyof typeof char.abilities];
        }
      } else {
        const npc = await ctx.db.get(current.entityId as Id<"npcs">);
        if (npc) {
          actorAbilityScore = npc.abilities[skill.baseAbility as keyof typeof npc.abilities] ?? 10;
        }
      }

      // Look up actor's skill record
      const actorSkillRecord = await ctx.db
        .query("entitySkills")
        .withIndex("by_campaign_entity", (q) =>
          q
            .eq("campaignId", session.campaignId)
            .eq("entityId", current.entityId)
            .eq("entityType", actorEntityType),
        )
        .filter((q) => q.eq(q.field("skillId"), technique.skillId))
        .first();
      if (actorSkillRecord) {
        actorTier = actorSkillRecord.currentTier;
      }

      // Look up actor's entity technique record (for usage tracking)
      const actorTechniqueRecord = await ctx.db
        .query("entityTechniques")
        .withIndex("by_entity_technique", (q) =>
          q
            .eq("entityId", current.entityId)
            .eq("entityType", actorEntityType)
            .eq("techniqueId", args.action.techniqueId!),
        )
        .first();
      if (actorTechniqueRecord) {
        isFirstUse = actorTechniqueRecord.timesUsed === 0;
        usesToday = actorTechniqueRecord.usesToday;
      }

      // Calculate actor power
      const actorPower = calculateActorPower(actorTier, actorAbilityScore, technique.rollBonus);

      // Get target info (if targeted technique)
      let targetResistance = 0;
      let targetTier = 0;
      const hasTarget = args.action.targetIndex !== undefined;
      const target = hasTarget ? combatants[args.action.targetIndex!] : undefined;

      if (target) {
        let counterAbilityScore = 10;

        if (target.entityType === "character") {
          const targetChar = await ctx.db.get(target.entityId as Id<"characters">);
          if (targetChar) {
            counterAbilityScore = targetChar.abilities[skill.counterAbility as keyof typeof targetChar.abilities];
          }
        } else {
          const targetNpc = await ctx.db.get(target.entityId as Id<"npcs">);
          if (targetNpc) {
            counterAbilityScore = targetNpc.abilities[skill.counterAbility as keyof typeof targetNpc.abilities] ?? 10;
          }
        }

        // Look up target's counter-skill tier
        const targetSkillRecord = await ctx.db
          .query("entitySkills")
          .withIndex("by_campaign_entity", (q) =>
            q
              .eq("campaignId", session.campaignId)
              .eq("entityId", target.entityId)
              .eq("entityType", target.entityType),
          )
          .filter((q) => q.eq(q.field("skillId"), technique.skillId))
          .first();
        if (targetSkillRecord) {
          targetTier = targetSkillRecord.currentTier;
        }

        targetResistance = calculateTargetResistance(targetTier, counterAbilityScore);
      }

      // Determine potency
      const potency = determinePotency(actorPower, targetResistance);

      // Calculate scaled combat effects
      const scaledEffects = calculateEffects(technique.effects, "combat", potency);

      // Apply damage to target
      if (scaledEffects.damage && scaledEffects.damage > 0 && target) {
        let dmg = scaledEffects.damage;

        // Apply outgoing damage multiplier (weakened = 50%)
        dmg = Math.floor(dmg * getOutgoingDamageMultiplier(attackerConditions));

        // Apply vulnerability bonus (+50% if target has matching condition)
        {
          let targetConditionNames: string[] = [];
          if (target.entityType === "character") {
            const tc = await ctx.db.get(target.entityId as Id<"characters">);
            if (tc) targetConditionNames = tc.conditions.map(c => c.name);
          } else {
            const tn = await ctx.db.get(target.entityId as Id<"npcs">);
            if (tn) targetConditionNames = tn.conditions.map(c => c.name);
          }
          dmg = applyVulnerabilityBonus(dmg, targetConditionNames, technique.skillId);
        }

        // Apply combo chain bonus
        const lastTech = combatants[currentIndex].lastTechniqueUsed;
        const comboBonus = calculateComboBonus(
          args.action.techniqueId!,
          lastTech?.techniqueId,
          lastTech?.round,
          session.combat!.round,
        );
        dmg += comboBonus;

        serverDamage = (serverDamage || 0) + dmg;

        if (target.entityType === "character") {
          const ch = await ctx.db.get(target.entityId as Id<"characters">);
          if (ch && !ch.conditions.some(c => c.name === "dead")) {
            let rem = dmg;
            let tp = ch.tempHp;
            if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
            const newHp = Math.max(0, ch.hp - rem);
            const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
            if (newHp === 0 && ch.hp > 0) {
              const conds = [...ch.conditions];
              if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
              if (!conds.some(c => c.name === "prone")) conds.push({ name: "prone" });
              patch.conditions = conds;
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            if (ch.concentration && rem > 0) {
              const dc = concentrationSaveDC(rem);
              const mod = Math.floor((ch.abilities.constitution - 10) / 2);
              if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
                await removeConcentrationConditions(ctx, ch.concentration, target.entityId, combatants);
                patch.concentration = undefined;
              }
            }
            await ctx.db.patch(target.entityId as Id<"characters">, patch);
          }
        } else {
          const np = await ctx.db.get(target.entityId as Id<"npcs">);
          if (np) {
            const newHp = Math.max(0, np.hp - dmg);
            await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
            await checkNpcConcentration(ctx, np, target.entityId, dmg, combatants);
          }
        }

        // Remove breakOnDamage conditions (charmed, dominated break on damage)
        if (dmg > 0) {
          if (target.entityType === "character") {
            const ch = await ctx.db.get(target.entityId as Id<"characters">);
            if (ch) {
              const cleaned = removeConditionsOnDamage(ch.conditions);
              if (cleaned.length !== ch.conditions.length) {
                await ctx.db.patch(target.entityId as Id<"characters">, { conditions: cleaned });
              }
            }
          } else {
            const np = await ctx.db.get(target.entityId as Id<"npcs">);
            if (np) {
              const cleaned = removeConditionsOnDamage(np.conditions);
              if (cleaned.length !== np.conditions.length) {
                await ctx.db.patch(target.entityId as Id<"npcs">, { conditions: cleaned });
              }
            }
          }
        }

        hitResult = true;
      }

      // Apply healing to target (or self if no target)
      if (scaledEffects.healing && scaledEffects.healing > 0) {
        const healTarget = target || { entityId: current.entityId, entityType: current.entityType };
        const healAmount = scaledEffects.healing;
        serverDamage = (serverDamage || 0) - healAmount; // negative = healing

        if (healTarget.entityType === "character") {
          const ch = await ctx.db.get(healTarget.entityId as Id<"characters">);
          if (ch) {
            const derivedStats = await getEffectiveStats(ctx, healTarget.entityId as Id<"characters">);
            const newHp = Math.min(derivedStats.effectiveMaxHp, ch.hp + healAmount);
            const patch: Record<string, unknown> = { hp: newHp };
            if (ch.hp === 0 && newHp > 0) {
              patch.conditions = ch.conditions.filter(c => c.name !== "unconscious");
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            await ctx.db.patch(healTarget.entityId as Id<"characters">, patch);
          }
        }
        hitResult = true;
      }

      // Apply temp HP to actor
      if (scaledEffects.tempHp && scaledEffects.tempHp > 0) {
        if (current.entityType === "character") {
          const ch = await ctx.db.get(current.entityId as Id<"characters">);
          if (ch) {
            const newTempHp = Math.max(ch.tempHp, scaledEffects.tempHp);
            await ctx.db.patch(current.entityId as Id<"characters">, { tempHp: newTempHp });
          }
        }
      }

      // Apply AC bonus (as a temporary condition on actor)
      if (scaledEffects.acBonus && scaledEffects.acBonus > 0) {
        // Use specific condition name based on bonus value (capped at 3)
        const bonusLevel = Math.min(3, Math.max(1, scaledEffects.acBonus));
        const acConditionName = `technique_ac_bonus_${bonusLevel}`;
        if (current.entityType === "character") {
          const ch = await ctx.db.get(current.entityId as Id<"characters">);
          if (ch) {
            // Remove any existing technique AC bonus conditions
            const conds = ch.conditions.filter(c => !c.name.startsWith("technique_ac_bonus"));
            conds.push({ name: acConditionName, duration: 1, source: args.action.techniqueId! });
            await ctx.db.patch(current.entityId as Id<"characters">, { conditions: conds });
          }
        } else {
          // NPCs can also gain AC bonus from techniques
          const npc = await ctx.db.get(current.entityId as Id<"npcs">);
          if (npc) {
            const conds = npc.conditions.filter(c => !c.name.startsWith("technique_ac_bonus"));
            conds.push({ name: acConditionName, duration: 1, source: args.action.techniqueId! });
            await ctx.db.patch(current.entityId as Id<"npcs">, { conditions: conds });
          }
        }
      }

      // Check if target has CC immunity
      let targetHasCcImmunity = false;
      if (target) {
        if (target.entityType === "character") {
          const tc = await ctx.db.get(target.entityId as Id<"characters">);
          if (tc) targetHasCcImmunity = tc.conditions.some(c => c.name === "cc_immune");
        } else {
          const tn = await ctx.db.get(target.entityId as Id<"npcs">);
          if (tn) targetHasCcImmunity = tn.conditions.some(c => c.name === "cc_immune");
        }
      }

      // Apply condition to target
      if (scaledEffects.condition && scaledEffects.condition !== "" && target && !targetHasCcImmunity) {
        const condName = scaledEffects.condition;

        // Calculate CC duration from potency + diminishing returns
        const ccCategory = CC_CATEGORIES[condName];
        let condDuration = potencyToCcDuration(potency);

        if (ccCategory && condDuration > 0) {
          // Apply diminishing returns
          const targetDrTracker: DrTracker = combatants[args.action.targetIndex!].drTracker ?? {};
          const drResult = applyDiminishingReturns(condDuration, condName, targetDrTracker, session.combat!.round);
          condDuration = drResult.duration;
          // Update DR tracker on combatant
          combatants[args.action.targetIndex!] = {
            ...combatants[args.action.targetIndex!],
            drTracker: drResult.updatedTracker,
          };
        }

        // Only apply condition if duration > 0 (DR may grant immunity)
        if (condDuration > 0) {
          if (target.entityType === "character") {
            const ch = await ctx.db.get(target.entityId as Id<"characters">);
            if (ch) {
              const conds = applyOrReplaceCondition(ch.conditions, {
                name: condName, duration: condDuration, source: args.action.techniqueId!,
              });
              await ctx.db.patch(target.entityId as Id<"characters">, { conditions: conds });
            }
          } else {
            const np = await ctx.db.get(target.entityId as Id<"npcs">);
            if (np) {
              // Apply boss CC resistance for NPC targets
              condDuration = applyCcResistance(condDuration, np.eliteRank as "elite" | "boss" | undefined);
              const conds = applyOrReplaceCondition(np.conditions, {
                name: condName, duration: condDuration, source: args.action.techniqueId!,
              });
              await ctx.db.patch(target.entityId as Id<"npcs">, { conditions: conds });
            }
          }
          hitResult = true;
        }
      }

      // Record technique use and award XP
      if (actorTechniqueRecord) {
        let updatedUsesToday = actorTechniqueRecord.usesToday;
        let updatedLastDayReset = actorTechniqueRecord.lastDayReset;
        const currentDay = Math.floor(Date.now() / 86400000);
        if (currentDay !== updatedLastDayReset) {
          updatedUsesToday = 0;
          updatedLastDayReset = currentDay;
        }
        updatedUsesToday += 1;

        await ctx.db.patch(actorTechniqueRecord._id, {
          timesUsed: actorTechniqueRecord.timesUsed + 1,
          lastUsedAt: Date.now(),
          usesToday: updatedUsesToday,
          lastDayReset: updatedLastDayReset,
        });

        // Calculate and award XP
        const xpAmount = calculateXpAward({
          isFirstUse,
          targetTierHigher: targetTier > actorTier,
          potency,
          usesToday: updatedUsesToday,
          techniqueTier: technique.tierRequired,
          actorTier,
        });

        if (xpAmount > 0 && actorSkillRecord) {
          let { practiceXp, currentTier: skillTier, ceiling } = actorSkillRecord;
          practiceXp += xpAmount;

          // Auto tier-up loop (uses shared canTierUp + XP_THRESHOLDS)
          while (canTierUp(practiceXp, skillTier, ceiling)) {
            practiceXp -= XP_THRESHOLDS[skillTier]!;
            skillTier += 1;
          }

          const xpToNextTier = XP_THRESHOLDS[skillTier] ?? 0;
          await ctx.db.patch(actorSkillRecord._id, {
            practiceXp,
            currentTier: skillTier,
            xpToNextTier,
          });
        }
      }

      // Track last technique used for combo chain tracking
      combatants[currentIndex] = {
        ...combatants[currentIndex],
        lastTechniqueUsed: {
          techniqueId: args.action.techniqueId!,
          round: session.combat!.round,
        },
      };

      // Set serverRoll to actorPower for display purposes (no dice roll in technique)
      serverRoll = actorPower;
    }

    // ========== CC BREAK ACTION ==========
    if (args.action.type === "cc_break") {
      if (current.entityType !== "character") throw new Error("Only characters can use CC break");
      const char = await ctx.db.get(current.entityId as Id<"characters">);
      if (!char) throw new Error("Character not found");

      const cls = (char.class || "").toLowerCase();
      const ccBreak = getCcBreakFeature(cls, char.level);
      if (!ccBreak) throw new Error("No CC break ability available for this class/level");

      // Check cooldown
      const cooldowns = combatants[currentIndex].ccBreakCooldowns ?? {};
      const lastUsedRound = cooldowns["cc_break"] ?? -999;
      if (ccBreak.cooldownRounds > 0 && (session.combat!.round - lastUsedRound < ccBreak.cooldownRounds)) {
        throw new Error("CC break is on cooldown");
      }

      // Check resource cost
      if (ccBreak.resourceCost) {
        const resource = char.classResources?.[ccBreak.resourceCost.resource];
        if (!resource || resource.current < ccBreak.resourceCost.amount) {
          throw new Error(`Not enough ${ccBreak.resourceCost.resource} for CC break`);
        }
        // Consume resource
        await ctx.db.patch(current.entityId as Id<"characters">, {
          classResources: {
            ...char.classResources,
            [ccBreak.resourceCost.resource]: {
              max: resource.max,
              current: resource.current - ccBreak.resourceCost.amount,
            },
          },
        });
      }

      // Check raging requirement
      if (ccBreak.requiresRaging && !char.conditions.some(c => c.name === "raging")) {
        throw new Error("Must be raging to use this CC break");
      }

      // Remove matching CC conditions
      const updatedConditions = char.conditions.filter(c => {
        const cat = CC_CATEGORIES[c.name];
        return !(cat && ccBreak.breaksCategories.includes(cat));
      });

      // Grant stealth if applicable (rogue)
      if (ccBreak.grantsStealthOnUse) {
        if (!updatedConditions.some(c => c.name === "hidden")) {
          updatedConditions.push({ name: "hidden", duration: 1, source: "slip_free" });
        }
      }

      // Grant brief CC immunity (1 round)
      if (!updatedConditions.some(c => c.name === "cc_immune")) {
        updatedConditions.push({ name: "cc_immune", duration: 1, source: "cc_break" });
      }

      await ctx.db.patch(current.entityId as Id<"characters">, { conditions: updatedConditions });

      // Record cooldown
      combatants[currentIndex] = {
        ...combatants[currentIndex],
        ccBreakCooldowns: {
          ...cooldowns,
          cc_break: session.combat!.round,
        },
      };

      // Consume the appropriate action resource
      if (ccBreak.actionCost === "reaction") {
        combatants[currentIndex] = { ...combatants[currentIndex], hasReaction: false };
      } else if (ccBreak.actionCost === "bonus_action") {
        combatants[currentIndex] = { ...combatants[currentIndex], hasBonusAction: false };
      }
      // "free" and "passive" don't consume anything

      hitResult = true;
    }

    // ========== IRON WILL (universal CC break, once per combat) ==========
    if (args.action.type === "iron_will") {
      if (current.entityType !== "character") throw new Error("Only characters can use Iron Will");
      const char = await ctx.db.get(current.entityId as Id<"characters">);
      if (!char) throw new Error("Character not found");

      if (combatants[currentIndex].ironWillUsed) {
        throw new Error("Iron Will already used this combat");
      }

      // Remove ALL CC conditions
      const updatedConditions = char.conditions.filter(c => {
        return CC_CATEGORIES[c.name] === undefined;
      });

      // Grant CC immunity for 1 round
      if (!updatedConditions.some(c => c.name === "cc_immune")) {
        updatedConditions.push({ name: "cc_immune", duration: 1, source: "iron_will" });
      }

      await ctx.db.patch(current.entityId as Id<"characters">, { conditions: updatedConditions });

      // Mark Iron Will as used
      combatants[currentIndex] = {
        ...combatants[currentIndex],
        ironWillUsed: true,
      };

      // Iron Will is a free action — doesn't consume action/bonus/reaction
      hitResult = true;
    }

    // ========== HANDLE ACTION TYPE → CONSUME RESOURCES ==========
    if (args.action.type === "dash") {
      // Cunning Action: rogues use bonus action for dash
      if (isCunningAction) {
        combatants[currentIndex] = { ...current, hasBonusAction: false, movementRemaining: current.movementRemaining * 2 };
      } else {
        combatants[currentIndex] = { ...current, hasAction: false, movementRemaining: current.movementRemaining * 2 };
      }
    } else if (args.action.type === "dodge") {
      // Apply dodging condition (now mechanically recognized — gives attackedDisadvantage)
      if (current.entityType === "character") {
        const char = await ctx.db.get(current.entityId as Id<"characters">);
        if (char) {
          const conditions = [...char.conditions];
          conditions.push({ name: "dodging", duration: 1, source: "dodge_action" });
          await ctx.db.patch(current.entityId as Id<"characters">, { conditions });
        }
      }
      combatants[currentIndex] = { ...current, hasAction: false };
    } else if (args.action.type === "disengage") {
      // Apply "disengaged" condition to prevent opportunity attacks this turn
      if (current.entityType === "character") {
        const char = await ctx.db.get(current.entityId as Id<"characters">);
        if (char) {
          const conditions = [...char.conditions];
          if (!conditions.some(c => c.name === "disengaged")) {
            conditions.push({ name: "disengaged", duration: 1, source: "disengage" });
            await ctx.db.patch(current.entityId as Id<"characters">, { conditions });
          }
        }
      } else {
        const npc = await ctx.db.get(current.entityId as Id<"npcs">);
        if (npc) {
          const conditions = [...npc.conditions];
          if (!conditions.some(c => c.name === "disengaged")) {
            conditions.push({ name: "disengaged", duration: 1, source: "disengage" });
            await ctx.db.patch(current.entityId as Id<"npcs">, { conditions });
          }
        }
      }
      if (isCunningAction) {
        combatants[currentIndex] = { ...current, hasBonusAction: false };
      } else {
        combatants[currentIndex] = { ...current, hasAction: false };
      }

    } else if (args.action.type === "hide") {
      // Cunning Action: rogues use bonus action for hide
      if (isCunningAction) {
        combatants[currentIndex] = { ...current, hasBonusAction: false };
      } else {
        combatants[currentIndex] = { ...current, hasAction: false };
      }

    // --- Bonus Actions ---
    } else if (args.action.type === "second_wind") {
      // Fighter: 1d10 + level HP, consumes bonus action + resource
      if (current.entityType !== "character") throw new Error("Only characters can use Second Wind");
      const char = await ctx.db.get(current.entityId as Id<"characters">);
      if (!char) throw new Error("Character not found");
      const swResource = char.classResources?.secondWind;
      if (!swResource || swResource.current <= 0) throw new Error("No Second Wind uses remaining");

      const healRoll = parseDiceString("1d10");
      const healAmount = healRoll.total + char.level;
      const derivedStats = await getEffectiveStats(ctx, current.entityId as Id<"characters">);
      const newHp = Math.min(derivedStats.effectiveMaxHp, char.hp + healAmount);
      await ctx.db.patch(current.entityId as Id<"characters">, {
        hp: newHp,
        classResources: {
          ...char.classResources,
          secondWind: { max: swResource.max, current: swResource.current - 1 },
        },
      });
      serverDamage = -healAmount;
      hitResult = true;
      combatants[currentIndex] = { ...current, hasBonusAction: false };

    } else if (args.action.type === "action_surge") {
      // Fighter: regain action this turn, consumes resource (not an action itself)
      if (current.entityType !== "character") throw new Error("Only characters can use Action Surge");
      const char = await ctx.db.get(current.entityId as Id<"characters">);
      if (!char) throw new Error("Character not found");
      const asResource = char.classResources?.actionSurge;
      if (!asResource || asResource.current <= 0) throw new Error("No Action Surge uses remaining");

      await ctx.db.patch(current.entityId as Id<"characters">, {
        classResources: {
          ...char.classResources,
          actionSurge: { max: asResource.max, current: asResource.current - 1 },
        },
      });
      // Restore the action (already consumed or not — just grant a fresh one)
      combatants[currentIndex] = { ...current, hasAction: true };
      hitResult = true;

    } else if (args.action.type === "spell" && getSpellById(args.action.spellId || "")?.castingTime === "bonus_action") {
      // Bonus action spell (misty_step, etc.) — already resolved above, just consume bonus action
      combatants[currentIndex] = { ...current, hasBonusAction: false };
    } else {
      // Default: consume standard action
      combatants[currentIndex] = { ...current, hasAction: false };
    }

    await ctx.db.patch(args.sessionId, {
      combat: {
        ...session.combat,
        combatants,
      },
      lastActionAt: Date.now(),
    });

    return {
      success: true,
      actionType: args.action.type,
      roll: serverRoll,
      damage: serverDamage,
      hit: hitResult,
      critical: isCrit,
      ...(attackResults.length > 1 ? { attacks: attackResults } : {}),
      ...(args.action.spellId ? { spellId: args.action.spellId } : {}),
      ...(args.action.techniqueId ? { techniqueId: args.action.techniqueId } : {}),
    };
  },
});

export const move = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    combatantIndex: v.number(),
    path: v.array(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    await requireCampaignMember(ctx, session.campaignId);

    const combatants = [...session.combat.combatants];
    const combatant = combatants[args.combatantIndex];

    if (!combatant) {
      throw new Error("Invalid combatant");
    }

    // Check if combatant can move (grappled, restrained, etc.)
    let entityConditions: string[] = [];
    if (combatant.entityType === "character") {
      const char = await ctx.db.get(combatant.entityId as Id<"characters">);
      if (char) entityConditions = char.conditions.map(c => c.name);
    } else {
      const npc = await ctx.db.get(combatant.entityId as Id<"npcs">);
      if (npc) entityConditions = npc.conditions.map(c => c.name);
    }

    if (!canMove(entityConditions)) {
      throw new Error("Cannot move due to conditions");
    }

    // Calculate movement cost (5ft per cell, difficult terrain = 10ft)
    let movementCost = 0;
    if (session.locationId) {
      const location = await ctx.db.get(session.locationId);
      for (let i = 1; i < args.path.length; i++) {
        const cell = location?.gridData?.cells.find(
          c => c.x === args.path[i].x && c.y === args.path[i].y
        );
        movementCost += cell?.terrain === "difficult" ? 10 : 5;
      }
    } else {
      movementCost = (args.path.length - 1) * 5;
    }

    if (movementCost > combatant.movementRemaining) {
      throw new Error("Insufficient movement");
    }

    // ========== OPPORTUNITY ATTACKS ==========
    // When a combatant leaves an enemy's melee range, the enemy may make an
    // opportunity attack (single melee attack roll) if it has its reaction.
    // Disengage action prevents all opportunity attacks for the rest of the turn.

    // Check if mover used Disengage — skip all opportunity attacks
    let moverDisengaged = false;
    let moverConditions: string[] = [];
    if (combatant.entityType === "character") {
      const moverChar = await ctx.db.get(combatant.entityId as Id<"characters">);
      if (moverChar) {
        moverConditions = moverChar.conditions.map(c => c.name);
        if (moverConditions.includes("disengaged")) moverDisengaged = true;
      }
    } else {
      const moverNpc = await ctx.db.get(combatant.entityId as Id<"npcs">);
      if (moverNpc) {
        moverConditions = moverNpc.conditions.map(c => c.name);
        if (moverConditions.includes("disengaged")) moverDisengaged = true;
      }
    }

    const opportunityAttacks: Array<{
      attackerIndex: number;
      attackerName: string;
      hit: boolean;
      damage: number;
      roll: number;
    }> = [];

    for (let step = 0; step < args.path.length - 1; step++) {
      if (moverDisengaged) break; // Disengage prevents all opportunity attacks

      const from = args.path[step];
      const to = args.path[step + 1];

      for (let ei = 0; ei < combatants.length; ei++) {
        if (ei === args.combatantIndex) continue;

        const enemy = combatants[ei];

        // Enemies are the opposite entityType (characters vs NPCs)
        if (enemy.entityType === combatant.entityType) continue;

        // Enemy must have reaction available
        if (!enemy.hasReaction) continue;

        // Check if the mover was adjacent to this enemy (distance <= 1)
        const distFrom = Math.abs(from.x - enemy.position.x) + Math.abs(from.y - enemy.position.y);
        if (distFrom > 1) continue;

        // Check if the mover is moving AWAY (new distance > 1)
        const distTo = Math.abs(to.x - enemy.position.x) + Math.abs(to.y - enemy.position.y);
        if (distTo <= 1) continue;

        // Check if the enemy can act (not incapacitated, stunned, etc.)
        let enemyConditions: string[] = [];
        if (enemy.entityType === "character") {
          const ec = await ctx.db.get(enemy.entityId as Id<"characters">);
          if (ec) enemyConditions = ec.conditions.map(c => c.name);
        } else {
          const en = await ctx.db.get(enemy.entityId as Id<"npcs">);
          if (en) enemyConditions = en.conditions.map(c => c.name);
        }
        if (!canAct(enemyConditions)) continue;

        // Check the enemy is alive
        let enemyAlive = true;
        if (enemy.entityType === "character") {
          const ec = await ctx.db.get(enemy.entityId as Id<"characters">);
          if (!ec || ec.hp <= 0) enemyAlive = false;
        } else {
          const en = await ctx.db.get(enemy.entityId as Id<"npcs">);
          if (!en || !en.isAlive) enemyAlive = false;
        }
        if (!enemyAlive) continue;

        // --- Resolve the opportunity attack ---
        // Consume the enemy's reaction
        combatants[ei] = { ...combatants[ei], hasReaction: false };

        // Get enemy's attack bonus
        let attackBonus = 0;
        let enemyName = "Enemy";
        if (enemy.entityType === "character") {
          const stats = await getEffectiveStats(ctx, enemy.entityId as Id<"characters">);
          attackBonus = stats.attackBonus;
          const ec = await ctx.db.get(enemy.entityId as Id<"characters">);
          if (ec) enemyName = ec.name;
        } else {
          const en = await ctx.db.get(enemy.entityId as Id<"npcs">);
          if (en) {
            attackBonus = getNpcAttackBonus(en);
            enemyName = en.name;
          }
        }

        // Get mover's AC
        let moverAc = 10;
        if (combatant.entityType === "character") {
          const ms = await getEffectiveStats(ctx, combatant.entityId as Id<"characters">);
          moverAc = ms.effectiveAc;
        } else {
          const mn = await ctx.db.get(combatant.entityId as Id<"npcs">);
          if (mn) moverAc = mn.ac;
        }

        // Apply cover bonus to mover's AC for the OA
        if (session.locationId) {
          const location = await ctx.db.get(session.locationId);
          if (location?.gridData) {
            const moverCell = location.gridData.cells.find(
              c => c.x === from.x && c.y === from.y
            );
            if (moverCell?.cover === "half") moverAc += 2;
            else if (moverCell?.cover === "three-quarters") moverAc += 5;
            // Full cover: mover in full cover can't be OA'd (skip)
            if (moverCell?.cover === "full") continue;
          }
        }

        // Apply condition-based AC modifier (e.g. armor_broken = -3, technique_ac_bonus = +1/2/3)
        moverAc += getAcModifier(moverConditions);

        // Roll d20 + attack bonus (no advantage/disadvantage for opportunity attacks)
        const naturalRoll = Math.floor(Math.random() * 20) + 1;
        const rollTotal = naturalRoll + attackBonus;
        const isCrit = naturalRoll === 20;

        if (naturalRoll === 1 || (!isCrit && rollTotal < moverAc)) {
          // Miss
          opportunityAttacks.push({
            attackerIndex: ei,
            attackerName: enemyName,
            hit: false,
            damage: 0,
            roll: rollTotal,
          });
          continue;
        }

        // Hit — calculate damage
        let damageDice = "1d8";
        let damageBonus = 0;
        if (enemy.entityType === "character") {
          const ec = await ctx.db.get(enemy.entityId as Id<"characters">);
          if (ec) {
            const stats = await getEffectiveStats(ctx, enemy.entityId as Id<"characters">);
            damageBonus = stats.abilityModifiers.strength;
            const weapon = await ctx.db
              .query("items")
              .withIndex("by_owner", (q) => q.eq("ownerId", enemy.entityId as Id<"characters">))
              .filter((q) =>
                q.and(
                  q.eq(q.field("status"), "equipped"),
                  q.eq(q.field("equippedSlot"), "mainHand")
                )
              )
              .first();
            if (weapon?.stats.damage) damageDice = weapon.stats.damage;
          }
        } else {
          const en = await ctx.db.get(enemy.entityId as Id<"npcs">);
          if (en) damageDice = getNpcDamageDice(en);
        }

        const damageResult = parseDiceString(damageDice);
        let oaDamage = damageResult.total + damageBonus;
        if (isCrit) {
          oaDamage += parseDiceString(damageDice).total;
        }

        // Apply resistance if mover has resistance all (petrified)
        if (hasResistanceAll(entityConditions)) {
          oaDamage = Math.floor(oaDamage / 2);
        }

        // Apply damage to the moving combatant
        if (combatant.entityType === "character") {
          const ch = await ctx.db.get(combatant.entityId as Id<"characters">);
          if (ch && !ch.conditions.some(c => c.name === "dead")) {
            // Damage at 0 HP → automatic death save failures (crit = 2)
            if (ch.hp === 0) {
              const ds = { ...ch.deathSaves };
              ds.failures = Math.min(3, ds.failures + (isCrit ? 2 : 1));
              const patch: Record<string, unknown> = { deathSaves: ds };
              if (ds.failures >= 3) {
                const conds = ch.conditions.filter(c => c.name !== "unconscious");
                conds.push({ name: "dead" });
                patch.conditions = conds;
              }
              await ctx.db.patch(combatant.entityId as Id<"characters">, patch);
            } else {
              let remainingDamage = oaDamage;
              let newTempHp = ch.tempHp;
              if (newTempHp > 0) {
                const absorbed = Math.min(newTempHp, remainingDamage);
                newTempHp -= absorbed;
                remainingDamage -= absorbed;
              }
              const newHp = Math.max(0, ch.hp - remainingDamage);
              const patch: Record<string, unknown> = { hp: newHp, tempHp: newTempHp };
              if (newHp === 0 && ch.hp > 0) {
                const currentConditions = [...ch.conditions];
                if (!currentConditions.some(c => c.name === "unconscious")) {
                  currentConditions.push({ name: "unconscious" });
                }
                if (!currentConditions.some(c => c.name === "prone")) {
                  currentConditions.push({ name: "prone" });
                }
                patch.conditions = currentConditions;
                patch.deathSaves = { successes: 0, failures: 0 };
              }
              if (ch.concentration && remainingDamage > 0) {
                const conSaveDC = concentrationSaveDC(remainingDamage);
                const conMod = Math.floor((ch.abilities.constitution - 10) / 2);
                const conSave = Math.floor(Math.random() * 20) + 1 + conMod + ch.proficiencyBonus;
                if (conSave < conSaveDC) {
                  await removeConcentrationConditions(ctx, ch.concentration, combatant.entityId, combatants);
                  patch.concentration = undefined;
                }
              }
              await ctx.db.patch(combatant.entityId as Id<"characters">, patch);
            }
          }
        } else {
          const mn = await ctx.db.get(combatant.entityId as Id<"npcs">);
          if (mn) {
            const newHp = Math.max(0, mn.hp - oaDamage);
            await ctx.db.patch(combatant.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
            await checkNpcConcentration(ctx, mn, combatant.entityId, oaDamage, combatants);
          }
        }

        // Remove breakOnDamage conditions (charmed, dominated break on damage)
        if (oaDamage > 0) {
          if (combatant.entityType === "character") {
            const ch = await ctx.db.get(combatant.entityId as Id<"characters">);
            if (ch) {
              const cleaned = removeConditionsOnDamage(ch.conditions);
              if (cleaned.length !== ch.conditions.length) {
                await ctx.db.patch(combatant.entityId as Id<"characters">, { conditions: cleaned });
              }
            }
          } else {
            const np = await ctx.db.get(combatant.entityId as Id<"npcs">);
            if (np) {
              const cleaned = removeConditionsOnDamage(np.conditions);
              if (cleaned.length !== np.conditions.length) {
                await ctx.db.patch(combatant.entityId as Id<"npcs">, { conditions: cleaned });
              }
            }
          }
        }

        opportunityAttacks.push({
          attackerIndex: ei,
          attackerName: enemyName,
          hit: true,
          damage: oaDamage,
          roll: rollTotal,
        });
      }
    }

    // Update position to final destination
    const destination = args.path[args.path.length - 1];
    combatants[args.combatantIndex] = {
      ...combatants[args.combatantIndex],
      position: destination,
      movementRemaining: combatant.movementRemaining - movementCost,
    };

    await ctx.db.patch(args.sessionId, {
      combat: {
        ...session.combat,
        combatants,
      },
      lastActionAt: Date.now(),
    });

    return {
      newPosition: destination,
      movementRemaining: combatant.movementRemaining - movementCost,
      opportunityAttacks,
    };
  },
});

export const endTurn = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    await requireCampaignMember(ctx, session.campaignId);

    const combat = session.combat;
    const combatants = [...combat.combatants];

    // Process end-of-turn condition durations for current combatant
    const currentCombatant = combatants[combat.currentTurnIndex];
    if (currentCombatant.entityType === "character") {
      const char = await ctx.db.get(currentCombatant.entityId as Id<"characters">);
      if (char) {
        let updatedConditions = processConditionDurations(
          char.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            saveDC: c.saveDC,
            saveAbility: c.saveAbility,
            expiresOn: "end" as const,
          })),
          "end",
        );
        // Repeated saves at end of turn (D&D 5e: "at the end of each of its turns")
        const { kept } = processRepeatedSaves(
          updatedConditions,
          char.abilities as unknown as Record<string, number>,
          char.proficiencyBonus,
        );
        updatedConditions = kept;
        await ctx.db.patch(currentCombatant.entityId as Id<"characters">, {
          conditions: updatedConditions.map(serializeCondition),
        });
      }
    } else {
      const npc = await ctx.db.get(currentCombatant.entityId as Id<"npcs">);
      if (npc) {
        let updatedConditions = processConditionDurations(
          npc.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            saveDC: c.saveDC,
            saveAbility: c.saveAbility,
            expiresOn: "end" as const,
          })),
          "end",
        );
        // Repeated saves at end of turn for NPC (estimated proficiency from level)
        const npcProfBonus = Math.max(2, Math.floor((npc.level - 1) / 4) + 2);
        const { kept: npcKept } = processRepeatedSaves(
          updatedConditions,
          npc.abilities as unknown as Record<string, number>,
          npcProfBonus,
        );
        updatedConditions = npcKept;
        await ctx.db.patch(currentCombatant.entityId as Id<"npcs">, {
          conditions: updatedConditions.map(serializeCondition),
        });
      }
    }

    let nextIndex = combat.currentTurnIndex + 1;
    let round = combat.round;

    // Wrap around to start of turn order
    if (nextIndex >= combatants.length) {
      nextIndex = 0;
      round += 1;
    }

    // Get next combatant's effective speed
    const nextCombatant = combatants[nextIndex];
    let speed = 30;
    let nextConditions: string[] = [];
    if (nextCombatant.entityType === "character") {
      try {
        const stats = await getEffectiveStats(ctx, nextCombatant.entityId as Id<"characters">);
        speed = stats.effectiveSpeed;
      } catch { /* default 30 */ }
      const char = await ctx.db.get(nextCombatant.entityId as Id<"characters">);
      if (char) nextConditions = char.conditions.map(c => c.name);
    } else {
      const npc = await ctx.db.get(nextCombatant.entityId as Id<"npcs">);
      if (npc) nextConditions = npc.conditions.map(c => c.name);
    }

    // Apply condition-based speed reduction
    speed = getEffectiveSpeed(speed, nextConditions);

    // Passive CC break processing (Barbarian Rage Break, Ranger Nature's Stride)
    if (nextCombatant.entityType === "character") {
      const charForCcBreak = await ctx.db.get(nextCombatant.entityId as Id<"characters">);
      if (charForCcBreak) {
        const cls = (charForCcBreak.class || "").toLowerCase();
        const ccBreak = getCcBreakFeature(cls, charForCcBreak.level);
        if (ccBreak && ccBreak.actionCost === "passive") {
          // Check raging requirement
          const canUse = !ccBreak.requiresRaging || charForCcBreak.conditions.some(c => c.name === "raging");
          if (canUse) {
            const cleanedConditions = charForCcBreak.conditions.filter(c => {
              const cat = CC_CATEGORIES[c.name];
              return !(cat && ccBreak.breaksCategories.includes(cat));
            });
            if (cleanedConditions.length !== charForCcBreak.conditions.length) {
              await ctx.db.patch(nextCombatant.entityId as Id<"characters">, { conditions: cleanedConditions });
            }
          }
        }
      }
    }

    // Process start-of-turn for next combatant
    if (nextCombatant.entityType === "character") {
      const char = await ctx.db.get(nextCombatant.entityId as Id<"characters">);
      if (char) {
        // Process start-of-turn condition durations
        let updatedConditions = processConditionDurations(
          char.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            saveDC: c.saveDC,
            saveAbility: c.saveAbility,
            expiresOn: "start" as const,
          })),
          "start",
        );

        const patch: Record<string, unknown> = {
          conditions: updatedConditions.map(serializeCondition),
        };

        // === DoT damage at start of turn ===
        const dotDmg = getDotDamage(char.conditions.map(c => c.name));
        const isDead = char.conditions.some(c => c.name === "dead");
        if (dotDmg > 0 && char.hp > 0 && !isDead) {
          let rem = dotDmg;
          let tp = (patch.tempHp as number | undefined) ?? char.tempHp;
          if (tp > 0) {
            const absorbed = Math.min(tp, rem);
            tp -= absorbed;
            rem -= absorbed;
            patch.tempHp = tp;
          }
          const newHp = Math.max(0, char.hp - rem);
          patch.hp = newHp;
          // DoT dropping to 0 HP → unconscious and prone
          if (newHp === 0 && char.hp > 0) {
            const condsList = (patch.conditions as ReturnType<typeof serializeCondition>[]);
            if (!condsList.some(c => c.name === "unconscious")) {
              condsList.push({ name: "unconscious" });
            }
            if (!condsList.some(c => c.name === "prone")) {
              condsList.push({ name: "prone" });
            }
            patch.conditions = condsList;
            patch.deathSaves = { successes: 0, failures: 0 };
          }
          // Concentration save from DoT damage
          if (char.concentration && rem > 0) {
            const dc = concentrationSaveDC(rem);
            const mod = Math.floor((char.abilities.constitution - 10) / 2);
            if (Math.floor(Math.random() * 20) + 1 + mod + char.proficiencyBonus < dc) {
              await removeConcentrationConditions(ctx, char.concentration, nextCombatant.entityId, combatants);
              patch.concentration = undefined;
            }
          }
        }

        // Death saves: if at 0 HP, roll death save
        if (char.hp === 0) {
          const ds = { ...char.deathSaves };

          // Skip if already stabilized or already dead
          if (ds.successes >= 3 || ds.failures >= 3) {
            await ctx.db.patch(nextCombatant.entityId as Id<"characters">, patch);
          } else {
            const deathRoll = Math.floor(Math.random() * 20) + 1;

            if (deathRoll === 20) {
              // Nat 20: regain 1 HP, remove unconscious
              patch.hp = 1;
              patch.deathSaves = { successes: 0, failures: 0 };
              patch.conditions = updatedConditions
                .filter(c => c.name !== "unconscious")
                .map(serializeCondition);
            } else if (deathRoll === 1) {
              // Nat 1: 2 failures
              ds.failures = Math.min(3, ds.failures + 2);
              patch.deathSaves = ds;
            } else if (deathRoll >= 10) {
              ds.successes = Math.min(3, ds.successes + 1);
              patch.deathSaves = ds;
            } else {
              ds.failures = Math.min(3, ds.failures + 1);
              patch.deathSaves = ds;
            }

            // If 3 failures: character dies — add "dead" condition, remove unconscious
            if (ds.failures >= 3) {
              const deathConditions = (patch.conditions as ReturnType<typeof serializeCondition>[]) ??
                updatedConditions.map(serializeCondition);
              patch.conditions = deathConditions
                .filter((c: { name: string }) => c.name !== "unconscious")
                .concat([{ name: "dead" }]);
            }

            await ctx.db.patch(nextCombatant.entityId as Id<"characters">, patch);
          }
        } else {
          await ctx.db.patch(nextCombatant.entityId as Id<"characters">, patch);
        }
      }
    }

    // Process start-of-turn for NPC
    if (nextCombatant.entityType === "npc") {
      const npc = await ctx.db.get(nextCombatant.entityId as Id<"npcs">);
      if (npc) {
        // Process start-of-turn condition durations for NPC
        let updatedConditions = processConditionDurations(
          npc.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            saveDC: c.saveDC,
            saveAbility: c.saveAbility,
            expiresOn: "start" as const,
          })),
          "start",
        );

        const npcPatch: Record<string, unknown> = {
          conditions: updatedConditions.map(serializeCondition),
        };

        // DoT damage at start of turn for NPC
        const dotDmg = getDotDamage(npc.conditions.map(c => c.name));
        if (dotDmg > 0 && npc.hp > 0) {
          const newHp = Math.max(0, npc.hp - dotDmg);
          npcPatch.hp = newHp;
          if (newHp === 0) {
            npcPatch.isAlive = false;
          }
          // Concentration save from DoT damage for NPC
          if (npc.concentration && dotDmg > 0) {
            const dc = concentrationSaveDC(dotDmg);
            const conMod = Math.floor((npc.abilities.constitution - 10) / 2);
            const npcProf = Math.max(2, Math.floor((npc.level - 1) / 4) + 2);
            if (Math.floor(Math.random() * 20) + 1 + conMod + npcProf < dc) {
              await removeConcentrationConditions(ctx, npc.concentration, nextCombatant.entityId, combatants);
              npcPatch.concentration = undefined;
            }
          }
        }

        await ctx.db.patch(nextCombatant.entityId as Id<"npcs">, npcPatch);
      }
    }

    // Reset turn resources for next combatant
    combatants[nextIndex] = {
      ...combatants[nextIndex],
      hasAction: true,
      hasBonusAction: true,
      hasReaction: true,
      movementRemaining: speed,
      turnStartedAt: Date.now(),
    };

    const now = Date.now();

    await ctx.db.patch(args.sessionId, {
      combat: {
        ...combat,
        combatants,
        currentTurnIndex: nextIndex,
        round,
        lastTurnStartedAt: now,
      },
      lastActionAt: now,
    });

    return {
      nextCombatant: combatants[nextIndex].entityId,
      round,
      turnIndex: nextIndex,
    };
  },
});

export const useSafeword = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    level: v.union(v.literal("yellow"), v.literal("red")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    await requireCampaignMember(ctx, session.campaignId);

    if (args.level === "red") {
      // RED = full stop, end combat immediately
      await ctx.db.patch(args.sessionId, {
        mode: "exploration",
        combat: undefined,
        lastActionAt: Date.now(),
      });
      return { ended: true, reason: "safeword_red" };
    } else {
      // YELLOW = pause combat
      await ctx.db.patch(args.sessionId, {
        combat: {
          ...session.combat,
          phase: "ending", // Use ending phase as pause state
        },
        lastActionAt: Date.now(),
      });
      return { ended: false, paused: true };
    }
  },
});

export const endCombat = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    outcome: v.union(v.literal("victory"), v.literal("defeat"), v.literal("flee"), v.literal("truce")),
    xpAwarded: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) {
      throw new Error("No active combat");
    }
    const { userId } = await requireCampaignMember(ctx, session.campaignId);

    // Award XP to player characters if specified
    if (args.xpAwarded && args.outcome === "victory") {
      const characters = session.combat.combatants.filter(
        (c) => c.entityType === "character"
      );
      const xpPerCharacter = Math.floor(args.xpAwarded / characters.length);

      for (const combatant of characters) {
        const character = await ctx.db.get(combatant.entityId as Id<"characters">);
        if (character) {
          await ctx.db.patch(combatant.entityId as Id<"characters">, {
            xp: character.xp + xpPerCharacter,
          });
        }
      }
    }

    // Copy final combatant positions back to exploration positions
    const explorationPositions = { ...(session.explorationPositions ?? {}) };
    for (const combatant of session.combat.combatants) {
      explorationPositions[combatant.entityId] = combatant.position;
    }

    await ctx.db.patch(args.sessionId, {
      mode: "exploration",
      combat: undefined,
      explorationPositions,
      lastActionAt: Date.now(),
    });

    await logAudit(ctx, userId, "combat.end", "gameSessions", session._id);

    return { outcome: args.outcome, xpAwarded: args.xpAwarded };
  },
});

// ============ ACTIONS (AI) ============

// Internal query for NPC turn (avoids circular reference in action)
export const _getCombatStateInternal = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) return null;

    const enrichedCombatants = await Promise.all(
      session.combat.combatants.map(async (combatant) => {
        if (combatant.entityType === "character") {
          const character = await ctx.db.get(combatant.entityId as Id<"characters">);
          if (!character) return { ...combatant, entity: null };
          const derivedStats = await getEffectiveStats(ctx, combatant.entityId as Id<"characters">);
          return {
            ...combatant,
            entity: { hp: character.hp, ac: derivedStats.effectiveAc },
          };
        } else {
          const npc = await ctx.db.get(combatant.entityId as Id<"npcs">);
          return { ...combatant, entity: npc ? { hp: npc.hp, ac: npc.ac } : null };
        }
      })
    );
    return { ...session.combat, combatants: enrichedCombatants };
  },
});

export const _getCurrentTurnInternal = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.combat) return null;
    const combat = session.combat;
    const now = Date.now();
    const timeRemaining = Math.max(0, combat.turnTimeoutMs - (now - combat.lastTurnStartedAt));
    return {
      combatant: combat.combatants[combat.currentTurnIndex],
      isTimedOut: timeRemaining === 0,
    };
  },
});

interface CombatantWithEntity {
  entityId: string;
  entityType: "character" | "npc";
  position: { x: number; y: number };
  entity: { hp: number; ac: number } | null;
  index: number;
}

export const executeNpcTurn = action({
  args: {
    sessionId: v.id("gameSessions"),
    npcIndex: v.number(),
  },
  handler: async (ctx, args): Promise<{ action: string; target?: number; roll?: number; damage?: number; hit?: boolean; destination?: { x: number; y: number } }> => {
    const combatState = await ctx.runQuery(api.game.combat._getCombatStateInternal, {
      sessionId: args.sessionId,
    });

    if (!combatState) {
      throw new Error("No active combat");
    }

    const npc = combatState.combatants[args.npcIndex];
    if (!npc || npc.entityType !== "npc") {
      throw new Error("Invalid NPC index");
    }

    // Simple AI: Find nearest enemy and attack, or move toward them
    const enemies: CombatantWithEntity[] = combatState.combatants
      .map((c: typeof combatState.combatants[0], i: number) => ({ ...c, index: i }))
      .filter((c: CombatantWithEntity) => c.entityType === "character" && c.entity && c.entity.hp > 0);

    if (enemies.length === 0) {
      await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });
      return { action: "no_targets" };
    }

    // Find nearest enemy
    const nearest = enemies.reduce((closest: CombatantWithEntity, enemy: CombatantWithEntity) => {
      const distToEnemy = Math.abs(enemy.position.x - npc.position.x) + Math.abs(enemy.position.y - npc.position.y);
      const distToClosest = Math.abs(closest.position.x - npc.position.x) + Math.abs(closest.position.y - npc.position.y);
      return distToEnemy < distToClosest ? enemy : closest;
    });

    const distance = Math.abs(nearest.position.x - npc.position.x) + Math.abs(nearest.position.y - npc.position.y);

    if (distance <= 1) {
      // Use the server-side attack resolution via executeAction
      // The mutation will handle the roll and damage using NPC stats
      await ctx.runMutation(api.game.combat.executeAction, {
        sessionId: args.sessionId,
        action: { type: "attack", targetIndex: nearest.index },
      });
      await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });
      return { action: "attack", target: nearest.index };
    } else {
      const dx = Math.sign(nearest.position.x - npc.position.x);
      const dy = Math.sign(nearest.position.y - npc.position.y);
      const movementCells = Math.min(6, distance - 1);

      const path = [npc.position];
      let currentX = npc.position.x;
      let currentY = npc.position.y;

      for (let i = 0; i < movementCells; i++) {
        if (Math.abs(nearest.position.x - currentX) > Math.abs(nearest.position.y - currentY)) {
          currentX += dx;
        } else {
          currentY += dy;
        }
        path.push({ x: currentX, y: currentY });
      }

      await ctx.runMutation(api.game.combat.move, {
        sessionId: args.sessionId,
        combatantIndex: args.npcIndex,
        path,
      });
      await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });
      return { action: "move", destination: path[path.length - 1] };
    }
  },
});

export const handleTurnTimeout = action({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args): Promise<{ skipped: boolean; combatant?: string; action?: string }> => {
    const currentTurn = await ctx.runQuery(api.game.combat._getCurrentTurnInternal, {
      sessionId: args.sessionId,
    });

    if (!currentTurn || !currentTurn.isTimedOut) {
      return { skipped: false };
    }

    await ctx.runMutation(api.game.combat.executeAction, {
      sessionId: args.sessionId,
      action: { type: "dodge", description: "Auto-dodge due to timeout" },
    });

    await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });

    return { skipped: true, combatant: currentTurn.combatant.entityId, action: "auto_dodge" };
  },
});
