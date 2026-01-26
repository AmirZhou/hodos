"use client";

import { useState, useCallback, useRef } from "react";
import { Id } from "../../convex/_generated/dataModel";

type StreamingStatus = "idle" | "streaming" | "complete" | "error";

interface StreamingState {
  status: StreamingStatus;
  text: string;
  isStreaming: boolean;
  error: string | null;
  parsedResponse: ParsedResponse | null;
}

interface ParsedResponse {
  narration?: { en: string; fr: string };
  npcDialogue?: Array<{ name: string; en: string; fr: string }>;
  vocabularyHighlights?: Array<{ word: string; translation: string; note?: string }>;
}

interface ExecuteParams {
  campaignId: Id<"campaigns">;
  characterId: Id<"characters">;
  input: string;
}

export function useStreamingAction() {
  const [state, setState] = useState<StreamingState>({
    status: "idle",
    text: "",
    isStreaming: false,
    error: null,
    parsedResponse: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (params: ExecuteParams) => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      status: "streaming",
      text: "",
      isStreaming: true,
      error: null,
      parsedResponse: null,
    });

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("CONVEX_URL not configured");
      }

      // Convert Convex URL to HTTP endpoint URL
      const httpUrl = convexUrl.replace(".convex.cloud", ".convex.site");

      const response = await fetch(`${httpUrl}/stream-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              // Stream complete - try to parse the accumulated JSON
              try {
                const parsed = JSON.parse(accumulatedText);
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  isStreaming: false,
                  parsedResponse: parsed,
                }));
              } catch {
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  isStreaming: false,
                }));
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content ?? "";
              accumulatedText += content;

              setState((prev) => ({
                ...prev,
                text: accumulatedText,
              }));
            } catch {
              // Ignore parse errors for partial JSON
            }
          }
        }
      }

      setState((prev) => ({
        ...prev,
        status: "complete",
        isStreaming: false,
      }));
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      setState({
        status: "error",
        text: "",
        isStreaming: false,
        error: (error as Error).message,
        parsedResponse: null,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      status: "idle",
      isStreaming: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      text: "",
      isStreaming: false,
      error: null,
      parsedResponse: null,
    });
  }, []);

  return {
    ...state,
    execute,
    cancel,
    reset,
  };
}
