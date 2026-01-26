// Dice rolling utilities for the rules engine

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

export function rollWithAdvantage(): { rolls: [number, number]; result: number } {
  const roll1 = rollD20();
  const roll2 = rollD20();
  return {
    rolls: [roll1, roll2],
    result: Math.max(roll1, roll2),
  };
}

export function rollWithDisadvantage(): { rolls: [number, number]; result: number } {
  const roll1 = rollD20();
  const roll2 = rollD20();
  return {
    rolls: [roll1, roll2],
    result: Math.min(roll1, roll2),
  };
}

export function calculateModifier(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

export function makeAbilityCheck(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  hasExpertise: boolean = false,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): {
  roll: number;
  modifier: number;
  total: number;
  naturalRoll: number;
} {
  const modifier = calculateModifier(abilityScore);
  let profBonus = 0;
  if (hasExpertise) {
    profBonus = proficiencyBonus * 2;
  } else if (isProficient) {
    profBonus = proficiencyBonus;
  }

  let rollResult: { rolls?: [number, number]; result: number };

  if (hasAdvantage && !hasDisadvantage) {
    rollResult = rollWithAdvantage();
  } else if (hasDisadvantage && !hasAdvantage) {
    rollResult = rollWithDisadvantage();
  } else {
    rollResult = { result: rollD20() };
  }

  return {
    roll: rollResult.result,
    modifier: modifier + profBonus,
    total: rollResult.result + modifier + profBonus,
    naturalRoll: rollResult.result,
  };
}

export function makeAttackRoll(
  abilityScore: number,
  proficiencyBonus: number,
  targetAc: number,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): {
  roll: number;
  modifier: number;
  total: number;
  hits: boolean;
  isCritical: boolean;
  isCriticalMiss: boolean;
} {
  const modifier = calculateModifier(abilityScore) + proficiencyBonus;

  let rollResult: { rolls?: [number, number]; result: number };

  if (hasAdvantage && !hasDisadvantage) {
    rollResult = rollWithAdvantage();
  } else if (hasDisadvantage && !hasAdvantage) {
    rollResult = rollWithDisadvantage();
  } else {
    rollResult = { result: rollD20() };
  }

  const isCritical = rollResult.result === 20;
  const isCriticalMiss = rollResult.result === 1;
  const total = rollResult.result + modifier;
  const hits = isCritical || (!isCriticalMiss && total >= targetAc);

  return {
    roll: rollResult.result,
    modifier,
    total,
    hits,
    isCritical,
    isCriticalMiss,
  };
}

export function rollDamage(
  diceCount: number,
  diceSides: number,
  modifier: number,
  isCritical: boolean = false
): {
  rolls: number[];
  total: number;
} {
  const actualDiceCount = isCritical ? diceCount * 2 : diceCount;
  const rolls = rollDice(actualDiceCount, diceSides);
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

  return {
    rolls,
    total: Math.max(0, total), // Damage can't be negative
  };
}

export function makeSavingThrow(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
  dc: number,
  hasAdvantage: boolean = false,
  hasDisadvantage: boolean = false
): {
  roll: number;
  modifier: number;
  total: number;
  success: boolean;
} {
  const result = makeAbilityCheck(
    abilityScore,
    proficiencyBonus,
    isProficient,
    false,
    hasAdvantage,
    hasDisadvantage
  );

  return {
    ...result,
    success: result.total >= dc,
  };
}
