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

const roleIdentity = v.object({
  power: v.number(), // 0-100 (sub to dom)
  action: v.number(), // 0-100 (bottom to top)
  sensation: v.number(), // 0-100 (masochist to sadist)
  service: v.number(), // 0-100 (giving to receiving)
  flexibility: v.number(), // 0-100 (fixed to switch)
});

const intimacyProfile = v.object({
  orientation: v.string(),
  roleIdentity: roleIdentity,
  kinks: v.record(v.string(), v.number()), // tag -> level (-2 to +3)
  aftercareNeed: v.number(), // 0-100
  trustThreshold: v.number(), // 0-100
});

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

const vocabAnnotation = v.object({
  word: v.string(),
  translation: v.string(),
  note: v.optional(v.string()),
});

// Enhanced linguistic analysis for French learning
const linguisticAnalysisVocabItem = v.object({
  word: v.string(),
  translation: v.string(),
  partOfSpeech: v.string(),
  usage: v.optional(v.string()),
});

const linguisticAnalysis = v.object({
  grammar: v.array(v.string()),
  vocabulary: v.array(linguisticAnalysisVocabItem),
  usageNotes: v.array(v.string()),
});

const item = v.object({
  id: v.string(),
  name: v.string(),
  nameFr: v.string(),
  description: v.string(),
  type: v.string(),
  properties: v.record(v.string(), v.any()),
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

const condition = v.object({
  name: v.string(),
  duration: v.optional(v.number()), // turns remaining, or undefined for permanent
  source: v.optional(v.string()),
});

// ============ SCHEMA ============

export default defineSchema({
  // ============ USERS & AUTH ============
  users: defineTable({
    clerkId: v.optional(v.string()), // Optional - for Clerk integration later
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    settings: v.object({
      language: v.union(v.literal("en"), v.literal("fr"), v.literal("bilingual")),
      explicitContent: v.boolean(),
      videoEnabled: v.boolean(),
      frenchLevel: v.union(
        v.literal("none"),
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      ),
    }),
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
    inventory: v.array(item),
    equipped: v.object({
      armor: v.optional(item),
      mainHand: v.optional(item),
      offHand: v.optional(item),
      accessories: v.array(item),
    }),

    // Conditions & Status
    conditions: v.array(condition),
    exhaustionLevel: v.number(),
    deathSaves: v.object({
      successes: v.number(),
      failures: v.number(),
    }),

    // Intimacy Profile
    intimacyProfile: intimacyProfile,

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
    descriptionFr: v.string(),
    personality: v.string(), // AI guidance

    // Stats (simplified for NPCs)
    level: v.number(),
    hp: v.number(),
    maxHp: v.number(),
    ac: v.number(),
    abilities: abilityScores,

    // Intimacy Profile
    intimacyProfile: intimacyProfile,

    // Location & Status
    currentLocationId: v.optional(v.id("locations")),
    isAlive: v.boolean(),
    conditions: v.array(condition),

    // AI memory
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

    affinity: v.number(), // -100 to +100
    trust: v.number(), // 0 to 100
    attraction: v.number(), // 0 to 100
    tension: v.number(), // 0 to 100
    intimacy: v.number(), // 0 to 100

    dynamic: v.optional(dynamicType),

    history: v.array(v.string()),
    flags: v.record(v.string(), v.boolean()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_character", ["characterId"])
    .index("by_character_and_npc", ["characterId", "npcId"]),

  // ============ WORLD STATE ============
  locations: defineTable({
    campaignId: v.id("campaigns"),
    templateId: v.optional(v.string()),
    name: v.string(),
    nameFr: v.string(),
    description: v.string(),
    descriptionFr: v.string(),
    parentLocationId: v.optional(v.id("locations")),
    connectedTo: v.array(v.id("locations")),
    isDiscovered: v.boolean(),
    properties: v.record(v.string(), v.any()),
    gridData: v.optional(gridData), // Tactical combat grid
  }).index("by_campaign", ["campaignId"]),

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
      v.literal("ooc")
    ),

    contentEn: v.string(),
    contentFr: v.string(),

    actorType: v.optional(
      v.union(v.literal("dm"), v.literal("character"), v.literal("npc"))
    ),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),

    roll: v.optional(rollDetails),

    annotations: v.optional(
      v.object({
        vocabulary: v.array(vocabAnnotation),
        grammar: v.optional(v.string()),
      })
    ),

    // Enhanced French learning analysis
    linguisticAnalysis: v.optional(linguisticAnalysis),

    createdAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_and_time", ["campaignId", "createdAt"]),

  // ============ STORY PACKS ============
  storyPacks: defineTable({
    slug: v.string(),
    version: v.string(),
    name: v.string(),
    nameFr: v.string(),
    description: v.string(),
    descriptionFr: v.string(),
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

  // ============ VOCABULARY (French Learning) ============
  vocabulary: defineTable({
    userId: v.id("users"),
    word: v.string(),
    translation: v.string(),
    context: v.optional(v.string()),
    timesSeen: v.number(),
    timesReviewed: v.number(),
    lastReviewedAt: v.optional(v.number()),
    nextReviewAt: v.optional(v.number()),
    ease: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_next_review", ["userId", "nextReviewAt"]),

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
});
