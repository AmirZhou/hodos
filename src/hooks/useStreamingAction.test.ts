import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useStreamingAction } from "./useStreamingAction";

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useStreamingAction", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("starts with idle state", () => {
    const { result } = renderHook(() => useStreamingAction());

    expect(result.current.status).toBe("idle");
    expect(result.current.text).toBe("");
    expect(result.current.isStreaming).toBe(false);
  });

  it("sets streaming state when action starts", async () => {
    // Mock a streaming response
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    });

    const { result } = renderHook(() => useStreamingAction());

    act(() => {
      result.current.execute({
        campaignId: "test-campaign" as any,
        characterId: "test-char" as any,
        input: "look around",
      });
    });

    expect(result.current.status).toBe("streaming");
    expect(result.current.isStreaming).toBe(true);
  });
});
