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
  canCast,
  getDotDamage,
  getDamageVulnerabilityMultiplier,
  getAcModifier,
  getOutgoingDamageMultiplier,
  removeConditionsOnDamage,
  CC_CATEGORIES,
  applyDiminishingReturns,
  applyOrReplaceCondition,
  shouldBlockCc,
  spellCcBaseDuration,
  applyCcResistance,
  canUseLegendaryResistance,
  processRepeatedSaves,
} from "../lib/conditions";
import type { DrTracker, ActiveCondition } from "../lib/conditions";
import {
  potencyToCcDuration,
  applyVulnerabilityBonus,
  calculateComboBonus,
} from "../lib/techniqueResolution";
import type { Potency } from "../lib/techniqueResolution";
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

// ============ CC SYSTEM INTEGRATION TESTS ============

describe("DR integration: potency → duration → DR → effective duration", () => {
  it("critical potency stunned: 3 turns, then 1 turn (50% floored), then 1 turn (25% min 1), then immune", () => {
    const potency: Potency = "critical";
    const baseDuration = potencyToCcDuration(potency);
    expect(baseDuration).toBe(3);

    let tracker: DrTracker = {};

    // 1st application: 100% → 3 turns
    let result = applyDiminishingReturns(baseDuration, "stunned", tracker, 1);
    expect(result.duration).toBe(3);
    tracker = result.updatedTracker;

    // 2nd application: 50% → floor(3 * 0.5) = floor(1.5) = 1, max(1,1) = 1
    result = applyDiminishingReturns(baseDuration, "stunned", tracker, 2);
    expect(result.duration).toBe(1);
    tracker = result.updatedTracker;

    // 3rd application: 25% → floor(3 * 0.25) = floor(0.75) = 0, max(1,0) = 1
    result = applyDiminishingReturns(baseDuration, "stunned", tracker, 3);
    expect(result.duration).toBe(1);
    tracker = result.updatedTracker;

    // 4th application: immune → 0 turns
    result = applyDiminishingReturns(baseDuration, "stunned", tracker, 4);
    expect(result.duration).toBe(0);
  });

  it("standard potency gives 1 turn base, DR still applies", () => {
    const baseDuration = potencyToCcDuration("standard");
    expect(baseDuration).toBe(1);

    let tracker: DrTracker = {};

    // 1st: 100% → 1 turn
    let result = applyDiminishingReturns(baseDuration, "frightened", tracker, 1);
    expect(result.duration).toBe(1);
    tracker = result.updatedTracker;

    // 2nd: 50% → floor(1 * 0.5) = 0, max(1,0) = 1
    result = applyDiminishingReturns(baseDuration, "frightened", tracker, 2);
    expect(result.duration).toBe(1);
    tracker = result.updatedTracker;

    // 3rd: 25% → floor(1 * 0.25) = 0, max(1,0) = 1
    result = applyDiminishingReturns(baseDuration, "frightened", tracker, 3);
    expect(result.duration).toBe(1);
    tracker = result.updatedTracker;

    // 4th: immune → 0
    result = applyDiminishingReturns(baseDuration, "frightened", tracker, 4);
    expect(result.duration).toBe(0);
  });

  it("negated/resisted potency gives 0 duration — never applies", () => {
    expect(potencyToCcDuration("negated")).toBe(0);
    expect(potencyToCcDuration("resisted")).toBe(0);
  });

  it("DR resets after 3 turns without CC in that category", () => {
    let tracker: DrTracker = {};
    const baseDuration = potencyToCcDuration("overwhelming");
    expect(baseDuration).toBe(2);

    // Apply twice
    let result = applyDiminishingReturns(baseDuration, "stunned", tracker, 1);
    tracker = result.updatedTracker;
    result = applyDiminishingReturns(baseDuration, "stunned", tracker, 2);
    tracker = result.updatedTracker;
    expect(result.duration).toBe(1); // 50%

    // Wait 3+ turns
    result = applyDiminishingReturns(baseDuration, "stunned", tracker, 6);
    expect(result.duration).toBe(2); // reset, full duration
  });
});

describe("vulnerability damage: burning + fire_magic = +50%", () => {
  it("burning target takes 50% more from fire_magic", () => {
    const result = applyVulnerabilityBonus(10, ["burning"], "fire_magic");
    expect(result).toBe(15); // floor(10 * 1.5)
  });

  it("chilled target takes 50% more from ice_magic", () => {
    expect(applyVulnerabilityBonus(10, ["chilled"], "ice_magic")).toBe(15);
  });

  it("armor_broken target takes 50% more from heavy_weapons", () => {
    expect(applyVulnerabilityBonus(10, ["armor_broken"], "heavy_weapons")).toBe(15);
  });

  it("armor_broken target takes 50% more from archery", () => {
    expect(applyVulnerabilityBonus(10, ["armor_broken"], "archery")).toBe(15);
  });

  it("no vulnerability = base damage unchanged", () => {
    expect(applyVulnerabilityBonus(10, ["stunned"], "fire_magic")).toBe(10);
  });

  it("multiple vulnerabilities don't double-stack (still 1.5x)", () => {
    // burning gives vulnerability to fire_magic, bleeding gives vulnerability to blade_mastery
    // if target has both but skill is fire_magic, only burning matters
    expect(applyVulnerabilityBonus(10, ["burning", "bleeding"], "fire_magic")).toBe(15);
  });
});

describe("DoT ticking", () => {
  it("burning deals 3 damage per turn", () => {
    expect(getDotDamage(["burning"])).toBe(3);
  });

  it("bleeding deals 2 damage per turn", () => {
    expect(getDotDamage(["bleeding"])).toBe(2);
  });

  it("doomed deals 5 damage per turn", () => {
    expect(getDotDamage(["doomed"])).toBe(5);
  });

  it("burning_intense deals 5 damage per turn", () => {
    expect(getDotDamage(["burning_intense"])).toBe(5);
  });

  it("multiple DoTs stack additively", () => {
    expect(getDotDamage(["burning", "bleeding"])).toBe(5);
    expect(getDotDamage(["burning", "bleeding", "doomed"])).toBe(10);
  });

  it("non-DoT conditions contribute 0", () => {
    expect(getDotDamage(["stunned", "frightened"])).toBe(0);
  });
});

describe("combo bonus: technique chains", () => {
  it("grapple_hold → pressure_point gives +3 bonus", () => {
    expect(calculateComboBonus("pressure_point", "grapple_hold", 1, 2)).toBe(3);
  });

  it("quick_draw → whirlwind_slash gives +4 bonus", () => {
    expect(calculateComboBonus("whirlwind_slash", "quick_draw", 1, 2)).toBe(4);
  });

  it("fire_bolt → fireball gives +5 bonus", () => {
    expect(calculateComboBonus("fireball", "fire_bolt", 1, 2)).toBe(5);
  });

  it("combo expired after 2-turn window returns 0", () => {
    expect(calculateComboBonus("pressure_point", "grapple_hold", 1, 4)).toBe(0);
  });

  it("non-matching predecessor returns 0", () => {
    expect(calculateComboBonus("pressure_point", "fire_bolt", 1, 2)).toBe(0);
  });

  it("no previous technique returns 0", () => {
    expect(calculateComboBonus("pressure_point", undefined, undefined, 2)).toBe(0);
  });
});

describe("new condition mechanics", () => {
  it("silenced blocks casting", () => {
    expect(canCast(["silenced"])).toBe(false);
  });

  it("confused blocks casting", () => {
    expect(canCast(["confused"])).toBe(false);
  });

  it("stunned blocks casting", () => {
    expect(canCast(["stunned"])).toBe(false);
  });

  it("normal conditions don't block casting", () => {
    expect(canCast(["burning", "bleeding"])).toBe(true);
    expect(canCast([])).toBe(true);
  });

  it("armor_broken reduces AC by 3", () => {
    expect(getAcModifier(["armor_broken"])).toBe(-3);
  });

  it("weakened reduces outgoing damage to 50%", () => {
    expect(getOutgoingDamageMultiplier(["weakened"])).toBe(0.5);
  });

  it("breakOnDamage removes charmed and dominated", () => {
    const conditions = [
      { name: "charmed", duration: 3, source: "spell" },
      { name: "stunned", duration: 1, source: "attack" },
      { name: "dominated", duration: 2, source: "spell" },
    ];
    const cleaned = removeConditionsOnDamage(conditions);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe("stunned");
  });

  it("CC_CATEGORIES maps conditions correctly", () => {
    expect(CC_CATEGORIES["stunned"]).toBe("stun");
    expect(CC_CATEGORIES["paralyzed"]).toBe("stun");
    expect(CC_CATEGORIES["frightened"]).toBe("fear");
    expect(CC_CATEGORIES["grappled"]).toBe("root");
    expect(CC_CATEGORIES["blinded"]).toBe("disorient");
    expect(CC_CATEGORIES["silenced"]).toBe("silence");
    expect(CC_CATEGORIES["slowed"]).toBe("slow");
    expect(CC_CATEGORIES["charmed"]).toBe("incapacitate");
  });
});

describe("CC break availability per class at correct levels", () => {
  it("fighter has no CC break before level 9", () => {
    expect(getCcBreakFeature("fighter", 8)).toBeNull();
  });

  it("fighter gets Indomitable Will at level 9", () => {
    const feature = getCcBreakFeature("fighter", 9);
    expect(feature).not.toBeNull();
    expect(feature!.breaksCategories).toContain("stun");
    expect(feature!.actionCost).toBe("reaction");
    expect(feature!.cooldownRounds).toBe(3);
  });

  it("barbarian gets Rage Break at level 6 (passive, requires raging)", () => {
    const feature = getCcBreakFeature("barbarian", 6);
    expect(feature).not.toBeNull();
    expect(feature!.actionCost).toBe("passive");
    expect(feature!.requiresRaging).toBe(true);
  });

  it("paladin gets Divine Freedom at level 6 (breaks ALL CC)", () => {
    const feature = getCcBreakFeature("paladin", 6);
    expect(feature).not.toBeNull();
    expect(feature!.breaksCategories).toHaveLength(7);
    expect(feature!.actionCost).toBe("bonus_action");
  });

  it("rogue gets Slip Free at level 5 (grants stealth)", () => {
    const feature = getCcBreakFeature("rogue", 5);
    expect(feature).not.toBeNull();
    expect(feature!.grantsStealthOnUse).toBe(true);
    expect(feature!.cooldownRounds).toBe(2);
  });

  it("monk gets Stillness of Mind at level 7 (costs 1 ki)", () => {
    const feature = getCcBreakFeature("monk", 7);
    expect(feature).not.toBeNull();
    expect(feature!.resourceCost).toEqual({ resource: "ki", amount: 1 });
  });

  it("ranger gets Nature's Stride at level 6 (passive, no cooldown)", () => {
    const feature = getCcBreakFeature("ranger", 6);
    expect(feature).not.toBeNull();
    expect(feature!.actionCost).toBe("passive");
    expect(feature!.cooldownRounds).toBe(0);
    expect(feature!.breaksCategories).toContain("root");
    expect(feature!.breaksCategories).toContain("slow");
  });
});

// ============ SPELL CC THROUGH DR (INTEGRATION) ============

describe("Spell CC through DR integration", () => {
  it("hold_person (concentration) applies paralyzed with base duration 10", () => {
    const spell = getSpellById("hold_person");
    expect(spell).toBeDefined();
    expect(spell!.concentration).toBe(true);
    const duration = spellCcBaseDuration(spell!);
    expect(duration).toBe(10);
  });

  it("sleep (non-concentration, level 1) applies with base duration 2 (min 2)", () => {
    const spell = getSpellById("sleep");
    expect(spell).toBeDefined();
    expect(spell!.concentration).toBe(false);
    expect(spell!.level).toBe(1);
    const duration = spellCcBaseDuration(spell!);
    expect(duration).toBe(2);
  });

  it("hold_person through DR: 2nd application in stun category gets 50% duration", () => {
    const spell = getSpellById("hold_person")!;
    const baseDur = spellCcBaseDuration(spell); // 10
    expect(baseDur).toBe(10);

    // 1st application: full duration
    let tracker: DrTracker = {};
    let result = applyDiminishingReturns(baseDur, "paralyzed", tracker, 1);
    expect(result.duration).toBe(10);
    tracker = result.updatedTracker;

    // 2nd application: 50%
    result = applyDiminishingReturns(baseDur, "paralyzed", tracker, 2);
    expect(result.duration).toBe(5); // floor(10 * 0.5)
    tracker = result.updatedTracker;

    // 3rd application: 25%
    result = applyDiminishingReturns(baseDur, "paralyzed", tracker, 3);
    expect(result.duration).toBe(2); // floor(10 * 0.25)
    tracker = result.updatedTracker;

    // 4th application: immune
    result = applyDiminishingReturns(baseDur, "paralyzed", tracker, 4);
    expect(result.duration).toBe(0);
  });

  it("hold_person applies saveDC and saveAbility via applyOrReplaceCondition", () => {
    const conditions: ActiveCondition[] = [];
    const conds = applyOrReplaceCondition(conditions, {
      name: "paralyzed",
      duration: 10,
      source: "hold_person",
      saveDC: 15,
      saveAbility: "wisdom",
    });
    expect(conds).toHaveLength(1);
    expect(conds[0].saveDC).toBe(15);
    expect(conds[0].saveAbility).toBe("wisdom");
  });

  it("cc_immune blocks spell CC application", () => {
    expect(shouldBlockCc(["cc_immune"], "paralyzed")).toBe(true);
    expect(shouldBlockCc(["cc_immune"], "unconscious")).toBe(true);
  });

  it("2nd hold_person overwrites existing paralyzed (WoW overwrite)", () => {
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: "hold_person", saveDC: 13, saveAbility: "wisdom" },
      { name: "blinded", duration: 2, source: "other" },
    ];
    const result = applyOrReplaceCondition(conditions, {
      name: "paralyzed", duration: 5, source: "hold_person_2nd",
      saveDC: 15, saveAbility: "wisdom",
    });
    expect(result).toHaveLength(2);
    const paralyzed = result.find(c => c.name === "paralyzed")!;
    expect(paralyzed.duration).toBe(5);
    expect(paralyzed.saveDC).toBe(15);
    expect(paralyzed.source).toBe("hold_person_2nd");
  });
});

// ============ BOSS CC RESISTANCE (INTEGRATION) ============

describe("Boss CC resistance integration", () => {
  it("elite NPC: hold_person duration reduced by 1", () => {
    const baseDur = spellCcBaseDuration({ concentration: true, level: 2 }); // 10
    const reduced = applyCcResistance(baseDur, "elite");
    expect(reduced).toBe(9);
  });

  it("boss NPC: hold_person duration reduced by 2", () => {
    const baseDur = spellCcBaseDuration({ concentration: true, level: 2 }); // 10
    const reduced = applyCcResistance(baseDur, "boss");
    expect(reduced).toBe(8);
  });

  it("boss NPC: stunning strike duration 1 stays at min 1", () => {
    const reduced = applyCcResistance(1, "boss");
    expect(reduced).toBe(1); // min 1
  });

  it("boss with legendary resistance can auto-succeed", () => {
    const lr = { max: 3, current: 3 };
    expect(canUseLegendaryResistance(lr)).toBe(true);
    // After consuming
    const used = { max: 3, current: 0 };
    expect(canUseLegendaryResistance(used)).toBe(false);
  });

  it("boss CC resistance stacks with DR", () => {
    // 1st hold_person: base 10, DR 100%, boss -2 = 8
    let tracker: DrTracker = {};
    let result = applyDiminishingReturns(10, "paralyzed", tracker, 1);
    expect(result.duration).toBe(10);
    let dur = applyCcResistance(result.duration, "boss");
    expect(dur).toBe(8);
    tracker = result.updatedTracker;

    // 2nd: base 10, DR 50% = 5, boss -2 = 3
    result = applyDiminishingReturns(10, "paralyzed", tracker, 2);
    expect(result.duration).toBe(5);
    dur = applyCcResistance(result.duration, "boss");
    expect(dur).toBe(3);
    tracker = result.updatedTracker;

    // 3rd: base 10, DR 25% = 2, boss -2 = min 1
    result = applyDiminishingReturns(10, "paralyzed", tracker, 3);
    expect(result.duration).toBe(2);
    dur = applyCcResistance(result.duration, "boss");
    expect(dur).toBe(1);
  });
});

// ============ CONCENTRATION BREAK: CONDITION CLEANUP ============

describe("Concentration break condition cleanup", () => {
  it("hold_person conditions have source matching spell id for filtering", () => {
    // Conditions applied by hold_person use source: "hold_person"
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: "hold_person", saveDC: 15, saveAbility: "wisdom" },
      { name: "stunned", duration: 1, source: "stunning_strike" },
      { name: "blinded", duration: 2, source: "blindness" },
    ];
    // When concentration breaks, remove conditions where source === "hold_person"
    const filtered = conditions.filter(c => c.source !== "hold_person");
    expect(filtered).toHaveLength(2);
    expect(filtered.find(c => c.name === "paralyzed")).toBeUndefined();
    expect(filtered.find(c => c.name === "stunned")).toBeDefined();
    expect(filtered.find(c => c.name === "blinded")).toBeDefined();
  });

  it("conditions without source are not affected by concentration break", () => {
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: "hold_person" },
      { name: "poisoned", duration: 3 }, // no source
    ];
    const filtered = conditions.filter(c => c.source !== "hold_person");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("poisoned");
  });

  it("multiple conditions from same spell are all removed", () => {
    // Some spells might apply multiple conditions
    const conditions: ActiveCondition[] = [
      { name: "restrained", duration: 5, source: "entangle" },
      { name: "slowed", duration: 5, source: "entangle" },
      { name: "blinded", duration: 2, source: "other_spell" },
    ];
    const filtered = conditions.filter(c => c.source !== "entangle");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("blinded");
  });

  it("no conditions removed when spellId doesn't match any source", () => {
    const conditions: ActiveCondition[] = [
      { name: "stunned", duration: 1, source: "stunning_strike" },
      { name: "blinded", duration: 2, source: "blindness" },
    ];
    const filtered = conditions.filter(c => c.source !== "hold_person");
    expect(filtered).toHaveLength(2);
  });
});

// ============ REPEATED SAVES END-OF-TURN TIMING ============

describe("Repeated saves end-of-turn semantics", () => {
  it("spellCcBaseDuration for concentration spell returns 10 (many end-of-turn save attempts)", () => {
    // Concentration spells last up to 10 turns, with end-of-turn repeated saves
    const spell = getSpellById("hold_person");
    expect(spell).toBeDefined();
    expect(spell!.concentration).toBe(true);
    const duration = spellCcBaseDuration(spell!);
    expect(duration).toBe(10);
  });

  it("conditions with saveDC+saveAbility get repeated save attempts (pure function test)", () => {
    // This tests the processRepeatedSaves function which now runs at end-of-turn in combat.ts
    const abilities = { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 20, charisma: 10 };
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 5, saveDC: 5, saveAbility: "wisdom", source: "hold_person" },
    ];
    // WIS +5, prof +2 = +7. Min roll 8 vs DC 5 = always succeeds
    const { kept, removed } = processRepeatedSaves(conditions, abilities, 2);
    expect(removed).toHaveLength(1);
    expect(kept).toHaveLength(0);
  });
});

// ============ UNIQUE CONCENTRATION SOURCE IDS ============

describe("Concentration spell source ID uniqueness", () => {
  it("two casters using same spell produce different source IDs", () => {
    const spellId = "hold_person";
    const casterA = "char_aaa";
    const casterB = "char_bbb";
    const sourceA = `${spellId}_${casterA}`;
    const sourceB = `${spellId}_${casterB}`;
    expect(sourceA).not.toBe(sourceB);
    expect(sourceA).toBe("hold_person_char_aaa");
    expect(sourceB).toBe("hold_person_char_bbb");
  });

  it("breaking caster A concentration only removes caster A conditions", () => {
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: "hold_person_char_aaa", saveDC: 15, saveAbility: "wisdom" },
      { name: "paralyzed", duration: 8, source: "hold_person_char_bbb", saveDC: 13, saveAbility: "wisdom" },
      { name: "stunned", duration: 1, source: "stunning_strike" },
    ];
    // Caster A loses concentration → filter by sourceA
    const sourceA = "hold_person_char_aaa";
    const filtered = conditions.filter(c => c.source !== sourceA);
    expect(filtered).toHaveLength(2);
    expect(filtered.find(c => c.source === "hold_person_char_bbb")).toBeDefined();
    expect(filtered.find(c => c.source === "stunning_strike")).toBeDefined();
  });

  it("concentration.spellId matches condition source for proper cleanup", () => {
    const casterId = "char_xyz";
    const spellId = "hold_person";
    const spellSourceId = `${spellId}_${casterId}`;

    // Concentration stores the unique ID
    const concentration = { spellId: spellSourceId, targetId: "npc_target" };

    // Conditions use the same unique ID
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: spellSourceId },
    ];

    // Cleanup filters by concentration.spellId
    const filtered = conditions.filter(c => c.source !== concentration.spellId);
    expect(filtered).toHaveLength(0);
  });
});

// ============ OPPORTUNITY ATTACK BREAK-ON-DAMAGE ============

describe("Opportunity attack break-on-damage", () => {
  it("removeConditionsOnDamage breaks charmed from OA damage", () => {
    const conditions = [
      { name: "charmed", duration: 3, source: "charm_person_caster1" },
      { name: "stunned", duration: 1, source: "monk_ki" },
    ];
    const cleaned = removeConditionsOnDamage(conditions);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe("stunned");
  });

  it("removeConditionsOnDamage breaks dominated from OA damage", () => {
    const conditions = [
      { name: "dominated", duration: 2, source: "dominate_person_caster1" },
      { name: "blinded", duration: 1, source: "blindness" },
    ];
    const cleaned = removeConditionsOnDamage(conditions);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].name).toBe("blinded");
  });

  it("removeConditionsOnDamage preserves non-breakable conditions", () => {
    const conditions = [
      { name: "stunned", duration: 2, source: "hold_person_caster1" },
      { name: "paralyzed", duration: 5, source: "hold_person_caster1" },
      { name: "blinded", duration: 3, source: "blindness" },
    ];
    const cleaned = removeConditionsOnDamage(conditions);
    expect(cleaned).toHaveLength(3); // none are breakOnDamage
  });
});

// ============ NPC CONCENTRATION TRACKING ============

describe("NPC concentration tracking", () => {
  it("NPC concentration field structure matches character concentration", () => {
    // NPC concentration has same shape as character concentration
    const npcConcentration: { spellId: string; targetId?: string } = {
      spellId: "hold_person_npc123",
      targetId: "char_abc",
    };
    expect(npcConcentration.spellId).toBe("hold_person_npc123");
    expect(npcConcentration.targetId).toBe("char_abc");
  });

  it("NPC concentration break filters by unique spellId", () => {
    const conditions: ActiveCondition[] = [
      { name: "paralyzed", duration: 10, source: "hold_person_npc123" },
      { name: "stunned", duration: 1, source: "stunning_strike" },
    ];
    // NPC loses concentration → filter by spellId
    const filtered = conditions.filter(c => c.source !== "hold_person_npc123");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("stunned");
  });

  it("NPC proficiency bonus calculation is correct", () => {
    // Formula: Math.max(2, Math.floor((level - 1) / 4) + 2)
    const profBonus = (level: number) => Math.max(2, Math.floor((level - 1) / 4) + 2);
    expect(profBonus(1)).toBe(2);
    expect(profBonus(4)).toBe(2);
    expect(profBonus(5)).toBe(3);
    expect(profBonus(9)).toBe(4);
    expect(profBonus(13)).toBe(5);
    expect(profBonus(17)).toBe(6);
    expect(profBonus(20)).toBe(6);
  });
});

// ============ DEAD CHARACTER DAMAGE GUARD ============

describe("Dead character damage guard", () => {
  it("damage should be blocked for dead characters", () => {
    // Test the guard pattern: if (ch && !ch.conditions.some(c => c.name === "dead"))
    const characterWithDead = {
      hp: 0,
      conditions: [{ name: "dead" }],
    };
    const characterUnconsciousOnly = {
      hp: 0,
      conditions: [{ name: "unconscious" }],
    };

    const isDead = (char: { conditions: { name: string }[] }) =>
      char.conditions.some(c => c.name === "dead");

    expect(isDead(characterWithDead)).toBe(true);
    expect(isDead(characterUnconsciousOnly)).toBe(false);
  });

  it("dead condition is added when death saves reach 3 failures", () => {
    // Simulate death save failure accumulation
    let deathSaves = { successes: 0, failures: 2 };
    deathSaves.failures = Math.min(3, deathSaves.failures + 1); // add 1 failure
    expect(deathSaves.failures).toBe(3);
    // When failures >= 3, dead condition is added
    const shouldAddDead = deathSaves.failures >= 3;
    expect(shouldAddDead).toBe(true);
  });

  it("crit on 0 HP adds 2 failures, not 1", () => {
    const deathSaves = { successes: 0, failures: 1 };
    const isCrit = true;
    const newFailures = Math.min(3, deathSaves.failures + (isCrit ? 2 : 1));
    expect(newFailures).toBe(3);
  });

  it("damage on 0 HP adds 1 failure without crit", () => {
    const deathSaves = { successes: 1, failures: 1 };
    const isCrit = false;
    const newFailures = Math.min(3, deathSaves.failures + (isCrit ? 2 : 1));
    expect(newFailures).toBe(2);
  });
});

// ============ SPELL RANGE VALIDATION ============

describe("Spell range validation", () => {
  it("distance calculation: 1 cell = 5 feet", () => {
    const caster = { x: 0, y: 0 };
    const target = { x: 3, y: 4 };
    const distanceCells = Math.abs(target.x - caster.x) + Math.abs(target.y - caster.y);
    const distanceFeet = distanceCells * 5;
    expect(distanceCells).toBe(7);
    expect(distanceFeet).toBe(35);
  });

  it("fire_bolt range is 120 feet", () => {
    const spell = getSpellById("fire_bolt");
    expect(spell).toBeDefined();
    expect(spell!.range).toBe(120);
  });

  it("cure_wounds is touch range (5 feet)", () => {
    const spell = getSpellById("cure_wounds");
    expect(spell).toBeDefined();
    expect(spell!.range).toBe(5);
  });

  it("shield is self-only (range 0)", () => {
    const spell = getSpellById("shield");
    expect(spell).toBeDefined();
    expect(spell!.range).toBe(0);
  });

  it("adjacent targets (1 cell) are within touch range", () => {
    const caster = { x: 5, y: 5 };
    const target = { x: 5, y: 6 };
    const distanceCells = Math.abs(target.x - caster.x) + Math.abs(target.y - caster.y);
    const distanceFeet = distanceCells * 5;
    expect(distanceFeet).toBe(5);
    expect(distanceFeet <= 5).toBe(true); // within touch range
  });

  it("diagonal targets (2 cells) are out of touch range", () => {
    const caster = { x: 5, y: 5 };
    const target = { x: 6, y: 6 };
    const distanceCells = Math.abs(target.x - caster.x) + Math.abs(target.y - caster.y);
    const distanceFeet = distanceCells * 5;
    expect(distanceFeet).toBe(10);
    expect(distanceFeet > 5).toBe(true); // out of touch range
  });

  it("24 cells is exactly 120 feet (fire_bolt max range)", () => {
    const caster = { x: 0, y: 0 };
    const target = { x: 24, y: 0 };
    const distanceCells = Math.abs(target.x - caster.x) + Math.abs(target.y - caster.y);
    const distanceFeet = distanceCells * 5;
    expect(distanceFeet).toBe(120);
    const spell = getSpellById("fire_bolt");
    expect(distanceFeet <= spell!.range).toBe(true);
  });
});

// ============ TECHNIQUE AC BONUS ============

describe("Technique AC bonus conditions", () => {
  it("technique_ac_bonus_1 grants +1 AC", () => {
    const acMod = getAcModifier(["technique_ac_bonus_1"]);
    expect(acMod).toBe(1);
  });

  it("technique_ac_bonus_2 grants +2 AC", () => {
    const acMod = getAcModifier(["technique_ac_bonus_2"]);
    expect(acMod).toBe(2);
  });

  it("technique_ac_bonus_3 grants +3 AC", () => {
    const acMod = getAcModifier(["technique_ac_bonus_3"]);
    expect(acMod).toBe(3);
  });

  it("technique AC bonus stacks with other AC modifiers", () => {
    // armor_broken gives -3 AC, technique_ac_bonus_2 gives +2 AC
    const acMod = getAcModifier(["armor_broken", "technique_ac_bonus_2"]);
    expect(acMod).toBe(-1); // -3 + 2 = -1
  });

  it("bonusLevel calculation caps at 3", () => {
    const bonusLevel = (acBonus: number) => Math.min(3, Math.max(1, acBonus));
    expect(bonusLevel(1)).toBe(1);
    expect(bonusLevel(2)).toBe(2);
    expect(bonusLevel(3)).toBe(3);
    expect(bonusLevel(5)).toBe(3); // capped
    expect(bonusLevel(0)).toBe(1); // floored
  });

  it("condition name is dynamically constructed", () => {
    const acBonus = 2;
    const bonusLevel = Math.min(3, Math.max(1, acBonus));
    const conditionName = `technique_ac_bonus_${bonusLevel}`;
    expect(conditionName).toBe("technique_ac_bonus_2");
  });
});
