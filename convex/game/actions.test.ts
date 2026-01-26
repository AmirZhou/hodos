import { describe, it, expect } from "vitest";
import { sanitizeVocabulary, sanitizeLinguisticAnalysis } from "./actions";

describe("sanitizeVocabulary", () => {
  it("strips extra fields from vocabulary items", () => {
    const input = [
      {
        word: "dalle",
        translation: "flagstone",
        fr: "A flat stone slab used for flooring",
      },
      {
        word: "couloir",
        translation: "corridor",
        note: "Common in dungeon descriptions",
      },
    ];

    const result = sanitizeVocabulary(input);

    expect(result).toEqual([
      {
        word: "dalle",
        translation: "flagstone",
      },
      {
        word: "couloir",
        translation: "corridor",
        note: "Common in dungeon descriptions",
      },
    ]);
  });

  it("handles empty array", () => {
    const result = sanitizeVocabulary([]);
    expect(result).toEqual([]);
  });

  it("handles undefined input", () => {
    const result = sanitizeVocabulary(undefined);
    expect(result).toEqual([]);
  });

  it("preserves only word, translation, and note fields", () => {
    const input = [
      {
        word: "test",
        translation: "test",
        note: "a note",
        extra1: "remove",
        extra2: 123,
        fr: "should be removed",
      },
    ];

    const result = sanitizeVocabulary(input);

    expect(result).toEqual([
      {
        word: "test",
        translation: "test",
        note: "a note",
      },
    ]);
  });
});
