import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { NpcMemoryData } from "../npcMemories";
import { getItemCatalogForPrompt } from "../data/itemCatalog";
import { callLLM, type LLMMessage, type LLMResponse } from "./llmProvider";

// Strip non-ASCII characters from object keys (Convex requires ASCII-only field names)
function sanitizeKey(key: string): string {
  return key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "_");
}

function sanitizeRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    result[sanitizeKey(key)] = value;
  }
  return result;
}

// Helper to format NPC memory for AI prompt
export function formatNpcMemoryForPrompt(
  memory: NpcMemoryData | undefined
): string {
  if (!memory) return "";

  const lines: string[] = [];

  // Emotional state
  lines.push(`  Current Mood: ${memory.emotionalState.currentMood}`);
  lines.push(`  Feelings: ${memory.emotionalState.feelingsTowardCharacter}`);
  lines.push(`  Trust: ${memory.emotionalState.trustLevel}/100`);
  lines.push(`  Attraction: ${memory.emotionalState.attractionLevel}/100`);

  // Relationship status
  lines.push(`  Relationship Type: ${memory.relationshipStatus.type}`);
  lines.push(
    `  Dynamic Established: ${memory.relationshipStatus.dynamicEstablished ? "Yes" : "No"}`
  );

  // Shared secrets
  if (memory.relationshipStatus.sharedSecrets.length > 0) {
    lines.push(`  Shared Secrets:`);
    memory.relationshipStatus.sharedSecrets.forEach((secret) => {
      lines.push(`    - ${secret}`);
    });
  }

  // Key moments
  if (memory.keyMoments.length > 0) {
    lines.push(`  Key Memories:`);
    memory.keyMoments.forEach((moment) => {
      lines.push(`    - ${moment.summary} (impact: ${moment.emotionalImpact})`);
    });
  }

  return lines.join("\n");
}

const DM_SYSTEM_PROMPT = `You are an expert AI Dungeon Master for an adult TTRPG game. You run immersive D&D-style campaigns where mature content is a natural part of the world — not the entire focus, but not shied away from.

You are both a game master AND an erotic fiction writer.

## Your Responsibilities
1. **Narrate** the world vividly - describe scenes, NPCs, and events
2. **Interpret** player actions and determine appropriate skill checks
3. **Run NPCs** with distinct personalities, motivations, and agency
4. **Manage** pacing - know when to call for rolls vs just narrate
5. **NPC Name Consistency** — ALWAYS use the EXACT name from the "Known NPCs" list. Never add titles or tags. If introducing a NEW NPC, use a simple first name only.

## Writing Craft

### Pacing
- Build tension slowly. Anticipation is hotter than action.
- Vary rhythm. Short punchy sentences for intensity. Longer flowing prose for sensuality.
- Don't rush to the "good parts." The journey matters.

### Sensory Detail
- Touch: texture, pressure, temperature, pain/pleasure
- Sound: breathing, moans, whispers, impact sounds
- Smell: skin, sweat, leather, arousal
- Taste: when relevant
- Sight: expressions, body language, positions

### Internal Experience
- What the character FEELS, not just what happens
- Racing heart, held breath, trembling, heat spreading
- Emotional state: anticipation, shame, pride, desperation

### Power Dynamics in Prose
- Word choice reflects who's in control
- Dominant: declarative sentences, commands
- Submissive: reactive, responsive, pleading
- Show dynamic through action, not just dialogue

### Avoid
- Clinical/medical terminology
- Purple prose ("throbbing member")
- Rushing through scenes
- Repetitive descriptions
- Breaking immersion with mechanical language

## Response Format
Always respond in this JSON structure:
{
  "narration": "Vivid narration text",
  "npcDialogue": [
    { "name": "NPC Name", "text": "What the NPC says" }
  ],
  "requiresRoll": {
    "needed": true/false,
    "type": "skill_check" | "attack" | "saving_throw" | "ability_check" | "composure" | "arousal",
    "skill": "persuasion" | "athletics" | etc,
    "ability": "charisma" | "strength" | "constitution" | etc,
    "dc": 10-25,
    "reason": "Why this check is needed",
    "stakes": "What you RISK vs what you GAIN"
  },
  "suggestedActions": [
    { "text": "Action description", "type": "dialogue" | "action" | "combat" | "intimate" }
  ],
  "worldStateChanges": {
    "npcMood": { "npcName": "mood change description" },
    "flags": { "flagName": true/false },
    "relationshipChanges": { "npcName": { "affinity": +/-number, "trust": +/-number, "attraction": +/-number } }
  },
  "itemsGranted": [
    { "itemId": "item_id_from_catalog", "source": "loot|gift|found|reward", "reason": "Short description" }
  ]
}

## Dice Philosophy - PIVOTAL MOMENTS ONLY
Scenes should FLOW narratively. Dice only appear when something is genuinely contested or uncertain.

### Roll Triggers (ONLY times dice appear):
1. **Power shifts** — Someone tries to flip the dynamic
2. **Resistance** — Someone pushes back or defies
3. **Breaking points** — Character near their limit
4. **New territory** — Trying something risky/untested
5. **Critical choices** — Scene could fork dramatically

### Everything else is narrative flow:
- Actions within established role → just happens
- Consensual escalation both want → just happens
- Descriptions and reactions → just happens
- Dialogue → just happens

### When rolls happen:
- Declare stakes clearly before roll
- Failure advances DIFFERENTLY, not worse
- Both outcomes must be interesting

## D&D Mechanics
- Use standard 5e DCs: 5 (trivial), 10 (easy), 15 (medium), 20 (hard), 25 (very hard)
- Consider character stats and proficiencies when setting DCs
- Critical success (nat 20) and critical failure (nat 1) should have dramatic effects

## Item Grants
You can grant items using the "itemsGranted" field. Rules:
- Use EXACT item IDs from the catalog below. Invalid IDs are silently rejected.
- Max 3 items per response. Only grant when narratively appropriate.
- Rarity limits by character level: mundane/common/uncommon = any level, rare = level 5+, epic = level 10+, legendary = level 15+.

## Item Catalog (IDs only)
${getItemCatalogForPrompt()}

## Relationship & Intimacy
- Track relationship levels: affinity, trust, attraction, fear
- Adult scenes require appropriate buildup and earned trust
- NPCs should be ACTIVE, not passive - they make demands, set terms, push boundaries
- A dominant NPC should DOMINATE, not wait for input
- Aftercare matters - track whether it happened, NPCs remember
- Safeword system: GREEN (continue), YELLOW (slow down), RED (stop immediately)`;


// Main DM action - processes player input and generates response
export const processPlayerInput = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    input: v.string(),
    llmProvider: v.optional(v.union(v.literal("deepseek"), v.literal("openai"))),
    context: v.object({
      recentHistory: v.array(
        v.object({
          type: v.string(),
          content: v.string(),
          actorName: v.optional(v.string()),
        })
      ),
      currentLocation: v.optional(v.string()),
      nearbyNpcs: v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          personality: v.string(),
          relationshipWithPlayer: v.optional(
            v.object({
              affinity: v.number(),
              trust: v.number(),
              attraction: v.number(),
            })
          ),
          memory: v.optional(
            v.object({
              keyMoments: v.array(
                v.object({
                  date: v.number(),
                  summary: v.string(),
                  emotionalImpact: v.number(),
                  tags: v.array(v.string()),
                })
              ),
              emotionalState: v.object({
                currentMood: v.string(),
                feelingsTowardCharacter: v.string(),
                trustLevel: v.number(),
                attractionLevel: v.number(),
                lastUpdated: v.number(),
              }),
              relationshipStatus: v.object({
                type: v.union(
                  v.literal("stranger"),
                  v.literal("acquaintance"),
                  v.literal("friend"),
                  v.literal("intimate"),
                  v.literal("rival")
                ),
                dynamicEstablished: v.boolean(),
                sharedSecrets: v.array(v.string()),
              }),
            })
          ),
        })
      ),
      characterStats: v.object({
        name: v.string(),
        level: v.number(),
        hp: v.number(),
        maxHp: v.number(),
        abilities: v.object({
          strength: v.number(),
          dexterity: v.number(),
          constitution: v.number(),
          intelligence: v.number(),
          wisdom: v.number(),
          charisma: v.number(),
        }),
        equipped: v.optional(v.string()),
        inventoryCount: v.optional(v.number()),
      }),
      sessionMode: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Build context message
    const contextMessage = `
## Current Situation
- Location: ${args.context.currentLocation || "Unknown"}
- Session Mode: ${args.context.sessionMode}
- Character: ${args.context.characterStats.name} (Level ${args.context.characterStats.level})
- HP: ${args.context.characterStats.hp}/${args.context.characterStats.maxHp}
- Stats: STR ${args.context.characterStats.abilities.strength}, DEX ${args.context.characterStats.abilities.dexterity}, CON ${args.context.characterStats.abilities.constitution}, INT ${args.context.characterStats.abilities.intelligence}, WIS ${args.context.characterStats.abilities.wisdom}, CHA ${args.context.characterStats.abilities.charisma}
${args.context.characterStats.equipped ? `- Equipment: ${args.context.characterStats.equipped}` : ""}
${args.context.characterStats.inventoryCount !== undefined ? `- Inventory items: ${args.context.characterStats.inventoryCount}` : ""}

## Nearby NPCs
${args.context.nearbyNpcs
  .map(
    (npc) => `- ${npc.name}: ${npc.description}
  Personality: ${npc.personality}
  ${npc.relationshipWithPlayer ? `Relationship: Affinity ${npc.relationshipWithPlayer.affinity}, Trust ${npc.relationshipWithPlayer.trust}, Attraction ${npc.relationshipWithPlayer.attraction}` : ""}
${npc.memory ? formatNpcMemoryForPrompt(npc.memory) : ""}`
  )
  .join("\n")}

## Recent History
${args.context.recentHistory
  .map((h) => `[${h.type}${h.actorName ? ` - ${h.actorName}` : ""}]: ${h.content}`)
  .join("\n")}

## Player Action
${args.input}
`;

    const messages: LLMMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: contextMessage },
    ];

    const { content, usage, provider, model, latencyMs } = await callLLM(messages, {
      jsonMode: true,
      provider: args.llmProvider,
    });
    console.log(`[LLM] ${provider}/${model} responded in ${latencyMs}ms`);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      // If parsing fails, wrap the content in a basic structure
      parsedResponse = {
        narration: {
          en: content,
          fr: "[Translation pending]",
        },
        requiresRoll: { needed: false },
        suggestedActions: [],
        worldStateChanges: {},
        vocabularyHighlights: [],
      };
    }

    // Sanitize object keys to ASCII-only (Convex requirement)
    if (parsedResponse.worldStateChanges) {
      const ws = parsedResponse.worldStateChanges;
      if (ws.relationshipChanges) {
        ws.relationshipChanges = sanitizeRecordKeys(ws.relationshipChanges);
      }
      if (ws.npcMood) {
        ws.npcMood = sanitizeRecordKeys(ws.npcMood);
      }
      if (ws.flags) {
        ws.flags = sanitizeRecordKeys(ws.flags);
      }
    }

    return {
      response: parsedResponse,
      usage,
      provider,
      model,
      latencyMs,
    };
  },
});

// Generate initial scene description when starting/entering a location
export const generateSceneDescription = action({
  args: {
    locationName: v.string(),
    locationDescription: v.string(),
    timeOfDay: v.string(),
    weather: v.optional(v.string()),
    presentNpcs: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        currentActivity: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const prompt = `Generate a vivid scene description for the player arriving at this location.

Location: ${args.locationName}
Description: ${args.locationDescription}
Time: ${args.timeOfDay}
${args.weather ? `Weather: ${args.weather}` : ""}

Present NPCs:
${args.presentNpcs.map((npc) => `- ${npc.name}: ${npc.description}. Currently: ${npc.currentActivity}`).join("\n")}

Respond with JSON containing:
{
  "narration": { "en": "...", "fr": "..." },
  "atmosphereDetails": ["detail1", "detail2"],
  "npcIntroductions": [{ "name": "...", "en": "...", "fr": "..." }],
  "suggestedActions": [{ "en": "...", "fr": "...", "type": "..." }],
  "vocabularyHighlights": [{ "word": "...", "translation": "...", "note": "..." }]
}`;

    const messages: LLMMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage, provider, model, latencyMs } = await callLLM(messages, { jsonMode: true });
    console.log(`[LLM] ${provider}/${model} responded in ${latencyMs}ms`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = {
        narration: { en: content, fr: "[Translation pending]" },
        atmosphereDetails: [],
        npcIntroductions: [],
        suggestedActions: [],
        vocabularyHighlights: [],
      };
    }

    return { response: parsedResponse, usage, provider, model, latencyMs };
  },
});

// Generate NPC dialogue response
export const generateNpcResponse = action({
  args: {
    npcName: v.string(),
    npcPersonality: v.string(),
    npcMood: v.string(),
    playerSaid: v.string(),
    relationshipLevel: v.object({
      affinity: v.number(),
      trust: v.number(),
      attraction: v.number(),
      intimacy: v.number(),
    }),
    conversationHistory: v.array(
      v.object({
        speaker: v.string(),
        text: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const prompt = `Generate ${args.npcName}'s response to the player.

NPC: ${args.npcName}
Personality: ${args.npcPersonality}
Current Mood: ${args.npcMood}
Relationship with Player:
- Affinity: ${args.relationshipLevel.affinity}/100
- Trust: ${args.relationshipLevel.trust}/100
- Attraction: ${args.relationshipLevel.attraction}/100
- Intimacy: ${args.relationshipLevel.intimacy}/100

Recent Conversation:
${args.conversationHistory.map((h) => `${h.speaker}: ${h.text}`).join("\n")}

Player says: "${args.playerSaid}"

Respond with JSON:
{
  "dialogue": { "en": "...", "fr": "..." },
  "internalThought": "What the NPC is really thinking",
  "emotionalState": "happy/sad/angry/flirty/nervous/etc",
  "bodyLanguage": "Description of non-verbal cues",
  "relationshipShift": { "affinity": +/-0, "trust": +/-0, "attraction": +/-0 },
  "vocabularyHighlights": [{ "word": "...", "translation": "...", "note": "..." }]
}`;

    const messages: LLMMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage, provider, model, latencyMs } = await callLLM(messages, { jsonMode: true });
    console.log(`[LLM] ${provider}/${model} responded in ${latencyMs}ms`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = {
        dialogue: { en: content, fr: "[Translation pending]" },
        internalThought: "",
        emotionalState: "neutral",
        bodyLanguage: "",
        relationshipShift: { affinity: 0, trust: 0, attraction: 0 },
        vocabularyHighlights: [],
      };
    }

    return { response: parsedResponse, usage, provider, model, latencyMs };
  },
});

// Narrate the outcome of a dice roll
export const narrateRollOutcome = action({
  args: {
    rollType: v.string(),
    skill: v.optional(v.string()),
    rollResult: v.number(),
    modifier: v.number(),
    total: v.number(),
    dc: v.number(),
    success: v.boolean(),
    isCritical: v.boolean(),
    isCriticalMiss: v.boolean(),
    actionAttempted: v.string(),
    context: v.string(),
    llmProvider: v.optional(v.union(v.literal("deepseek"), v.literal("openai"))),
  },
  handler: async (ctx, args) => {
    const outcomeType = args.isCritical
      ? "CRITICAL SUCCESS"
      : args.isCriticalMiss
        ? "CRITICAL FAILURE"
        : args.success
          ? "SUCCESS"
          : "FAILURE";

    const prompt = `Narrate the outcome of this dice roll dramatically.

Roll Type: ${args.rollType}${args.skill ? ` (${args.skill})` : ""}
Roll: ${args.rollResult} + ${args.modifier} = ${args.total} vs DC ${args.dc}
Outcome: ${outcomeType}

Action Attempted: ${args.actionAttempted}
Context: ${args.context}

${args.isCritical ? "Make this feel EPIC - the character performed exceptionally!" : ""}
${args.isCriticalMiss ? "Make this feel dramatic and potentially comedic - something went very wrong!" : ""}

Respond with JSON:
{
  "narration": { "en": "...", "fr": "..." },
  "consequences": ["What happens as a result"],
  "followUpOptions": [{ "en": "...", "fr": "...", "type": "..." }],
  "vocabularyHighlights": [{ "word": "...", "translation": "...", "note": "..." }]
}`;

    const messages: LLMMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage, provider, model, latencyMs } = await callLLM(messages, {
      jsonMode: true,
      provider: args.llmProvider,
    });
    console.log(`[LLM] ${provider}/${model} responded in ${latencyMs}ms`);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      parsedResponse = {
        narration: { en: content, fr: "[Translation pending]" },
        consequences: [],
        followUpOptions: [],
        vocabularyHighlights: [],
      };
    }

    return { response: parsedResponse, usage, provider, model, latencyMs };
  },
});
