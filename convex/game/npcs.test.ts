import { describe, it, expect } from "vitest";
import { extractNPCsFromResponse } from "./npcs";

describe("extractNPCsFromResponse", () => {
  it("extracts NPC names from dialogue", () => {
    const response = {
      npcDialogue: [
        { name: "Elara", text: "Hello" },
        { name: "Kael", text: "Welcome" },
      ],
    };

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual(["Elara", "Kael"]);
  });

  it("returns empty array when no dialogue", () => {
    const response = {
      npcDialogue: undefined,
    };

    const npcs = extractNPCsFromResponse(response);

    expect(npcs).toEqual([]);
  });

  it("deduplicates NPC names", () => {
    const response = {
      npcDialogue: [
        { name: "Elara", text: "Hello" },
        { name: "Elara", text: "Again" },
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
