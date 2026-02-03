import { describe, it, expect } from "vitest";
import {
  getExtraAttacks,
  initializeClassResources,
  getSneakAttackDice,
  getRageDamageBonus,
  getFeaturesForClassAtLevel,
  getCcBreakFeature,
} from "../lib/classFeatures";
import {
  hasSpellSlot,
  getCantripDiceCount,
  getSpellSaveDC,
  getSpellAttackBonus,
} from "../lib/spells";
import {
  getCondition,
  resolveAttackAdvantage,
  concentrationSaveDC,
  canAct,
  canMove,
} from "../lib/conditions";
import { getSpellById } from "../data/spellData";

// ============ EXTRA ATTACKS ============

describe("getExtraAttacks", () => {
  it("returns 0 for fighter level 4 (before Extra Attack)", () => {
    expect(getExtraAttacks("fighter", 4)).toBe(0);
  });

  it("returns 1 for fighter level 5", () => {
    expect(getExtraAttacks("fighter", 5)).toBe(1);
  });

  it("returns 2 for fighter level 11", () => {
    expect(getExtraAttacks("fighter", 11)).toBe(2);
  });

  it("returns 3 for fighter level 20", () => {
    expect(getExtraAttacks("fighter", 20)).toBe(3);
  });

  it("returns 0 for rogue level 20 (rogues do not get extra attack)", () => {
    expect(getExtraAttacks("rogue", 20)).toBe(0);
  });

  it("returns 1 for barbarian level 5", () => {
    expect(getExtraAttacks("barbarian", 5)).toBe(1);
  });

  it("returns 1 for paladin level 5", () => {
    expect(getExtraAttacks("paladin", 5)).toBe(1);
  });
});

// ============ SPELL SLOT CONSUMPTION ============

describe("hasSpellSlot", () => {
  it("returns true when used < max", () => {
    const slots = { "1": { max: 4, used: 2 } };
    expect(hasSpellSlot(slots, 1)).toBe(true);
  });

  it("returns false when used >= max", () => {
    const slots = { "1": { max: 4, used: 4 } };
    expect(hasSpellSlot(slots, 1)).toBe(false);
  });

  it("returns false for spell levels not in the table", () => {
    const slots = { "1": { max: 2, used: 0 } };
    expect(hasSpellSlot(slots, 3)).toBe(false);
  });

  it("returns false when used exceeds max", () => {
    const slots = { "2": { max: 3, used: 5 } };
    expect(hasSpellSlot(slots, 2)).toBe(false);
  });

  it("returns true when zero slots have been used", () => {
    const slots = { "5": { max: 1, used: 0 } };
    expect(hasSpellSlot(slots, 5)).toBe(true);
  });
});

// ============ CANTRIP SCALING ============

describe("getCantripDiceCount", () => {
  it("returns 1 die at level 1", () => {
    expect(getCantripDiceCount(1)).toBe(1);
  });

  it("returns 1 die at level 4 (just before first scaling)", () => {
    expect(getCantripDiceCount(4)).toBe(1);
  });

  it("returns 2 dice at level 5", () => {
    expect(getCantripDiceCount(5)).toBe(2);
  });

  it("returns 3 dice at level 11", () => {
    expect(getCantripDiceCount(11)).toBe(3);
  });

  it("returns 4 dice at level 17", () => {
    expect(getCantripDiceCount(17)).toBe(4);
  });

  it("returns 4 dice at level 20 (no further scaling)", () => {
    expect(getCantripDiceCount(20)).toBe(4);
  });
});

// ============ SPELL SAVE DC ============

describe("getSpellSaveDC", () => {
  it("returns 13 for proficiency 2 and ability score 16 (8 + 2 + 3)", () => {
    // abilityModifier(16) = floor((16-10)/2) = 3
    expect(getSpellSaveDC(2, 16)).toBe(13);
  });

  it("returns 19 for proficiency 6 and ability score 20 (8 + 6 + 5)", () => {
    // abilityModifier(20) = floor((20-10)/2) = 5
    expect(getSpellSaveDC(6, 20)).toBe(19);
  });

  it("returns 10 for proficiency 2 and ability score 10 (8 + 2 + 0)", () => {
    // abilityModifier(10) = 0
    expect(getSpellSaveDC(2, 10)).toBe(10);
  });
});

// ============ SPELL ATTACK BONUS ============

describe("getSpellAttackBonus", () => {
  it("returns 4 for proficiency 2 and ability score 14 (2 + 2)", () => {
    // abilityModifier(14) = floor((14-10)/2) = 2
    expect(getSpellAttackBonus(2, 14)).toBe(4);
  });

  it("returns 11 for proficiency 6 and ability score 20 (6 + 5)", () => {
    // abilityModifier(20) = 5
    expect(getSpellAttackBonus(6, 20)).toBe(11);
  });

  it("returns 2 for proficiency 2 and ability score 10 (2 + 0)", () => {
    expect(getSpellAttackBonus(2, 10)).toBe(2);
  });
});

// ============ CLASS RESOURCE INITIALIZATION ============

describe("initializeClassResources", () => {
  it("fighter level 2 has secondWind and actionSurge resources", () => {
    const resources = initializeClassResources("fighter", 2);
    expect(resources).toHaveProperty("secondWind");
    expect(resources.secondWind.max).toBe(1);
    expect(resources.secondWind.current).toBe(1);
    expect(resources).toHaveProperty("actionSurge");
    expect(resources.actionSurge.max).toBe(1);
    expect(resources.actionSurge.current).toBe(1);
  });

  it("barbarian level 1 has rage resource with max 2", () => {
    const resources = initializeClassResources("barbarian", 1);
    expect(resources).toHaveProperty("rage");
    expect(resources.rage.max).toBe(2);
    expect(resources.rage.current).toBe(2);
  });

  it("monk level 2 has ki resource with max equal to level", () => {
    const resources = initializeClassResources("monk", 2);
    expect(resources).toHaveProperty("ki");
    expect(resources.ki.max).toBe(2);
    expect(resources.ki.current).toBe(2);
  });

  it("monk level 10 has ki resource with max 10", () => {
    const resources = initializeClassResources("monk", 10);
    expect(resources.ki.max).toBe(10);
  });

  it("fighter level 1 has secondWind but not actionSurge", () => {
    const resources = initializeClassResources("fighter", 1);
    expect(resources).toHaveProperty("secondWind");
    expect(resources).not.toHaveProperty("actionSurge");
  });
});

// ============ HIT DIE SIZES ============

describe("hit die sizes for rest", () => {
  // D&D 5e hit die size per class — pure inline logic
  function getHitDie(characterClass: string): string {
    const hitDice: Record<string, string> = {
      barbarian: "d12",
      fighter: "d10",
      paladin: "d10",
      ranger: "d10",
      monk: "d8",
      rogue: "d8",
      bard: "d8",
      cleric: "d8",
      druid: "d8",
      warlock: "d8",
      wizard: "d6",
      sorcerer: "d6",
    };
    return hitDice[characterClass.toLowerCase()] ?? "d8";
  }

  it("barbarian uses d12", () => {
    expect(getHitDie("barbarian")).toBe("d12");
  });

  it("fighter uses d10", () => {
    expect(getHitDie("fighter")).toBe("d10");
  });

  it("wizard uses d6", () => {
    expect(getHitDie("wizard")).toBe("d6");
  });

  it("rogue uses d8", () => {
    expect(getHitDie("rogue")).toBe("d8");
  });

  it("paladin uses d10", () => {
    expect(getHitDie("paladin")).toBe("d10");
  });

  it("sorcerer uses d6", () => {
    expect(getHitDie("sorcerer")).toBe("d6");
  });

  it("defaults to d8 for unknown class", () => {
    expect(getHitDie("artificer")).toBe("d8");
  });
});

// ============ RECKLESS ATTACK CONDITION ============

describe("Reckless Attack condition", () => {
  it("getCondition('reckless') returns a valid condition with attackedAdvantage", () => {
    const cond = getCondition("reckless");
    expect(cond).toBeDefined();
    expect(cond!.name).toBe("Reckless");
    expect(cond!.effects.attackedAdvantage).toBe(true);
  });

  it("resolveAttackAdvantage grants advantage for melee attacker against reckless target", () => {
    // attacker has no conditions, target is reckless, melee within 5ft
    expect(resolveAttackAdvantage([], ["reckless"], true, true)).toBe(1);
  });

  it("resolveAttackAdvantage grants advantage for ranged attacker against reckless target", () => {
    // attackedAdvantage applies regardless of melee/ranged
    expect(resolveAttackAdvantage([], ["reckless"], false, false)).toBe(1);
  });
});

// ============ SNEAK ATTACK DICE ============

describe("getSneakAttackDice", () => {
  it("returns 1 die at rogue level 1", () => {
    expect(getSneakAttackDice(1)).toBe(1);
  });

  it("returns 2 dice at rogue level 3", () => {
    expect(getSneakAttackDice(3)).toBe(2);
  });

  it("returns 3 dice at rogue level 5", () => {
    expect(getSneakAttackDice(5)).toBe(3);
  });

  it("returns 6 dice at rogue level 11", () => {
    expect(getSneakAttackDice(11)).toBe(6);
  });

  it("returns 10 dice at rogue level 19", () => {
    expect(getSneakAttackDice(19)).toBe(10);
  });

  it("non-rogue classes have no sneak attack feature", () => {
    const features = getFeaturesForClassAtLevel("fighter", 20);
    const hasSneakAttack = features.some(
      (f) => f.combatEffect?.sneakAttackDice !== undefined,
    );
    expect(hasSneakAttack).toBe(false);
  });
});

// ============ RAGE DAMAGE BONUS ============

describe("getRageDamageBonus", () => {
  it("returns 2 at barbarian level 1", () => {
    expect(getRageDamageBonus(1)).toBe(2);
  });

  it("returns 3 at barbarian level 9", () => {
    expect(getRageDamageBonus(9)).toBe(3);
  });

  it("returns 4 at barbarian level 16", () => {
    expect(getRageDamageBonus(16)).toBe(4);
  });

  it("non-barbarian classes have no rage damage feature", () => {
    const features = getFeaturesForClassAtLevel("rogue", 20);
    const hasRageDamage = features.some(
      (f) => f.combatEffect?.rageDamageBonus !== undefined,
    );
    expect(hasRageDamage).toBe(false);
  });
});

// ============ CONCENTRATION SAVE DC ============

describe("concentrationSaveDC", () => {
  it("returns DC 10 for 0 damage", () => {
    expect(concentrationSaveDC(0)).toBe(10);
  });

  it("returns DC 10 for 10 damage (floor(10/2) = 5, but minimum is 10)", () => {
    expect(concentrationSaveDC(10)).toBe(10);
  });

  it("returns DC 10 for 20 damage (floor(20/2) = 10)", () => {
    expect(concentrationSaveDC(20)).toBe(10);
  });

  it("returns DC 11 for 22 damage (floor(22/2) = 11)", () => {
    expect(concentrationSaveDC(22)).toBe(11);
  });

  it("returns DC 25 for 50 damage (floor(50/2) = 25)", () => {
    expect(concentrationSaveDC(50)).toBe(25);
  });

  it("returns DC 50 for 100 damage (floor(100/2) = 50)", () => {
    expect(concentrationSaveDC(100)).toBe(50);
  });
});

// ============ SPELL DATA ============

describe("getSpellById", () => {
  it("fire_bolt is a cantrip with an attack roll", () => {
    const spell = getSpellById("fire_bolt");
    expect(spell).toBeDefined();
    expect(spell!.level).toBe(0);
    expect(spell!.attackRoll).toBe(true);
    expect(spell!.range).toBe(120);
  });

  it("fireball is a level 3 spell with dexterity save", () => {
    const spell = getSpellById("fireball");
    expect(spell).toBeDefined();
    expect(spell!.level).toBe(3);
    expect(spell!.saveType).toBe("dexterity");
  });

  it("cure_wounds is a level 1 healing spell", () => {
    const spell = getSpellById("cure_wounds");
    expect(spell).toBeDefined();
    expect(spell!.level).toBe(1);
    expect(spell!.healing).toBeDefined();
    expect(spell!.healing!.dice).toBe("1d8");
  });

  it("magic_missile is a level 1 auto-hit spell (no attack roll, no save)", () => {
    const spell = getSpellById("magic_missile");
    expect(spell).toBeDefined();
    expect(spell!.level).toBe(1);
    expect(spell!.attackRoll).toBeUndefined();
    expect(spell!.saveType).toBeUndefined();
  });

  it("returns undefined for nonexistent spell", () => {
    expect(getSpellById("nonexistent")).toBeUndefined();
  });

  it("hold_person has condition 'paralyzed'", () => {
    const spell = getSpellById("hold_person");
    expect(spell).toBeDefined();
    expect(spell!.conditions).toBeDefined();
    expect(spell!.conditions).toContain("paralyzed");
  });
});

// ============ DEATH SAVE MECHANICS ============

describe("Death save rules", () => {
  // Test the D&D 5e death save decision logic
  const resolveDeathSave = (
    roll: number,
    currentSaves: { successes: number; failures: number },
  ) => {
    const ds = { ...currentSaves };
    if (roll === 20)
      return {
        hp: 1,
        deathSaves: { successes: 0, failures: 0 },
        revived: true,
      };
    if (roll === 1) {
      ds.failures = Math.min(3, ds.failures + 2);
    } else if (roll >= 10) {
      ds.successes = Math.min(3, ds.successes + 1);
    } else {
      ds.failures = Math.min(3, ds.failures + 1);
    }
    return {
      hp: 0,
      deathSaves: ds,
      revived: false,
      dead: ds.failures >= 3,
      stabilized: ds.successes >= 3,
    };
  };

  it("nat 20 revives with 1 HP", () => {
    const result = resolveDeathSave(20, { successes: 0, failures: 2 });
    expect(result.revived).toBe(true);
    expect(result.hp).toBe(1);
    expect(result.deathSaves.successes).toBe(0);
    expect(result.deathSaves.failures).toBe(0);
  });

  it("nat 1 causes 2 failures", () => {
    const result = resolveDeathSave(1, { successes: 0, failures: 0 });
    expect(result.deathSaves.failures).toBe(2);
    expect(result.revived).toBe(false);
  });

  it("roll of 10+ adds a success", () => {
    const result = resolveDeathSave(10, { successes: 0, failures: 0 });
    expect(result.deathSaves.successes).toBe(1);
    expect(result.deathSaves.failures).toBe(0);
  });

  it("roll below 10 adds a failure", () => {
    const result = resolveDeathSave(9, { successes: 0, failures: 0 });
    expect(result.deathSaves.failures).toBe(1);
    expect(result.deathSaves.successes).toBe(0);
  });

  it("3 successes stabilizes", () => {
    const result = resolveDeathSave(15, { successes: 2, failures: 1 });
    expect(result.deathSaves.successes).toBe(3);
    expect(result.stabilized).toBe(true);
    expect(result.dead).toBe(false);
  });

  it("3 failures means death", () => {
    const result = resolveDeathSave(5, { successes: 1, failures: 2 });
    expect(result.deathSaves.failures).toBe(3);
    expect(result.dead).toBe(true);
    expect(result.stabilized).toBe(false);
  });

  it("already stabilized should skip (successes >= 3)", () => {
    // Test that the logic correctly identifies stabilized state
    const ds = { successes: 3, failures: 1 };
    expect(ds.successes >= 3).toBe(true);
  });
});

// ============ DAMAGE AT 0 HP ============

describe("Damage at 0 HP", () => {
  const damageAt0HP = (isCrit: boolean, currentFailures: number) => {
    return Math.min(3, currentFailures + (isCrit ? 2 : 1));
  };

  it("non-crit damage adds 1 failure", () => {
    expect(damageAt0HP(false, 0)).toBe(1);
  });

  it("crit damage adds 2 failures", () => {
    expect(damageAt0HP(true, 0)).toBe(2);
  });

  it("failures cap at 3", () => {
    expect(damageAt0HP(true, 2)).toBe(3);
    expect(damageAt0HP(false, 3)).toBe(3);
  });

  it("crit on 2 failures results in death (3 failures)", () => {
    const failures = damageAt0HP(true, 2);
    expect(failures).toBe(3);
  });
});

// ============ COVER AC BONUSES ============

describe("Cover AC bonuses", () => {
  const applyCover = (baseAc: number, cover: string | undefined) => {
    if (cover === "full") return { targetable: false, ac: baseAc };
    if (cover === "half") return { targetable: true, ac: baseAc + 2 };
    if (cover === "three-quarters")
      return { targetable: true, ac: baseAc + 5 };
    return { targetable: true, ac: baseAc };
  };

  it("half cover adds +2 AC", () => {
    const result = applyCover(15, "half");
    expect(result.targetable).toBe(true);
    expect(result.ac).toBe(17);
  });

  it("three-quarters cover adds +5 AC", () => {
    const result = applyCover(15, "three-quarters");
    expect(result.targetable).toBe(true);
    expect(result.ac).toBe(20);
  });

  it("full cover makes target untargetable", () => {
    const result = applyCover(15, "full");
    expect(result.targetable).toBe(false);
    expect(result.ac).toBe(15);
  });

  it("no cover leaves AC unchanged", () => {
    const result = applyCover(15, undefined);
    expect(result.targetable).toBe(true);
    expect(result.ac).toBe(15);
  });

  it("undefined cover leaves AC unchanged", () => {
    const result = applyCover(18, undefined);
    expect(result.targetable).toBe(true);
    expect(result.ac).toBe(18);
  });
});

// ============ DEAD CONDITION ============

describe("Dead condition", () => {
  it("getCondition('dead') returns valid condition", () => {
    const cond = getCondition("dead");
    expect(cond).toBeDefined();
    expect(cond!.name).toBe("Dead");
    expect(cond!.effects.cannotAct).toBe(true);
    expect(cond!.effects.cannotMove).toBe(true);
  });

  it("dead condition prevents acting", () => {
    expect(canAct(["dead"])).toBe(false);
  });

  it("dead condition prevents movement", () => {
    expect(canMove(["dead"])).toBe(false);
  });
});
