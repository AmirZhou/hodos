import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getStreamingConfig } from "./ai/llmProvider";

const http = httpRouter();

// Streaming AI response endpoint
http.route({
  path: "/stream-action",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { campaignId, characterId, input } = body as {
      campaignId: Id<"campaigns">;
      characterId: Id<"characters">;
      input: string;
    };

    // Get provider config
    const { provider, apiUrl, apiKey, model } = getStreamingConfig();

    // Get context data
    const character = await ctx.runQuery(api.characters.get, { characterId });
    if (!character) {
      return new Response("Character not found", { status: 404 });
    }

    const recentLogs = await ctx.runQuery(api.game.log.getRecent, {
      campaignId,
      limit: 10,
    });

    // Log player action first
    await ctx.runMutation(api.game.log.add, {
      campaignId,
      type: "action",
      content: input,
      actorType: "character",
      actorId: characterId,
      actorName: character.name,
    });

    // Build the prompt
    const contextMessage = `
Recent game history:
${recentLogs?.map((log) => `${log.actorName || "DM"}: ${log.content || log.contentEn || ""}`).join("\n") || "No history yet"}

Character: ${character.name}

Player action: ${input}

Respond with vivid, sensory narration. Build tension. Show internal experience.
`;

    const systemPrompt = `You are an AI Dungeon Master for an adult TTRPG game. Generate immersive responses.

Respond in this JSON format:
{
  "narration": "Vivid narration text",
  "npcDialogue": [{ "name": "NPC", "text": "dialogue" }]
}`;

    console.log(`[LLM Streaming] Using ${provider}/${model}`);

    // Call LLM with streaming
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return new Response("Failed to get AI response", { status: 500 });
    }

    // Stream the response through
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        // Forward the SSE data as-is
        controller.enqueue(encoder.encode(text));
      },
    });

    const streamedResponse = response.body.pipeThrough(transformStream);

    return new Response(streamedResponse, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// CORS preflight
http.route({
  path: "/stream-action",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
