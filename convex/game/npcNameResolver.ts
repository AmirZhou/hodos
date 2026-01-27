const TITLE_PREFIXES = [
  "mistress", "master", "sir", "lady", "lord", "dame",
  "captain", "commander", "sergeant", "lieutenant",
  "father", "mother", "sister", "brother",
  "madam", "madame", "monsieur",
  "professor", "doctor", "dr",
  "prince", "princess", "king", "queen",
  "elder", "chief", "mayor",
  "the",
];

/**
 * Normalize an NPC name by stripping titles, parentheticals, and quotes.
 * Used to match AI-generated name variations to existing NPCs.
 */
export function normalizeNpcName(raw: string): string {
  let name = raw.trim();

  // Remove parenthetical suffixes: "Elara (Mistress)" → "Elara"
  name = name.replace(/\s*\([^)]*\)\s*$/, "").trim();

  // Remove quoted suffixes: 'Elara "the Bold"' → "Elara"
  name = name.replace(/\s*"[^"]*"\s*$/, "").trim();

  name = name.toLowerCase();

  // Strip leading title prefix (only the first one)
  for (const title of TITLE_PREFIXES) {
    const prefix = title + " ";
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length).trim();
      break;
    }
  }

  return name;
}

/**
 * Find an existing NPC that matches a given name (with fuzzy title matching).
 * Returns the NPC's _id or null if no match found.
 */
export function findMatchingNpc(
  name: string,
  existingNpcs: Array<{ _id: any; name: string }>
): any | null {
  const normalized = normalizeNpcName(name);

  for (const npc of existingNpcs) {
    if (normalizeNpcName(npc.name) === normalized) {
      return npc._id;
    }
  }

  return null;
}
