/**
 * Data validation utilities for clamping, string validation, and dice parsing.
 */

export function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(hp, maxHp));
}

export function clampAffinity(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function validateStringLength(
  str: string,
  maxLen: number,
  fieldName: string,
): string {
  const trimmed = str.trim();
  if (trimmed.length > maxLen) {
    throw new Error(
      `${fieldName} exceeds maximum length of ${maxLen} characters`,
    );
  }
  return trimmed;
}

/**
 * Validate a dice string matches standard D&D notation.
 * Supports: "2d6", "1d8+3", "2d6+1d4", "3d6+2", "2d6+1d6 fire"
 */
const DICE_PATTERN = /^(\d+d\d+(\s*\+\s*\d+d\d+)*(\s*\+\s*\d+)?(\s+\w+)?)$/;

export function validateDiceString(dice: string): boolean {
  return DICE_PATTERN.test(dice.trim());
}

/**
 * Parse and roll a dice string, returning the total.
 * e.g. "2d6+3" → rolls 2d6 and adds 3
 */
export function parseDiceString(
  dice: string,
): { total: number; rolls: number[]; modifier: number } {
  const trimmed = dice.trim().replace(/\s+\w+$/, ""); // strip damage type suffix
  const parts = trimmed.split(/\s*\+\s*/);

  let total = 0;
  let modifier = 0;
  const rolls: number[] = [];

  for (const part of parts) {
    if (part.includes("d")) {
      const [countStr, sidesStr] = part.split("d");
      const count = parseInt(countStr, 10);
      const sides = parseInt(sidesStr, 10);
      if (isNaN(count) || isNaN(sides) || count < 1 || sides < 1) {
        throw new Error(`Invalid dice notation: ${part}`);
      }
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        throw new Error(`Invalid dice modifier: ${part}`);
      }
      modifier += num;
      total += num;
    }
  }

  return { total, rolls, modifier };
}
