import { describe, it, expect } from "vitest";
import { extractNPCsFromResponse } from "./npcs";

describe("extractNPCsFromResponse", () => {
  it("extracts NPC names from dialogue", () => {
    const response = {
      npcDialogue: [
        { name: "Elara", en: "Hello", fr: "Bonjour" },
        { name: "Kael", en: "Welcome", fr: "Bienvenue" },
      ],
    };

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual(["Elara", "Kael"]);
  });

  it("returns empty array when no dialogue", () => {
    const response = {
      narration: { en: "The room is dark", fr: "La pièce est sombre" },
    };

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual([]);
  });

  it("deduplicates NPC names", () => {
    const response = {
      npcDialogue: [
        { name: "Elara", en: "Hello", fr: "Bonjour" },
        { name: "Elara", en: "Again", fr: "Encore" },
      ],
    };

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual(["Elara"]);
  });

  it("handles undefined npcDialogue", () => {
    const response = {};

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual([]);
  });
});
