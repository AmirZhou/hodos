import { describe, it, expect, vi } from "vitest";
import { StreamingTextAccumulator } from "./streaming";

describe("StreamingTextAccumulator", () => {
  it("accumulates text chunks in order", () => {
    const accumulator = new StreamingTextAccumulator();

    accumulator.addChunk({ index: 0, text: "Hello " });
    accumulator.addChunk({ index: 1, text: "world" });
    accumulator.addChunk({ index: 2, text: "!" });

    expect(accumulator.getText()).toBe("Hello world!");
  });

  it("handles out-of-order chunks", () => {
    const accumulator = new StreamingTextAccumulator();

    accumulator.addChunk({ index: 2, text: "!" });
    accumulator.addChunk({ index: 0, text: "Hello " });
    accumulator.addChunk({ index: 1, text: "world" });

    expect(accumulator.getText()).toBe("Hello world!");
  });

  it("calls onUpdate callback when text changes", () => {
    const onUpdate = vi.fn();
    const accumulator = new StreamingTextAccumulator({ onUpdate });

    accumulator.addChunk({ index: 0, text: "Hello" });

    expect(onUpdate).toHaveBeenCalledWith("Hello");
  });

  it("marks as complete when final chunk received", () => {
    const accumulator = new StreamingTextAccumulator();

    accumulator.addChunk({ index: 0, text: "Hello", isFinal: false });
    expect(accumulator.isComplete()).toBe(false);

    accumulator.addChunk({ index: 1, text: "!", isFinal: true });
    expect(accumulator.isComplete()).toBe(true);
  });

  it("calls onComplete callback when final chunk received", () => {
    const onComplete = vi.fn();
    const accumulator = new StreamingTextAccumulator({ onComplete });

    accumulator.addChunk({ index: 0, text: "Done", isFinal: true });

    expect(onComplete).toHaveBeenCalledWith("Done");
  });

  it("returns empty string when no chunks added", () => {
    const accumulator = new StreamingTextAccumulator();
    expect(accumulator.getText()).toBe("");
  });
});
