import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStreamingAction } from "./useStreamingAction";

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useStreamingAction", () => {
  const originalEnv = process.env.NEXT_PUBLIC_CONVEX_URL;

  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_CONVEX_URL = originalEnv;
  });

  it("starts with idle state", () => {
    const { result } = renderHook(() => useStreamingAction());

    expect(result.current.status).toBe("idle");
    expect(result.current.text).toBe("");
    expect(result.current.isStreaming).toBe(false);
  });

  it("accumulates text from streaming chunks", async () => {
    // Mock a streaming response with multiple chunks
    let readCount = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(() => {
        readCount++;
        if (readCount === 1) {
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'),
          });
        } else if (readCount === 2) {
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'),
          });
        } else if (readCount === 3) {
          return Promise.resolve({
            done: false,
            value: new TextEncoder().encode("data: [DONE]\n\n"),
          });
        }
        return Promise.resolve({ done: true, value: undefined });
      }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useStreamingAction());

    await act(async () => {
      await result.current.execute({
        campaignId: "test-campaign" as any,
        characterId: "test-char" as any,
        input: "look around",
      });
    });

    expect(result.current.text).toBe("Hello world");
    expect(result.current.status).toBe("complete");
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useStreamingAction());

    await act(async () => {
      await result.current.execute({
        campaignId: "test-campaign" as any,
        characterId: "test-char" as any,
        input: "look around",
      });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
  });

  it("can reset state", () => {
    const { result } = renderHook(() => useStreamingAction());

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.text).toBe("");
  });
});
