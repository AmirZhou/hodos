import { describe, it, expect } from "vitest";
import { normalizeNpcName, findMatchingNpc } from "./npcNameResolver";

describe("normalizeNpcName", () => {
  it("returns lowercase trimmed name", () => {
    expect(normalizeNpcName("  Elara  ")).toBe("elara");
  });

  it("strips common title prefixes", () => {
    expect(normalizeNpcName("Mistress Elara")).toBe("elara");
    expect(normalizeNpcName("Sir Kael")).toBe("kael");
    expect(normalizeNpcName("Lady Isolde")).toBe("isolde");
    expect(normalizeNpcName("Lord Varen")).toBe("varen");
    expect(normalizeNpcName("Captain Durand")).toBe("durand");
    expect(normalizeNpcName("Master Renn")).toBe("renn");
    expect(normalizeNpcName("Madam Coralie")).toBe("coralie");
  });

  it("strips parenthetical suffixes", () => {
    expect(normalizeNpcName("Elara (Mistress)")).toBe("elara");
    expect(normalizeNpcName("Kael (Sir)")).toBe("kael");
    expect(normalizeNpcName("Isolde (the merchant)")).toBe("isolde");
  });

  it("strips quoted titles", () => {
    expect(normalizeNpcName('Elara "the Bold"')).toBe("elara");
  });

  it("handles combined title + parenthetical", () => {
    expect(normalizeNpcName("Mistress Elara (the Enchantress)")).toBe("elara");
  });

  it("handles single-word names without titles", () => {
    expect(normalizeNpcName("Elara")).toBe("elara");
  });

  it("preserves multi-word names that aren't titles", () => {
    expect(normalizeNpcName("Jean Pierre")).toBe("jean pierre");
  });

  it("handles 'the' as title", () => {
    expect(normalizeNpcName("The Blacksmith")).toBe("blacksmith");
  });
});

describe("findMatchingNpc", () => {
  const npcs = [
    { _id: "npc1" as any, name: "Elara" },
    { _id: "npc2" as any, name: "Sir Kael" },
    { _id: "npc3" as any, name: "Jean Pierre" },
  ];

  it("finds exact match", () => {
    expect(findMatchingNpc("Elara", npcs)).toBe("npc1");
  });

  it("finds match with different title", () => {
    expect(findMatchingNpc("Mistress Elara", npcs)).toBe("npc1");
  });

  it("finds match with parenthetical", () => {
    expect(findMatchingNpc("Elara (Mistress)", npcs)).toBe("npc1");
  });

  it("finds match when existing has title", () => {
    expect(findMatchingNpc("Kael", npcs)).toBe("npc2");
  });

  it("finds match with different title on existing", () => {
    expect(findMatchingNpc("Lord Kael", npcs)).toBe("npc2");
  });

  it("returns null for unknown NPC", () => {
    expect(findMatchingNpc("Unknown Person", npcs)).toBeNull();
  });

  it("finds multi-word name match", () => {
    expect(findMatchingNpc("Jean Pierre", npcs)).toBe("npc3");
  });

  it("is case insensitive", () => {
    expect(findMatchingNpc("ELARA", npcs)).toBe("npc1");
  });
});
