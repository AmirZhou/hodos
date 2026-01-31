import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireCharacterOwner } from "../lib/auth";

/**
 * Short Rest: Spend hit dice to recover HP.
 * Takes ~1 hour in-game. Can spend hit dice up to max.
 */
export const shortRest = mutation({
  args: {
    characterId: v.id("characters"),
    hitDiceToSpend: v.number(), // how many hit dice to roll
  },
  handler: async (ctx, args) => {
    const { character } = await requireCharacterOwner(ctx, args.characterId);

    const hitDice = character.hitDice ?? {
      max: character.level,
      used: 0,
    };

    const available = hitDice.max - hitDice.used;
    const toSpend = Math.min(args.hitDiceToSpend, available);

    if (toSpend <= 0) {
      return { healed: 0, hitDiceSpent: 0, message: "No hit dice available" };
    }

    // Roll hit dice (d10 for default, + CON mod per die)
    const conMod = Math.floor((character.abilities.constitution - 10) / 2);
    let totalHealing = 0;

    for (let i = 0; i < toSpend; i++) {
      const roll = Math.floor(Math.random() * 10) + 1;
      totalHealing += Math.max(1, roll + conMod); // minimum 1 HP per die
    }

    const newHp = Math.min(character.maxHp, character.hp + totalHealing);

    await ctx.db.patch(args.characterId, {
      hp: newHp,
      hitDice: {
        max: hitDice.max,
        used: hitDice.used + toSpend,
      },
    });

    // Restore class resources that recharge on short rest
    if (character.classResources) {
      // Short rest resources refresh — handled by class feature definitions
      // For now, restore ki, action surge, second wind, etc.
      const updated = { ...character.classResources };
      const shortRestResources = ["ki", "actionSurge", "secondWind"];
      for (const key of shortRestResources) {
        if (updated[key]) {
          updated[key] = { ...updated[key], current: updated[key].max };
        }
      }
      await ctx.db.patch(args.characterId, { classResources: updated });
    }

    return {
      healed: newHp - character.hp,
      hitDiceSpent: toSpend,
      hitDiceRemaining: available - toSpend,
    };
  },
});

/**
 * Long Rest: Full HP recovery, restore half hit dice, restore all spell slots.
 * Takes ~8 hours in-game.
 */
export const longRest = mutation({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const { character } = await requireCharacterOwner(ctx, args.characterId);

    const hitDice = character.hitDice ?? {
      max: character.level,
      used: 0,
    };

    // Recover half of total hit dice (minimum 1)
    const hitDiceRecovered = Math.max(1, Math.floor(hitDice.max / 2));
    const newUsed = Math.max(0, hitDice.used - hitDiceRecovered);

    const patch: Record<string, unknown> = {
      hp: character.maxHp,
      hitDice: { max: hitDice.max, used: newUsed },
      // Reset death saves
      deathSaves: { successes: 0, failures: 0 },
      // Clear exhaustion by 1 level (if any)
      exhaustionLevel: Math.max(0, character.exhaustionLevel - 1),
    };

    // Restore all spell slots
    if (character.spellSlots) {
      const restored: Record<string, { max: number; used: number }> = {};
      for (const [level, slot] of Object.entries(character.spellSlots)) {
        restored[level] = { max: slot.max, used: 0 };
      }
      patch.spellSlots = restored;
    }

    // Restore all class resources
    if (character.classResources) {
      const restored: Record<string, { max: number; current: number }> = {};
      for (const [name, resource] of Object.entries(character.classResources)) {
        restored[name] = { ...resource, current: resource.max };
      }
      patch.classResources = restored;
    }

    await ctx.db.patch(args.characterId, patch);

    return {
      hpRestored: character.maxHp - character.hp,
      hitDiceRecovered,
      spellSlotsRestored: !!character.spellSlots,
    };
  },
});
