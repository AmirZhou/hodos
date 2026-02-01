import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireCampaignMember } from "../lib/auth";
import { getEffectiveStats } from "../lib/statHelpers";
import { resolveAttackAdvantage, canAct, canMove, getEffectiveSpeed, isAutoCrit, hasResistanceAll, processConditionDurations, concentrationSaveDC } from "../lib/conditions";
import { getNpcAttackBonus, getNpcDamageDice } from "../lib/npcCombat";
import { parseDiceString } from "../lib/validation";
import { getExtraAttacks, getSneakAttackDice, getRageDamageBonus } from "../lib/classFeatures";
import { hasSpellSlot, getCastingAbility, getSpellSaveDC, getSpellAttackBonus, getCantripDiceCount } from "../lib/spells";
import { getSpellById } from "../data/spellData";

// Default turn timeout: 2 minutes
const DEFAULT_TURN_TIMEOUT_MS = 120000;

// ============ VALIDATORS ============

const combatantInput = v.object({
  entityId: v.string(),
  entityType: v.union(v.literal("character"), v.literal("npc")),
  position: v.object({ x: v.number(), y: v.number() }),
});

const actionType = v.union(
  v.literal("attack"),
  v.literal("spell"),
  v.literal("dodge"),
  v.literal("disengage"),
  v.literal("dash"),
  v.literal("help"),
  v.literal("hide"),
  v.literal("ready"),
  v.literal("use_item"),
  v.literal("second_wind"),
  v.literal("action_surge"),
  v.literal("other")
);

const combatAction = v.object({
  type: actionType,
  targetIndex: v.optional(v.number()),
  targetPosition: v.optional(v.object({ x: v.number(), y: v.number() })),
  weaponId: v.optional(v.string()),
  spellId: v.optional(v.string()),
  itemId: v.optional(v.string()),
  roll: v.optional(v.number()),
  damage: v.optional(v.number()),
  description: v.optional(v.string()),
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
      actions.push("attack", "dodge", "disengage", "dash", "help", "hide", "ready", "use_item");

      // Check for spells if character
      if (combatant.entityType === "character") {
        actions.push("spell");
      }
    }

    // Bonus actions (simplified - would be based on class features)
    if (combatant.hasBonusAction) {
      bonusActions.push("offhand_attack", "bonus_spell");
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
    await requireCampaignMember(ctx, session.campaignId);

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

    if (!canAct(attackerConditions) && args.action.type !== "other") {
      throw new Error("Cannot act due to conditions");
    }

    if (!current.hasAction) {
      throw new Error("No action remaining");
    }

    let serverRoll: number | undefined;
    let serverDamage: number | undefined;
    let hitResult = false;
    let isCrit = false;

    // Server-side attack resolution
    if (args.action.type === "attack" && args.action.targetIndex !== undefined) {
      const target = combatants[args.action.targetIndex];
      if (!target) throw new Error("Invalid target");

      // Get target AC and conditions
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
          if (targetCell?.cover === "half") targetAc += 2;
          else if (targetCell?.cover === "three-quarters") targetAc += 5;
        }
      }

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
      const advState = resolveAttackAdvantage(
        attackerConditions,
        targetConditions,
        isMelee,
        isMelee,
      );

      // Roll d20 with advantage/disadvantage
      const roll1 = Math.floor(Math.random() * 20) + 1;
      const roll2 = Math.floor(Math.random() * 20) + 1;
      let naturalRoll: number;
      if (advState === 1) naturalRoll = Math.max(roll1, roll2);
      else if (advState === -1) naturalRoll = Math.min(roll1, roll2);
      else naturalRoll = roll1;

      serverRoll = naturalRoll + attackBonus;
      isCrit = naturalRoll === 20;
      const autoCrit = isAutoCrit(targetConditions, isMelee);

      if (naturalRoll === 1) {
        // Critical miss — always misses
        hitResult = false;
        serverDamage = 0;
      } else if (isCrit || autoCrit || serverRoll >= targetAc) {
        hitResult = true;

        // Calculate damage
        let damageDice = "1d8";
        let damageBonus = 0;
        if (current.entityType === "character") {
          const char = await ctx.db.get(current.entityId as Id<"characters">);
          if (char) {
            const stats = await getEffectiveStats(ctx, current.entityId as Id<"characters">);
            damageBonus = stats.abilityModifiers.strength; // default to STR
            // Check for equipped weapon damage
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

            // Add class feature bonuses (sneak attack, rage, etc.)
            const charClass = (char.class || "").toLowerCase();
            if (charClass === "rogue") {
              // Sneak attack: if have advantage or ally adjacent to target
              if (advState === 1) {
                const sneakDice = getSneakAttackDice(char.level);
                const sneakResult = parseDiceString(`${sneakDice}d6`);
                damageBonus += sneakResult.total;
              }
            }
            if (charClass === "barbarian" && char.classResources?.rage?.current) {
              damageBonus += getRageDamageBonus(char.level);
            }
          }
        } else {
          const npc = await ctx.db.get(current.entityId as Id<"npcs">);
          if (npc) {
            damageDice = getNpcDamageDice(npc);
          }
        }

        const damageResult = parseDiceString(damageDice);
        serverDamage = damageResult.total + damageBonus;

        // Double dice on crit
        if (isCrit || autoCrit) {
          const critExtra = parseDiceString(damageDice);
          serverDamage += critExtra.total;
        }

        // Apply resistance (petrified)
        if (hasResistanceAll(targetConditions)) {
          serverDamage = Math.floor(serverDamage / 2);
        }

        // Apply damage to target
        if (target.entityType === "character") {
          const character = await ctx.db.get(target.entityId as Id<"characters">);
          if (character) {
            let totalDamage = serverDamage;
            let remainingDamage = totalDamage;
            let newTempHp = character.tempHp;

            // Absorb with temp HP first
            if (newTempHp > 0) {
              const absorbed = Math.min(newTempHp, remainingDamage);
              newTempHp -= absorbed;
              remainingDamage -= absorbed;
            }

            const newHp = Math.max(0, character.hp - remainingDamage);
            const patch: Record<string, unknown> = { hp: newHp, tempHp: newTempHp };

            // Death saves: if HP drops to 0, add unconscious condition
            if (newHp === 0 && character.hp > 0) {
              const currentConditions = [...character.conditions];
              if (!currentConditions.some(c => c.name === "unconscious")) {
                currentConditions.push({ name: "unconscious" });
              }
              patch.conditions = currentConditions;
              patch.deathSaves = { successes: 0, failures: 0 };
            }

            // Concentration check on damage
            if (character.concentration && remainingDamage > 0) {
              const conSaveDC = concentrationSaveDC(remainingDamage);
              const conMod = Math.floor((character.abilities.constitution - 10) / 2);
              const conSave = Math.floor(Math.random() * 20) + 1 + conMod + character.proficiencyBonus;
              if (conSave < conSaveDC) {
                patch.concentration = undefined;
              }
            }

            await ctx.db.patch(target.entityId as Id<"characters">, patch);
          }
        } else {
          const npc = await ctx.db.get(target.entityId as Id<"npcs">);
          if (npc) {
            const newHp = Math.max(0, npc.hp - serverDamage);
            await ctx.db.patch(target.entityId as Id<"npcs">, {
              hp: newHp,
              isAlive: newHp > 0,
            });
          }
        }
      } else {
        hitResult = false;
        serverDamage = 0;
      }
    } else if (args.action.type === "attack" && args.action.damage) {
      // Fallback: client sent damage directly (legacy support)
      serverDamage = args.action.damage;
      if (args.action.targetIndex !== undefined) {
        const target = combatants[args.action.targetIndex];
        if (target) {
          if (target.entityType === "character") {
            const character = await ctx.db.get(target.entityId as Id<"characters">);
            if (character) {
              const newHp = Math.max(0, character.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"characters">, { hp: newHp });
            }
          } else {
            const npc = await ctx.db.get(target.entityId as Id<"npcs">);
            if (npc) {
              const newHp = Math.max(0, npc.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"npcs">, {
                hp: newHp,
                isAlive: newHp > 0,
              });
            }
          }
        }
      }
      hitResult = true;
    }

    // Handle special actions
    if (args.action.type === "dash") {
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
        movementRemaining: current.movementRemaining * 2,
      };
    } else if (args.action.type === "dodge") {
      // Apply dodging condition (attackers have disadvantage)
      if (current.entityType === "character") {
        const char = await ctx.db.get(current.entityId as Id<"characters">);
        if (char) {
          const conditions = [...char.conditions];
          conditions.push({ name: "dodging", duration: 1, source: "dodge_action" });
          await ctx.db.patch(current.entityId as Id<"characters">, { conditions });
        }
      }
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
      };
    } else if (args.action.type === "disengage") {
      // Disengage: prevent opportunity attacks this turn (tracked via flag)
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
      };
    } else {
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
      };
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

    // Update position to final destination
    const destination = args.path[args.path.length - 1];
    combatants[args.combatantIndex] = {
      ...combatant,
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
      movementRemaining: combatant.movementRemaining - movementCost
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
        const updatedConditions = processConditionDurations(
          char.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            expiresOn: "end" as const,
          })),
          "end",
        );
        await ctx.db.patch(currentCombatant.entityId as Id<"characters">, {
          conditions: updatedConditions.map(c => ({
            name: c.name,
            ...(c.duration !== undefined ? { duration: c.duration } : {}),
            ...(c.source ? { source: c.source } : {}),
          })),
        });
      }
    } else {
      const npc = await ctx.db.get(currentCombatant.entityId as Id<"npcs">);
      if (npc) {
        const updatedConditions = processConditionDurations(
          npc.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            expiresOn: "end" as const,
          })),
          "end",
        );
        await ctx.db.patch(currentCombatant.entityId as Id<"npcs">, {
          conditions: updatedConditions.map(c => ({
            name: c.name,
            ...(c.duration !== undefined ? { duration: c.duration } : {}),
            ...(c.source ? { source: c.source } : {}),
          })),
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

    // Process start-of-turn for next combatant
    if (nextCombatant.entityType === "character") {
      const char = await ctx.db.get(nextCombatant.entityId as Id<"characters">);
      if (char) {
        // Process start-of-turn condition durations
        const updatedConditions = processConditionDurations(
          char.conditions.map(c => ({
            name: c.name,
            duration: c.duration,
            source: c.source,
            expiresOn: "start" as const,
          })),
          "start",
        );
        const patch: Record<string, unknown> = {
          conditions: updatedConditions.map(c => ({
            name: c.name,
            ...(c.duration !== undefined ? { duration: c.duration } : {}),
            ...(c.source ? { source: c.source } : {}),
          })),
        };

        // Death saves: if at 0 HP, roll death save
        if (char.hp === 0) {
          const deathRoll = Math.floor(Math.random() * 20) + 1;
          const ds = { ...char.deathSaves };

          if (deathRoll === 20) {
            // Nat 20: regain 1 HP
            patch.hp = 1;
            patch.deathSaves = { successes: 0, failures: 0 };
            // Remove unconscious condition
            patch.conditions = (updatedConditions as Array<{ name: string; duration?: number; source?: string }>)
              .filter(c => c.name !== "unconscious")
              .map(c => ({
                name: c.name,
                ...(c.duration !== undefined ? { duration: c.duration } : {}),
                ...(c.source ? { source: c.source } : {}),
              }));
          } else if (deathRoll === 1) {
            // Nat 1: 2 failures
            ds.failures = Math.min(3, ds.failures + 2);
            patch.deathSaves = ds;
          } else if (deathRoll >= 10) {
            ds.successes = Math.min(3, ds.successes + 1);
            patch.deathSaves = ds;
            if (ds.successes >= 3) {
              // Stabilized — stays at 0 HP but stops rolling
              patch.deathSaves = { successes: 3, failures: ds.failures };
            }
          } else {
            ds.failures = Math.min(3, ds.failures + 1);
            patch.deathSaves = ds;
          }

          await ctx.db.patch(nextCombatant.entityId as Id<"characters">, patch);
        } else {
          await ctx.db.patch(nextCombatant.entityId as Id<"characters">, patch);
        }
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
    await requireCampaignMember(ctx, session.campaignId);

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
