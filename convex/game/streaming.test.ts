import { describe, it, expect } from "vitest";
import { parseStreamingChunks } from "./streaming";

describe("parseStreamingChunks", () => {
  it("parses DeepSeek streaming response into chunks", () => {
    const rawChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: {"choices":[{"delta":{"content":"!"}}]}',
      "data: [DONE]",
    ];

    const result = parseStreamingChunks(rawChunks);

    expect(result).toEqual([
      { index: 0, text: "Hello", isFinal: false },
      { index: 1, text: " world", isFinal: false },
      { index: 2, text: "!", isFinal: false },
      { index: 3, text: "", isFinal: true },
    ]);
  });

  it("handles empty content chunks", () => {
    const rawChunks = [
      'data: {"choices":[{"delta":{}}]}',
      'data: {"choices":[{"delta":{"content":"Hi"}}]}',
      "data: [DONE]",
    ];

    const result = parseStreamingChunks(rawChunks);

    expect(result).toEqual([
      { index: 0, text: "", isFinal: false },
      { index: 1, text: "Hi", isFinal: false },
      { index: 2, text: "", isFinal: true },
    ]);
  });

  it("returns empty array for empty input", () => {
    const result = parseStreamingChunks([]);
    expect(result).toEqual([]);
  });
});
