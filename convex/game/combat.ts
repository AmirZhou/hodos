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
import { logAudit } from "../lib/auditLog";

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
      actions.push("attack", "dodge", "disengage", "dash", "help", "hide", "ready", "use_item");

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

            // Sneak Attack (rogue, once per turn, requires advantage or ally adjacent)
            if (charClass === "rogue" && !sneakAttackUsed && advState === 1) {
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
            const conSave = Math.floor(Math.random() * 20) + 1 + targetConMod;
            if (conSave < kiSaveDC) {
              // Stunned until end of monk's next turn
              if (target.entityType === "character") {
                const tc = await ctx.db.get(target.entityId as Id<"characters">);
                if (tc) {
                  const conds = [...tc.conditions];
                  if (!conds.some(c => c.name === "stunned")) {
                    conds.push({ name: "stunned", duration: 1, source: "stunning_strike" });
                    await ctx.db.patch(target.entityId as Id<"characters">, { conditions: conds });
                  }
                }
              } else {
                const tn = await ctx.db.get(target.entityId as Id<"npcs">);
                if (tn) {
                  const conds = [...tn.conditions];
                  if (!conds.some(c => c.name === "stunned")) {
                    conds.push({ name: "stunned", duration: 1, source: "stunning_strike" });
                    await ctx.db.patch(target.entityId as Id<"npcs">, { conditions: conds });
                  }
                }
              }
            }
          }
        }

        // Apply damage to target
        if (target.entityType === "character") {
          const character = await ctx.db.get(target.entityId as Id<"characters">);
          if (character) {
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
              patch.conditions = currentConditions;
              patch.deathSaves = { successes: 0, failures: 0 };
            }
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
            const newHp = Math.max(0, npc.hp - atkDamage);
            await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
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
            if (character) {
              const newHp = Math.max(0, character.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"characters">, { hp: newHp });
            }
          } else {
            const npc = await ctx.db.get(target.entityId as Id<"npcs">);
            if (npc) {
              const newHp = Math.max(0, npc.hp - serverDamage);
              await ctx.db.patch(target.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
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

      const charClass = (caster.class || "").toLowerCase();
      const castingAbility = getCastingAbility(charClass);
      if (!castingAbility) throw new Error("Class cannot cast spells");

      const castingAbilityScore = caster.abilities[castingAbility as keyof typeof caster.abilities];
      const profBonus = caster.proficiencyBonus;

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

      // Handle concentration: drop existing before setting new
      if (spell.concentration && caster.concentration) {
        await ctx.db.patch(current.entityId as Id<"characters">, { concentration: undefined });
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
                if (ch) {
                  let rem = rayDamage;
                  let tp = ch.tempHp;
                  if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
                  const newHp = Math.max(0, ch.hp - rem);
                  const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
                  if (newHp === 0 && ch.hp > 0) {
                    const conds = [...ch.conditions];
                    if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
                    patch.conditions = conds;
                    patch.deathSaves = { successes: 0, failures: 0 };
                  }
                  if (ch.concentration && rem > 0) {
                    const dc = concentrationSaveDC(rem);
                    const mod = Math.floor((ch.abilities.constitution - 10) / 2);
                    if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
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
              saveMod = 0; // NPCs use base 0 save mod unless we add ability scores
              targetConditions = tn.conditions.map(c => c.name);
            }
          }

          const saveRoll = Math.floor(Math.random() * 20) + 1 + saveMod;
          const saveSuccess = saveRoll >= spellSaveDC;

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
              if (ch) {
                let rem = dmg;
                let tp = ch.tempHp;
                if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
                const newHp = Math.max(0, ch.hp - rem);
                const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
                if (newHp === 0 && ch.hp > 0) {
                  const conds = [...ch.conditions];
                  if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
                  patch.conditions = conds;
                  patch.deathSaves = { successes: 0, failures: 0 };
                }
                if (ch.concentration && rem > 0) {
                  const dc = concentrationSaveDC(rem);
                  const mod = Math.floor((ch.abilities.constitution - 10) / 2);
                  if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
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
              }
            }
          }

          // Apply conditions on failed save (hold_person → paralyzed, etc.)
          if (spell.conditions && !saveSuccess) {
            hitResult = true;
            if (target.entityType === "character") {
              const ch = await ctx.db.get(target.entityId as Id<"characters">);
              if (ch) {
                const conds = [...ch.conditions];
                for (const condName of spell.conditions) {
                  if (!conds.some(c => c.name === condName)) {
                    conds.push({
                      name: condName,
                      ...(spell.concentration ? { duration: 10 } : { duration: 1 }),
                      source: spell.id,
                    });
                  }
                }
                await ctx.db.patch(target.entityId as Id<"characters">, { conditions: conds });
              }
            } else {
              const np = await ctx.db.get(target.entityId as Id<"npcs">);
              if (np) {
                const conds = [...np.conditions];
                for (const condName of spell.conditions) {
                  if (!conds.some(c => c.name === condName)) {
                    conds.push({
                      name: condName,
                      ...(spell.concentration ? { duration: 10 } : { duration: 1 }),
                      source: spell.id,
                    });
                  }
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
          if (ch) {
            let rem = totalDmg;
            let tp = ch.tempHp;
            if (tp > 0) { const a = Math.min(tp, rem); tp -= a; rem -= a; }
            const newHp = Math.max(0, ch.hp - rem);
            const patch: Record<string, unknown> = { hp: newHp, tempHp: tp };
            if (newHp === 0 && ch.hp > 0) {
              const conds = [...ch.conditions];
              if (!conds.some(c => c.name === "unconscious")) conds.push({ name: "unconscious" });
              patch.conditions = conds;
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            if (ch.concentration && rem > 0) {
              const dc = concentrationSaveDC(rem);
              const mod = Math.floor((ch.abilities.constitution - 10) / 2);
              if (Math.floor(Math.random() * 20) + 1 + mod + ch.proficiencyBonus < dc) {
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
          }
        }
        hitResult = true;
      }
      // Utility spells (shield, misty_step, haste, etc.) just consume the slot — effects tracked via concentration or conditions

      // Set concentration for concentration spells
      if (spell.concentration) {
        const concTarget = args.action.targetIndex !== undefined ? combatants[args.action.targetIndex]?.entityId : undefined;
        await ctx.db.patch(current.entityId as Id<"characters">, {
          concentration: { spellId: spell.id, ...(concTarget ? { targetId: concTarget } : {}) },
        });
      }
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
    // TODO: Disengage action should prevent opportunity attacks. Add a per-turn
    // disengaged flag once the disengage action sets one.

    const opportunityAttacks: Array<{
      attackerIndex: number;
      attackerName: string;
      hit: boolean;
      damage: number;
      roll: number;
    }> = [];

    for (let step = 0; step < args.path.length - 1; step++) {
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
          if (ch) {
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
              patch.conditions = currentConditions;
              patch.deathSaves = { successes: 0, failures: 0 };
            }
            if (ch.concentration && remainingDamage > 0) {
              const conSaveDC = concentrationSaveDC(remainingDamage);
              const conMod = Math.floor((ch.abilities.constitution - 10) / 2);
              const conSave = Math.floor(Math.random() * 20) + 1 + conMod + ch.proficiencyBonus;
              if (conSave < conSaveDC) {
                patch.concentration = undefined;
              }
            }
            await ctx.db.patch(combatant.entityId as Id<"characters">, patch);
          }
        } else {
          const mn = await ctx.db.get(combatant.entityId as Id<"npcs">);
          if (mn) {
            const newHp = Math.max(0, mn.hp - oaDamage);
            await ctx.db.patch(combatant.entityId as Id<"npcs">, { hp: newHp, isAlive: newHp > 0 });
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
