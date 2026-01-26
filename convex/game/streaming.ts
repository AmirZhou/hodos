import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

export interface StreamChunk {
  index: number;
  text: string;
  isFinal: boolean;
}

// Parse DeepSeek SSE streaming format into chunks
export function parseStreamingChunks(rawChunks: string[]): StreamChunk[] {
  return rawChunks.map((raw, index) => {
    if (raw === "data: [DONE]") {
      return { index, text: "", isFinal: true };
    }

    try {
      const jsonStr = raw.replace(/^data: /, "");
      const parsed = JSON.parse(jsonStr);
      const content = parsed.choices?.[0]?.delta?.content ?? "";
      return { index, text: content, isFinal: false };
    } catch {
      return { index, text: "", isFinal: false };
    }
  });
}

// Store a streaming response session
export const createStreamSession = mutation({
  args: {
    campaignId: v.id("campaigns"),
    type: v.union(v.literal("narration"), v.literal("dialogue")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("streamingSessions", {
      campaignId: args.campaignId,
      type: args.type,
      chunks: [],
      isComplete: false,
      createdAt: Date.now(),
    });
  },
});

// Add a chunk to the streaming session
export const addChunk = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    chunk: v.object({
      index: v.number(),
      text: v.string(),
      isFinal: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Streaming session not found");

    const newChunks = [...session.chunks, args.chunk];

    await ctx.db.patch(args.sessionId, {
      chunks: newChunks,
      isComplete: args.chunk.isFinal,
    });
  },
});

// Subscribe to streaming session updates
export const getStreamSession = query({
  args: {
    sessionId: v.id("streamingSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Reconstruct text from chunks
    const sortedChunks = [...session.chunks].sort((a, b) => a.index - b.index);
    const text = sortedChunks.map((c) => c.text).join("");

    return {
      ...session,
      currentText: text,
    };
  },
});

// Complete the streaming session and save to game log
export const completeStream = mutation({
  args: {
    sessionId: v.id("streamingSessions"),
    gameLogData: v.object({
      campaignId: v.id("campaigns"),
      type: v.union(
        v.literal("narration"),
        v.literal("dialogue"),
        v.literal("action"),
        v.literal("roll"),
        v.literal("system"),
        v.literal("ooc")
      ),
      contentEn: v.string(),
      contentFr: v.string(),
      actorType: v.optional(
        v.union(v.literal("dm"), v.literal("character"), v.literal("npc"))
      ),
      actorName: v.optional(v.string()),
      annotations: v.optional(
        v.object({
          vocabulary: v.array(
            v.object({
              word: v.string(),
              translation: v.string(),
              note: v.optional(v.string()),
            })
          ),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    // Mark streaming session as complete
    await ctx.db.patch(args.sessionId, { isComplete: true });

    // Save to game log
    const logId = await ctx.db.insert("gameLog", {
      ...args.gameLogData,
      createdAt: Date.now(),
    });

    return { logId };
  },
});
