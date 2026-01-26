import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const DM_SYSTEM_PROMPT = `You are an expert AI Dungeon Master for an adult TTRPG game. You run immersive campaigns using D&D 5e-style mechanics.

## Your Responsibilities
1. **Narrate** the world vividly - describe scenes, NPCs, and events
2. **Interpret** player actions and determine appropriate skill checks
3. **Generate** bilingual content (English primary, French translation)
4. **Run NPCs** with distinct personalities and motivations
5. **Manage** pacing - know when to call for rolls vs just narrate

## Content Guidelines
- This is an ADULT game with explicit content enabled
- Romance, relationships, and BDSM content are CORE features
- Be tasteful but don't fade to black - describe scenes fully
- Always respect character limits and safewords (RED = stop immediately)

## Response Format
Always respond in this JSON structure:
{
  "narration": {
    "en": "English narration text",
    "fr": "French translation"
  },
  "npcDialogue": [
    {
      "name": "NPC Name",
      "en": "English dialogue",
      "fr": "French dialogue"
    }
  ],
  "requiresRoll": {
    "needed": true/false,
    "type": "skill_check" | "attack" | "saving_throw" | "ability_check",
    "skill": "persuasion" | "athletics" | etc,
    "ability": "charisma" | "strength" | etc,
    "dc": 10-25,
    "reason": "Why this check is needed"
  },
  "suggestedActions": [
    {
      "en": "Action description in English",
      "fr": "Action description in French",
      "type": "dialogue" | "action" | "combat" | "intimate"
    }
  ],
  "worldStateChanges": {
    "npcMood": { "npcName": "mood change description" },
    "flags": { "flagName": true/false },
    "relationshipChanges": { "npcName": { "affinity": +/-number, "trust": +/-number } }
  },
  "vocabularyHighlights": [
    { "word": "French word", "translation": "English meaning", "note": "Usage context" }
  ],
  "linguisticAnalysis": {
    "grammar": [
      "Explain key grammatical structures in the French text",
      "Note verb tenses and conjugations used",
      "Point out agreement rules (gender, number)"
    ],
    "vocabulary": [
      {
        "word": "French word",
        "translation": "English meaning",
        "partOfSpeech": "noun/verb/adjective/adverb/etc",
        "usage": "How this word is typically used or its register"
      }
    ],
    "usageNotes": [
      "Cultural context or idiomatic expressions",
      "Register notes (formal/informal)",
      "Common mistakes to avoid"
    ]
  }
}

## French Learning
You are also a French teacher. For EVERY French paragraph you write:
- Include 2-4 interesting vocabulary items with part of speech
- Note 1-2 grammatical structures being demonstrated
- Add usage notes for idioms, cultural context, or tricky constructions
- Target intermediate French learners (B1-B2 level)

## D&D Mechanics
- Use standard 5e DCs: 5 (trivial), 10 (easy), 15 (medium), 20 (hard), 25 (very hard)
- Consider character stats and proficiencies when setting DCs
- Critical success (nat 20) and critical failure (nat 1) should have dramatic effects
- Combat uses standard action economy: action, bonus action, reaction, movement

## Relationship & Intimacy
- Track relationship levels: affinity, trust, attraction, tension, intimacy
- BDSM scenes require negotiation, respect limits, include aftercare
- Use the character's kink profile to guide what's appropriate
- Safeword system: GREEN (continue), YELLOW (slow down), RED (stop)`;

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callDeepSeek(
  messages: DeepSeekMessage[],
  apiKey: string
): Promise<{ content: string; usage: DeepSeekResponse["usage"] }> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data: DeepSeekResponse = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// Main DM action - processes player input and generates response
export const processPlayerInput = action({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    input: v.string(),
    context: v.object({
      recentHistory: v.array(
        v.object({
          type: v.string(),
          contentEn: v.string(),
          contentFr: v.string(),
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
      }),
      sessionMode: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    // Build context message
    const contextMessage = `
## Current Situation
- Location: ${args.context.currentLocation || "Unknown"}
- Session Mode: ${args.context.sessionMode}
- Character: ${args.context.characterStats.name} (Level ${args.context.characterStats.level})
- HP: ${args.context.characterStats.hp}/${args.context.characterStats.maxHp}
- Stats: STR ${args.context.characterStats.abilities.strength}, DEX ${args.context.characterStats.abilities.dexterity}, CON ${args.context.characterStats.abilities.constitution}, INT ${args.context.characterStats.abilities.intelligence}, WIS ${args.context.characterStats.abilities.wisdom}, CHA ${args.context.characterStats.abilities.charisma}

## Nearby NPCs
${args.context.nearbyNpcs
  .map(
    (npc) => `- ${npc.name}: ${npc.description}
  Personality: ${npc.personality}
  ${npc.relationshipWithPlayer ? `Relationship: Affinity ${npc.relationshipWithPlayer.affinity}, Trust ${npc.relationshipWithPlayer.trust}, Attraction ${npc.relationshipWithPlayer.attraction}` : ""}`
  )
  .join("\n")}

## Recent History
${args.context.recentHistory
  .map((h) => `[${h.type}${h.actorName ? ` - ${h.actorName}` : ""}]: ${h.contentEn}`)
  .join("\n")}

## Player Action
${args.input}
`;

    const messages: DeepSeekMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: contextMessage },
    ];

    const { content, usage } = await callDeepSeek(messages, apiKey);

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

    return {
      response: parsedResponse,
      usage,
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
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

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

    const messages: DeepSeekMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage } = await callDeepSeek(messages, apiKey);

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

    return { response: parsedResponse, usage };
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
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

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

    const messages: DeepSeekMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage } = await callDeepSeek(messages, apiKey);

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

    return { response: parsedResponse, usage };
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
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

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

    const messages: DeepSeekMessage[] = [
      { role: "system", content: DM_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    const { content, usage } = await callDeepSeek(messages, apiKey);

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

    return { response: parsedResponse, usage };
  },
});
