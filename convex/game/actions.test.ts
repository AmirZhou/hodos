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

describe("sanitizeLinguisticAnalysis", () => {
  it("sanitizes complete linguistic analysis", () => {
    const input = {
      grammar: ["Present tense used", "Feminine agreement"],
      vocabulary: [
        {
          word: "lumière",
          translation: "light",
          partOfSpeech: "noun",
          usage: "feminine noun",
          extraField: "should be removed",
        },
      ],
      usageNotes: ["Formal register"],
      extraField: "should be removed",
    };

    const result = sanitizeLinguisticAnalysis(input);

    expect(result).toEqual({
      grammar: ["Present tense used", "Feminine agreement"],
      vocabulary: [
        {
          word: "lumière",
          translation: "light",
          partOfSpeech: "noun",
          usage: "feminine noun",
        },
      ],
      usageNotes: ["Formal register"],
    });
  });

  it("returns undefined for undefined input", () => {
    const result = sanitizeLinguisticAnalysis(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty analysis", () => {
    const input = {
      grammar: [],
      vocabulary: [],
      usageNotes: [],
    };

    const result = sanitizeLinguisticAnalysis(input);
    expect(result).toBeUndefined();
  });

  it("handles missing fields gracefully", () => {
    const input = {
      grammar: ["A grammar note"],
    };

    const result = sanitizeLinguisticAnalysis(input);

    expect(result).toEqual({
      grammar: ["A grammar note"],
      vocabulary: [],
      usageNotes: [],
    });
  });

  it("handles vocabulary without optional usage field", () => {
    const input = {
      grammar: [],
      vocabulary: [
        {
          word: "bonjour",
          translation: "hello",
          partOfSpeech: "interjection",
        },
      ],
      usageNotes: [],
    };

    const result = sanitizeLinguisticAnalysis(input);

    expect(result).toEqual({
      grammar: [],
      vocabulary: [
        {
          word: "bonjour",
          translation: "hello",
          partOfSpeech: "interjection",
        },
      ],
      usageNotes: [],
    });
  });

  it("converts non-string values to strings", () => {
    const input = {
      grammar: [123, true, "valid"],
      vocabulary: [
        {
          word: 456,
          translation: null,
          partOfSpeech: undefined,
        },
      ],
      usageNotes: [false, "note"],
    };

    const result = sanitizeLinguisticAnalysis(input as any);

    // null/undefined/falsy values become empty strings, "unknown" for partOfSpeech
    expect(result).toEqual({
      grammar: ["123", "true", "valid"],
      vocabulary: [
        {
          word: "456",
          translation: "",
          partOfSpeech: "unknown",
        },
      ],
      usageNotes: ["false", "note"],
    });
  });
});
