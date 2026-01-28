import { describe, it, expect } from "vitest";
import { formatNpcMemoryForPrompt } from "./dm";

describe("formatNpcMemoryForPrompt", () => {
  it("returns empty string for undefined memory", () => {
    const result = formatNpcMemoryForPrompt(undefined);
    expect(result).toBe("");
  });

  it("formats emotional state", () => {
    const memory = {
      keyMoments: [],
      emotionalState: {
        currentMood: "curious",
        feelingsTowardCharacter: "growing fondness",
        trustLevel: 65,
        attractionLevel: 40,
        lastUpdated: Date.now(),
      },
      relationshipStatus: {
        type: "acquaintance" as const,
        dynamicEstablished: false,
        sharedSecrets: [],
      },
    };

    const result = formatNpcMemoryForPrompt(memory);

    expect(result).toContain("Current Mood: curious");
    expect(result).toContain("Feelings: growing fondness");
    expect(result).toContain("Trust: 65/100");
    expect(result).toContain("Attraction: 40/100");
  });

  it("formats relationship status", () => {
    const memory = {
      keyMoments: [],
      emotionalState: {
        currentMood: "happy",
        feelingsTowardCharacter: "friendly",
        trustLevel: 70,
        attractionLevel: 50,
        lastUpdated: Date.now(),
      },
      relationshipStatus: {
        type: "friend" as const,
        dynamicEstablished: true,
        sharedSecrets: ["knows about player's past"],
      },
    };

    const result = formatNpcMemoryForPrompt(memory);

    expect(result).toContain("Relationship Type: friend");
    expect(result).toContain("Dynamic Established: Yes");
    expect(result).toContain("Shared Secrets:");
    expect(result).toContain("knows about player's past");
  });

  it("formats key moments", () => {
    const memory = {
      keyMoments: [
        {
          timestamp: Date.now() - 86400000, // 1 day ago
          summary: "Player saved NPC from bandits",
          emotionalImpact: 8,
          tags: ["rescue", "trust"],
        },
        {
          timestamp: Date.now() - 3600000, // 1 hour ago
          summary: "Shared a romantic dinner",
          emotionalImpact: 7,
          tags: ["romance", "bonding"],
        },
      ],
      emotionalState: {
        currentMood: "grateful",
        feelingsTowardCharacter: "deep affection",
        trustLevel: 85,
        attractionLevel: 70,
        lastUpdated: Date.now(),
      },
      relationshipStatus: {
        type: "intimate" as const,
        dynamicEstablished: true,
        sharedSecrets: [],
      },
    };

    const result = formatNpcMemoryForPrompt(memory);

    expect(result).toContain("Key Memories:");
    expect(result).toContain("Player saved NPC from bandits");
    expect(result).toContain("Shared a romantic dinner");
    expect(result).toContain("(impact: 8)");
    expect(result).toContain("(impact: 7)");
  });

  it("handles empty key moments", () => {
    const memory = {
      keyMoments: [],
      emotionalState: {
        currentMood: "neutral",
        feelingsTowardCharacter: "indifferent",
        trustLevel: 50,
        attractionLevel: 0,
        lastUpdated: Date.now(),
      },
      relationshipStatus: {
        type: "stranger" as const,
        dynamicEstablished: false,
        sharedSecrets: [],
      },
    };

    const result = formatNpcMemoryForPrompt(memory);

    // Should not include Key Memories section
    expect(result).not.toContain("Key Memories:");
  });

  it("handles empty shared secrets", () => {
    const memory = {
      keyMoments: [],
      emotionalState: {
        currentMood: "neutral",
        feelingsTowardCharacter: "indifferent",
        trustLevel: 50,
        attractionLevel: 0,
        lastUpdated: Date.now(),
      },
      relationshipStatus: {
        type: "stranger" as const,
        dynamicEstablished: false,
        sharedSecrets: [],
      },
    };

    const result = formatNpcMemoryForPrompt(memory);

    // Should not include Shared Secrets section
    expect(result).not.toContain("Shared Secrets:");
  });
});
