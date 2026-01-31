import { getItemById, getBindingRule } from "../data/equipmentItems";
import type { Rarity, BindingRule } from "../data/equipmentItems";

export interface RawItemGrant {
  itemId: string;
  source: string;
  reason: string;
}

export interface ValidatedGrant {
  itemId: string;
  source: string;
  reason: string;
  itemName: string;
  rarity: Rarity;
  bindingRule: BindingRule;
}

export interface ValidationResult {
  valid: ValidatedGrant[];
  warnings: string[];
}

const RARITY_MIN_LEVEL: Record<Rarity, number> = {
  mundane: 1,
  common: 1,
  uncommon: 1,
  rare: 5,
  epic: 10,
  legendary: 15,
};

export function validateItemGrants(
  raw: unknown,
  opts: { characterLevel: number; maxPerResponse: number }
): ValidationResult {
  const valid: ValidatedGrant[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(raw)) {
    return { valid, warnings };
  }

  const seen = new Set<string>();

  for (const grant of raw) {
    // Shape validation
    if (!grant || typeof grant.itemId !== "string" || !grant.itemId) {
      warnings.push(`Skipped grant with missing/invalid itemId: ${JSON.stringify(grant)}`);
      continue;
    }

    const { itemId, source, reason } = grant as RawItemGrant;

    // Dedup
    if (seen.has(itemId)) {
      warnings.push(`Skipped duplicate item: ${itemId}`);
      continue;
    }
    seen.add(itemId);

    // Max per response
    if (valid.length >= opts.maxPerResponse) {
      warnings.push(`Skipped ${itemId}: exceeded limit of ${opts.maxPerResponse} items per response`);
      continue;
    }

    // Item existence
    const item = getItemById(itemId);
    if (!item) {
      warnings.push(`Unknown item ID: ${itemId}`);
      continue;
    }

    // Rarity gate
    const minLevel = RARITY_MIN_LEVEL[item.rarity];
    if (opts.characterLevel < minLevel) {
      warnings.push(
        `Blocked ${itemId} (${item.name}): rarity ${item.rarity} requires level ${minLevel}, character is level ${opts.characterLevel}`
      );
      continue;
    }

    valid.push({
      itemId,
      source: source || "unknown",
      reason: reason || item.name,
      itemName: item.name,
      rarity: item.rarity,
    });
  }

  return { valid, warnings };
}
