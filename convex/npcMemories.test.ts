import { describe, it, expect } from "vitest";
import {
  createDefaultMemory,
  addKeyMomentToMemory,
  updateEmotionalStateInMemory,
  clampValue,
  MAX_KEY_MOMENTS,
} from "./npcMemories";

describe("npcMemories helpers", () => {
  describe("createDefaultMemory", () => {
    it("creates memory with neutral emotional state", () => {
      const memory = createDefaultMemory();

      expect(memory.keyMoments).toEqual([]);
      expect(memory.emotionalState.currentMood).toBe("neutral");
      expect(memory.emotionalState.feelingsTowardCharacter).toBe("indifferent");
      expect(memory.emotionalState.trustLevel).toBe(50);
      expect(memory.emotionalState.attractionLevel).toBe(0);
    });

    it("creates memory with stranger relationship", () => {
      const memory = createDefaultMemory();

      expect(memory.relationshipStatus.type).toBe("stranger");
      expect(memory.relationshipStatus.dynamicEstablished).toBe(false);
      expect(memory.relationshipStatus.sharedSecrets).toEqual([]);
    });
  });

  describe("addKeyMomentToMemory", () => {
    it("adds moment to empty memory", () => {
      const memory = createDefaultMemory();
      const moment = {
        date: Date.now(),
        summary: "Hero saved Elara from bandits",
        emotionalImpact: 8,
        tags: ["rescue", "trust-building"],
      };

      const updated = addKeyMomentToMemory(memory, moment);

      expect(updated.keyMoments).toHaveLength(1);
      expect(updated.keyMoments[0].summary).toBe("Hero saved Elara from bandits");
      expect(updated.keyMoments[0].emotionalImpact).toBe(8);
      expect(updated.keyMoments[0].tags).toContain("rescue");
    });

    it("adds moment to existing moments", () => {
      const memory = createDefaultMemory();
      const moment1 = {
        date: Date.now(),
        summary: "First meeting",
        emotionalImpact: 3,
        tags: ["introduction"],
      };
      const moment2 = {
        date: Date.now() + 1000,
        summary: "Shared a meal",
        emotionalImpact: 5,
        tags: ["bonding"],
      };

      const updated1 = addKeyMomentToMemory(memory, moment1);
      const updated2 = addKeyMomentToMemory(updated1, moment2);

      expect(updated2.keyMoments).toHaveLength(2);
      expect(updated2.keyMoments[1].summary).toBe("Shared a meal");
    });

    it("limits to MAX_KEY_MOMENTS, keeping most recent", () => {
      let memory = createDefaultMemory();

      // Add more than MAX_KEY_MOMENTS
      for (let i = 0; i < MAX_KEY_MOMENTS + 5; i++) {
        memory = addKeyMomentToMemory(memory, {
          date: Date.now() + i * 1000,
          summary: `Moment ${i}`,
          emotionalImpact: i % 10,
          tags: [],
        });
      }

      expect(memory.keyMoments).toHaveLength(MAX_KEY_MOMENTS);
      // Should have moments 5-14 (the last 10)
      expect(memory.keyMoments[0].summary).toBe("Moment 5");
      expect(memory.keyMoments[MAX_KEY_MOMENTS - 1].summary).toBe(`Moment ${MAX_KEY_MOMENTS + 4}`);
    });

    it("does not mutate original memory", () => {
      const memory = createDefaultMemory();
      const moment = {
        date: Date.now(),
        summary: "Test",
        emotionalImpact: 5,
        tags: [],
      };

      addKeyMomentToMemory(memory, moment);

      expect(memory.keyMoments).toHaveLength(0);
    });
  });

  describe("updateEmotionalStateInMemory", () => {
    it("updates emotional state fields", () => {
      const memory = createDefaultMemory();
      const newState = {
        currentMood: "grateful",
        feelingsTowardCharacter: "growing affection",
        trustLevel: 75,
        attractionLevel: 60,
      };

      const updated = updateEmotionalStateInMemory(memory, newState);

      expect(updated.emotionalState.currentMood).toBe("grateful");
      expect(updated.emotionalState.feelingsTowardCharacter).toBe("growing affection");
      expect(updated.emotionalState.trustLevel).toBe(75);
      expect(updated.emotionalState.attractionLevel).toBe(60);
    });

    it("clamps trust level to 0-100", () => {
      const memory = createDefaultMemory();

      const highTrust = updateEmotionalStateInMemory(memory, {
        currentMood: "happy",
        feelingsTowardCharacter: "loves",
        trustLevel: 150,
        attractionLevel: 50,
      });

      const lowTrust = updateEmotionalStateInMemory(memory, {
        currentMood: "angry",
        feelingsTowardCharacter: "hates",
        trustLevel: -20,
        attractionLevel: 50,
      });

      expect(highTrust.emotionalState.trustLevel).toBe(100);
      expect(lowTrust.emotionalState.trustLevel).toBe(0);
    });

    it("clamps attraction level to 0-100", () => {
      const memory = createDefaultMemory();

      const highAttraction = updateEmotionalStateInMemory(memory, {
        currentMood: "happy",
        feelingsTowardCharacter: "smitten",
        trustLevel: 50,
        attractionLevel: 200,
      });

      const lowAttraction = updateEmotionalStateInMemory(memory, {
        currentMood: "neutral",
        feelingsTowardCharacter: "indifferent",
        trustLevel: 50,
        attractionLevel: -50,
      });

      expect(highAttraction.emotionalState.attractionLevel).toBe(100);
      expect(lowAttraction.emotionalState.attractionLevel).toBe(0);
    });

    it("does not mutate original memory", () => {
      const memory = createDefaultMemory();

      updateEmotionalStateInMemory(memory, {
        currentMood: "happy",
        feelingsTowardCharacter: "friendly",
        trustLevel: 80,
        attractionLevel: 40,
      });

      expect(memory.emotionalState.trustLevel).toBe(50);
    });
  });

  describe("clampValue", () => {
    it("returns value when within range", () => {
      expect(clampValue(50, 0, 100)).toBe(50);
      expect(clampValue(0, 0, 100)).toBe(0);
      expect(clampValue(100, 0, 100)).toBe(100);
    });

    it("clamps to min when below", () => {
      expect(clampValue(-10, 0, 100)).toBe(0);
      expect(clampValue(-1000, 0, 100)).toBe(0);
    });

    it("clamps to max when above", () => {
      expect(clampValue(150, 0, 100)).toBe(100);
      expect(clampValue(1000, 0, 100)).toBe(100);
    });
  });
});
