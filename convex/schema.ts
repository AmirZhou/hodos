import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============ TYPE VALIDATORS ============

const abilityScores = v.object({
  strength: v.number(),
  dexterity: v.number(),
  constitution: v.number(),
  intelligence: v.number(),
  wisdom: v.number(),
  charisma: v.number(),
});

// Adult stats for power dynamics
const adultStats = v.object({
  composure: v.number(),    // 0-100, ability to stay in control
  arousal: v.number(),      // 0-100, current excitement level
  dominance: v.number(),    // 0-100, capacity to control others
  submission: v.number(),   // 0-100, capacity to surrender
});

// Kink preferences (tag -> preference level)
// -2 = hard limit, -1 = soft limit, 0 = neutral, 1 = curious, 2 = enjoys, 3 = loves
const kinkPreferences = v.record(v.string(), v.number());

// Enhanced combatant state with position and action tracking
const combatantState = v.object({
  entityId: v.string(),
  entityType: v.union(v.literal("character"), v.literal("npc")),
  initiative: v.number(),
  position: v.object({ x: v.number(), y: v.number() }),
  hasAction: v.boolean(),
  hasBonusAction: v.boolean(),
  hasReaction: v.boolean(),
  movementRemaining: v.number(),
  turnStartedAt: v.optional(v.number()),
});

const combatState = v.object({
  combatants: v.array(combatantState),
  currentTurnIndex: v.number(),
  round: v.number(),
  phase: v.union(
    v.literal("rolling_initiative"),
    v.literal("in_progress"),
    v.literal("ending")
  ),
  turnTimeoutMs: v.number(),
  lastTurnStartedAt: v.number(),
});

// Enhanced scene participant with role, consent, and comfort tracking
const sceneParticipant = v.object({
  entityId: v.string(),
  entityType: v.union(v.literal("character"), v.literal("npc")),
  role: v.union(
    v.literal("dominant"),
    v.literal("submissive"),
    v.literal("switch"),
    v.literal("observer")
  ),
  consentGiven: v.boolean(),
  limits: v.array(v.string()),
  currentComfort: v.number(), // 0-100
  safewordUsed: v.optional(
    v.union(v.literal("yellow"), v.literal("red"))
  ),
});

const sceneState = v.object({
  participants: v.array(sceneParticipant),
  phase: v.union(
    v.literal("negotiation"),
    v.literal("active"),
    v.literal("aftercare"),
    v.literal("ended")
  ),
  intensity: v.number(), // 0-100
  peakIntensity: v.number(),
  mood: v.string(),
  currentActorIndex: v.number(),
  negotiatedActivities: v.array(v.string()),
  usedSafeword: v.boolean(),
  startedAt: v.number(),
  lastActionAt: v.number(),
});

const dynamicType = v.object({
  type: v.union(
    v.literal("none"),
    v.literal("scene-only"),
    v.literal("ongoing"),
    v.literal("24/7")
  ),
  protocolLevel: v.number(), // 1-5
  roles: v.object({
    character: v.string(),
    npc: v.string(),
  }),
});

const rollDetails = v.object({
  type: v.string(),
  dice: v.string(),
  result: v.number(),
  dc: v.optional(v.number()),
  success: v.optional(v.boolean()),
});

const equipmentItem = v.object({
  id: v.string(),
  name: v.string(),
  nameFr: v.optional(v.string()), // Deprecated, kept for data migration
  description: v.string(),
  type: v.union(
    v.literal("head"), v.literal("chest"), v.literal("hands"),
    v.literal("boots"), v.literal("cloak"), v.literal("ring"),
    v.literal("necklace"), v.literal("mainHand"), v.literal("offHand"),
    v.literal("book"),
    // Adult equipment types
    v.literal("collar"), v.literal("restraints"), v.literal("toy")
  ),
  rarity: v.union(
    v.literal("mundane"), v.literal("common"), v.literal("uncommon"),
    v.literal("rare"), v.literal("epic"), v.literal("legendary")
  ),
  stats: v.object({
    ac: v.optional(v.number()),
    hp: v.optional(v.number()),
    speed: v.optional(v.number()),
    damage: v.optional(v.string()),
    strength: v.optional(v.number()),
    dexterity: v.optional(v.number()),
    constitution: v.optional(v.number()),
    intelligence: v.optional(v.number()),
    wisdom: v.optional(v.number()),
    charisma: v.optional(v.number()),
  }),
  // Flexible record to allow any special attributes
  specialAttributes: v.optional(v.record(v.string(), v.number())),
  passive: v.optional(v.string()),
});

// Grid data for tactical combat maps
const gridCell = v.object({
  x: v.number(),
  y: v.number(),
  terrain: v.union(
    v.literal("normal"),
    v.literal("difficult"),
    v.literal("impassable")
  ),
  cover: v.optional(
    v.union(
      v.literal("half"),
      v.literal("three-quarters"),
      v.literal("full")
    )
  ),
});

const gridData = v.object({
  width: v.number(),
  height: v.number(),
  cells: v.array(gridCell),
});

// City-level grid cell (distinct from location-level gridCell)
const cityGridCell = v.object({
  x: v.number(),
  y: v.number(),
  terrain: v.union(
    v.literal("road"), v.literal("building"), v.literal("water"),
    v.literal("wall"), v.literal("gate"), v.literal("plaza"),
    v.literal("garden"), v.literal("dock"), v.literal("bridge")
  ),
  walkable: v.boolean(),
  locationTemplateId: v.optional(v.string()),
});

const cityGridData = v.object({
  width: v.number(),
  height: v.number(),
  cells: v.array(cityGridCell),
  backgroundImage: v.optional(v.string()),
});

const condition = v.object({
  name: v.string(),
  duration: v.optional(v.number()), // turns remaining, or undefined for permanent
  source: v.optional(v.string()),
});

// Scene history entry for NPC memory
const sceneHistoryEntry = v.object({
  timestamp: v.number(),
  playerRole: v.union(v.literal("dominant"), v.literal("submissive"), v.literal("switch")),
  npcRole: v.union(v.literal("dominant"), v.literal("submissive"), v.literal("switch")),
  activities: v.array(v.string()),
  intensity: v.number(), // 1-10
  keyMoments: v.array(v.string()),
  aftercare: v.union(v.literal("good"), v.literal("rushed"), v.literal("skipped")),
  npcFeeling: v.string(), // "satisfied", "wanting more", "hurt", etc.
});

// ============ SCHEMA ============

export default defineSchema({
  // ============ USERS & AUTH ============
  users: defineTable({
    clerkId: v.optional(v.string()),
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    settings: v.object({
      explicitContent: v.boolean(),
      videoEnabled: v.boolean(),
      intensityPreference: v.optional(v.number()), // 1-10 default intensity
      // DEPRECATED - kept for data migration
      language: v.optional(v.string()),
      frenchLevel: v.optional(v.string()),
    }),
    // User's global kink preferences (used as default for new characters)
    kinkPreferences: v.optional(kinkPreferences),
    hardLimits: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // ============ CAMPAIGNS ============
  campaigns: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    inviteCode: v.string(),
    storyPackId: v.optional(v.id("storyPacks")),
    status: v.union(
      v.literal("lobby"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    settings: v.object({
      maxPlayers: v.number(),
      allowVideoChat: v.boolean(),
      contentRating: v.literal("explicit"),
    }),
    seedScenario: v.optional(v.string()),
    createdAt: v.number(),
    lastPlayedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite_code", ["inviteCode"]),

  campaignMembers: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    characterId: v.optional(v.id("characters")),
    role: v.union(v.literal("owner"), v.literal("player")),
    isOnline: v.boolean(),
    lastSeenAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_user", ["userId"])
    .index("by_campaign_and_user", ["campaignId", "userId"]),

  // ============ CHARACTERS ============
  characters: defineTable({
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
    name: v.string(),
    pronouns: v.string(),
    portrait: v.optional(v.string()),

    // Core Stats
    level: v.number(),
    xp: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    tempHp: v.number(),
    ac: v.number(),
    speed: v.number(),
    proficiencyBonus: v.number(),

    // Ability Scores
    abilities: abilityScores,

    // Skills (0=none, 1=proficient, 2=expertise)
    skills: v.record(v.string(), v.number()),

    // Class/Background
    class: v.optional(v.string()),
    subclass: v.optional(v.string()),
    background: v.optional(v.string()),
    classFeatures: v.array(v.string()),

    // Inventory & Equipment
    inventory: v.array(equipmentItem),
    equipped: v.object({
      head: v.optional(equipmentItem),
      chest: v.optional(equipmentItem),
      hands: v.optional(equipmentItem),
      boots: v.optional(equipmentItem),
      cloak: v.optional(equipmentItem),
      ring1: v.optional(equipmentItem),
      ring2: v.optional(equipmentItem),
      necklace: v.optional(equipmentItem),
      mainHand: v.optional(equipmentItem),
      offHand: v.optional(equipmentItem),
      book: v.optional(equipmentItem),
      // Adult equipment slots
      collar: v.optional(equipmentItem),
      restraints: v.optional(equipmentItem),
      toy: v.optional(equipmentItem),
    }),

    // Conditions & Status
    conditions: v.array(condition),
    exhaustionLevel: v.number(),
    deathSaves: v.object({
      successes: v.number(),
      failures: v.number(),
    }),

    // Adult Stats (NEW)
    adultStats: v.optional(adultStats),

    // Kink preferences and limits
    kinkPreferences: v.optional(kinkPreferences),
    hardLimits: v.optional(v.array(v.string())),

    // DEPRECATED - kept for data migration only
    intimacyProfile: v.optional(v.any()),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_campaign", ["campaignId"]),

  // ============ NPCs ============
  npcs: defineTable({
    campaignId: v.id("campaigns"),
    templateId: v.optional(v.string()),
    name: v.string(),
    pronouns: v.string(),
    portrait: v.optional(v.string()),
    description: v.string(),
    descriptionFr: v.optional(v.string()), // DEPRECATED
    personality: v.string(), // AI guidance
    // DEPRECATED - kept for data migration
    intimacyProfile: v.optional(v.any()),

    // Stats (simplified for NPCs)
    level: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    ac: v.number(),
    abilities: abilityScores,

    // Adult Stats (NEW)
    adultStats: v.optional(adultStats),

    // NPC's kink preferences and limits
    kinkPreferences: v.optional(kinkPreferences),
    hardLimits: v.optional(v.array(v.string())),

    // What NPC wants from player (AI guidance)
    desires: v.optional(v.string()),

    // Grid position (for exploration map)
    position: v.optional(v.object({ x: v.number(), y: v.number() })),

    // Location & Status
    currentLocationId: v.optional(v.id("locations")),
    isAlive: v.boolean(),
    conditions: v.array(condition),

    // Simple AI memory (for backward compat)
    memories: v.array(v.string()),

    // Auto-creation tracking
    autoCreated: v.optional(v.boolean()),
    firstMetAt: v.optional(v.number()),
  }).index("by_campaign", ["campaignId"]),

  // ============ RELATIONSHIPS ============
  relationships: defineTable({
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    npcId: v.id("npcs"),

    // Core relationship scores
    affinity: v.number(),     // -100 to +100
    trust: v.number(),        // 0 to 100
    attraction: v.number(),   // 0 to 100
    fear: v.optional(v.number()),   // 0 to 100 (NEW)
    tension: v.optional(v.number()), // DEPRECATED - use fear
    intimacy: v.number(),     // 0 to 100

    // Power dynamic perception (NEW)
    // How dominant/submissive the player appears to this NPC
    playerDomInTheirEyes: v.optional(v.number()),  // 0-100
    playerSubInTheirEyes: v.optional(v.number()),  // 0-100

    dynamic: v.optional(dynamicType),

    history: v.array(v.string()),
    flags: v.record(v.string(), v.boolean()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_character", ["characterId"])
    .index("by_character_and_npc", ["characterId", "npcId"]),

  // ============ NPC MEMORIES (Enhanced) ============
  npcMemories: defineTable({
    npcId: v.id("npcs"),
    characterId: v.id("characters"),

    // Key moments (5-10 max, pruned by significance)
    keyMoments: v.array(
      v.object({
        timestamp: v.number(),
        summary: v.string(),
        emotionalImpact: v.number(), // -10 to +10
        tags: v.array(v.string()),
      })
    ),

    // Scene history (NEW)
    sceneHistory: v.optional(v.array(sceneHistoryEntry)),

    // Emotional summary
    emotionalState: v.object({
      currentMood: v.string(),
      feelingsTowardCharacter: v.string(),
      trustLevel: v.number(),
      attractionLevel: v.number(),
      lastUpdated: v.number(),
    }),

    // Relationship status
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

    // What NPC currently wants/avoids with player (NEW)
    wantsFromPlayer: v.optional(v.string()),
    avoidsWithPlayer: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_npc", ["npcId"])
    .index("by_character", ["characterId"])
    .index("by_npc_and_character", ["npcId", "characterId"]),

  // ============ MAPS ============
  maps: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    properties: v.record(v.string(), v.any()),
    cityGridData: v.optional(cityGridData),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  campaignMaps: defineTable({
    campaignId: v.id("campaigns"),
    mapId: v.id("maps"),
    addedAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_map", ["mapId"])
    .index("by_campaign_and_map", ["campaignId", "mapId"]),

  campaignLocationDiscovery: defineTable({
    campaignId: v.id("campaigns"),
    locationId: v.id("locations"),
    discoveredAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_and_location", ["campaignId", "locationId"]),

  // ============ WORLD STATE ============
  locations: defineTable({
    mapId: v.optional(v.id("maps")), // temporarily optional for data migration
    templateId: v.optional(v.string()),
    name: v.string(),
    nameFr: v.optional(v.string()), // DEPRECATED
    description: v.string(),
    descriptionFr: v.optional(v.string()), // DEPRECATED
    parentLocationId: v.optional(v.id("locations")),
    connectedTo: v.array(v.id("locations")),
    properties: v.record(v.string(), v.any()),
    gridData: v.optional(gridData),
    // Temporarily optional for data migration (stale fields from old schema)
    campaignId: v.optional(v.any()),
    isDiscovered: v.optional(v.boolean()),
  }).index("by_map", ["mapId"]),

  worldState: defineTable({
    campaignId: v.id("campaigns"),
    currentTime: v.object({
      day: v.number(),
      hour: v.number(),
      minute: v.number(),
    }),
    weather: v.optional(v.string()),
    flags: v.record(v.string(), v.any()),
    activeEvents: v.array(v.string()),
  }).index("by_campaign", ["campaignId"]),

  // ============ GAME SESSION ============
  gameSessions: defineTable({
    campaignId: v.id("campaigns"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("ended")),
    mode: v.union(
      v.literal("exploration"),
      v.literal("combat"),
      v.literal("scene"),
      v.literal("dialogue")
    ),

    combat: v.optional(combatState),
    scene: v.optional(sceneState),

    locationId: v.optional(v.id("locations")),

    // City navigation
    cityPosition: v.optional(v.object({ x: v.number(), y: v.number() })),
    currentMapId: v.optional(v.id("maps")),
    navigationMode: v.optional(v.union(v.literal("city"), v.literal("location"))),

    // Exploration grid positions
    explorationPositions: v.optional(v.record(v.string(), v.object({ x: v.number(), y: v.number() }))),
    movementHistory: v.optional(v.array(v.object({
      timestamp: v.number(),
      characterId: v.string(),
      from: v.object({ x: v.number(), y: v.number() }),
      to: v.object({ x: v.number(), y: v.number() }),
      logEntryId: v.string(),
    }))),
    currentGridSize: v.optional(v.object({ width: v.number(), height: v.number() })),

    // Suggested actions (flexible for migration)
    suggestedActions: v.optional(v.array(v.object({
      text: v.optional(v.string()),
      type: v.string(),
      // DEPRECATED - kept for data migration
      en: v.optional(v.string()),
      fr: v.optional(v.string()),
    }))),

    // Pending roll
    pendingRoll: v.optional(v.object({
      type: v.string(),
      skill: v.optional(v.string()),
      ability: v.string(),
      dc: v.number(),
      reason: v.string(),
      characterId: v.id("characters"),
      actionContext: v.string(),
      // Stakes for the roll (NEW)
      stakes: v.optional(v.object({
        onSuccess: v.string(),
        onFailure: v.string(),
      })),
    })),

    // LLM provider selection
    llmProvider: v.optional(v.union(v.literal("deepseek"), v.literal("openai"))),

    startedAt: v.number(),
    lastActionAt: v.number(),
  }).index("by_campaign", ["campaignId"]),

  // ============ GAME LOG ============
  gameLog: defineTable({
    campaignId: v.id("campaigns"),
    sessionId: v.optional(v.id("gameSessions")),

    type: v.union(
      v.literal("narration"),
      v.literal("dialogue"),
      v.literal("action"),
      v.literal("roll"),
      v.literal("system"),
      v.literal("ooc"),
      v.literal("movement")
    ),

    content: v.optional(v.string()), // Made optional for migration
    // DEPRECATED - kept for data migration
    contentEn: v.optional(v.string()),
    contentFr: v.optional(v.string()),
    annotations: v.optional(v.any()),
    linguisticAnalysis: v.optional(v.any()),

    actorType: v.optional(
      v.union(v.literal("dm"), v.literal("character"), v.literal("npc"))
    ),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),

    roll: v.optional(rollDetails),

    // Movement data for movement log entries
    movementData: v.optional(v.object({
      from: v.object({ x: v.number(), y: v.number() }),
      to: v.object({ x: v.number(), y: v.number() }),
    })),

    createdAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_and_time", ["campaignId", "createdAt"]),

  // ============ STORY PACKS ============
  storyPacks: defineTable({
    slug: v.string(),
    version: v.string(),
    name: v.string(),
    description: v.string(),
    setting: v.string(),

    classes: v.array(v.any()),
    backgrounds: v.array(v.any()),
    npcTemplates: v.array(v.any()),
    locationTemplates: v.array(v.any()),
    plotHooks: v.array(v.any()),
    items: v.array(v.any()),

    dmGuidance: v.string(),

    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // ============ PRESENCE ============
  presence: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    isOnline: v.boolean(),
    isInVideo: v.boolean(),
    videoRoomToken: v.optional(v.string()),
    lastPing: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_user", ["userId"]),

  // ============ STREAMING SESSIONS ============
  streamingSessions: defineTable({
    campaignId: v.id("campaigns"),
    type: v.union(v.literal("narration"), v.literal("dialogue")),
    chunks: v.array(
      v.object({
        index: v.number(),
        text: v.string(),
        isFinal: v.boolean(),
      })
    ),
    isComplete: v.boolean(),
    createdAt: v.number(),
  }).index("by_campaign", ["campaignId"]),

  // ============ KINK TAXONOMY ============
  kinkDefinitions: defineTable({
    id: v.string(),           // e.g., "foot_worship"
    name: v.string(),         // e.g., "Foot Worship"
    category: v.string(),     // e.g., "worship"
    description: v.string(),
    intensity: v.union(
      v.literal("mild"),
      v.literal("moderate"),
      v.literal("intense"),
      v.literal("extreme")
    ),
    keywords: v.array(v.string()),
    writingGuidance: v.string(),  // AI guidance for writing this kink
    safetyNotes: v.optional(v.string()),
  }).index("by_category", ["category"]),
});
