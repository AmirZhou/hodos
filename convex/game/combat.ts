import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { requireCampaignMember } from "../lib/auth";

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

    // Enrich combatants with entity details
    const enrichedCombatants = await Promise.all(
      session.combat.combatants.map(async (combatant) => {
        if (combatant.entityType === "character") {
          const character = await ctx.db.get(
            combatant.entityId as Id<"characters">
          );
          return {
            ...combatant,
            entity: character
              ? {
                  name: character.name,
                  hp: character.hp,
                  maxHp: character.maxHp,
                  ac: character.ac,
                  portrait: character.portrait,
                  conditions: character.conditions,
                }
              : null,
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

    // Copy exploration positions to combatants if available
    const explorationPositions = session.explorationPositions ?? {};

    const combatantStates = args.combatants.map((c) => {
      // Use exploration position if combatant didn't specify one, or if position is (0,0) default
      const explorationPos = explorationPositions[c.entityId];
      const position = (c.position.x === 0 && c.position.y === 0 && explorationPos)
        ? explorationPos
        : c.position;

      return {
        entityId: c.entityId,
        entityType: c.entityType,
        initiative: 0,
        position,
        hasAction: true,
        hasBonusAction: true,
        hasReaction: true,
        movementRemaining: 30,
      };
    });

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

    if (session.combat.phase !== "in_progress") {
      throw new Error("Combat not in progress");
    }

    const combatants = [...session.combat.combatants];
    const currentIndex = session.combat.currentTurnIndex;
    const current = combatants[currentIndex];

    if (!current.hasAction) {
      throw new Error("No action remaining");
    }

    // Apply damage to target if applicable
    if (args.action.targetIndex !== undefined && args.action.damage) {
      const target = combatants[args.action.targetIndex];
      if (target) {
        // Update target HP in the database
        if (target.entityType === "character") {
          const character = await ctx.db.get(target.entityId as Id<"characters">);
          if (character) {
            const newHp = Math.max(0, character.hp - args.action.damage);
            await ctx.db.patch(target.entityId as Id<"characters">, { hp: newHp });
          }
        } else {
          const npc = await ctx.db.get(target.entityId as Id<"npcs">);
          if (npc) {
            const newHp = Math.max(0, npc.hp - args.action.damage);
            await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp });
          }
        }
      }
    }

    // Handle special actions
    if (args.action.type === "dash") {
      // Dash doubles remaining movement
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
        movementRemaining: current.movementRemaining + 30,
      };
    } else if (args.action.type === "dodge") {
      // Dodge gives advantage on DEX saves, disadvantage on attacks against
      // This would be tracked via conditions in a full implementation
      combatants[currentIndex] = {
        ...current,
        hasAction: false,
      };
    } else {
      // Standard action consumption
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

    return { success: true, actionType: args.action.type };
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

    const combatants = [...session.combat.combatants];
    const combatant = combatants[args.combatantIndex];

    if (!combatant) {
      throw new Error("Invalid combatant");
    }

    // Calculate movement cost (5ft per cell)
    const movementCost = (args.path.length - 1) * 5;

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

    const combat = session.combat;
    const combatants = [...combat.combatants];

    let nextIndex = combat.currentTurnIndex + 1;
    let round = combat.round;

    // Wrap around to start of turn order
    if (nextIndex >= combatants.length) {
      nextIndex = 0;
      round += 1;
    }

    // Reset turn resources for next combatant
    combatants[nextIndex] = {
      ...combatants[nextIndex],
      hasAction: true,
      hasBonusAction: true,
      hasReaction: true,
      movementRemaining: 30,
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
          return {
            ...combatant,
            entity: character ? { hp: character.hp, ac: character.ac } : null,
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
      const attackRoll = Math.floor(Math.random() * 20) + 1 + 5;
      const targetAc = nearest.entity?.ac ?? 10;

      if (attackRoll >= targetAc) {
        const damage = Math.floor(Math.random() * 8) + 1 + 3;
        await ctx.runMutation(api.game.combat.executeAction, {
          sessionId: args.sessionId,
          action: { type: "attack", targetIndex: nearest.index, roll: attackRoll, damage },
        });
        await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });
        return { action: "attack", target: nearest.index, roll: attackRoll, damage, hit: true };
      } else {
        await ctx.runMutation(api.game.combat.executeAction, {
          sessionId: args.sessionId,
          action: { type: "attack", targetIndex: nearest.index, roll: attackRoll, damage: 0 },
        });
        await ctx.runMutation(api.game.combat.endTurn, { sessionId: args.sessionId });
        return { action: "attack", target: nearest.index, roll: attackRoll, hit: false };
      }
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
