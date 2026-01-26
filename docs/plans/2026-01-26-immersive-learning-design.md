# Immersive French Learning & Living World Design

**Date:** 2026-01-26
**Status:** Approved
**Author:** Brainstorming session with user

---

## Overview

Three interconnected improvements to make Hodos a better language learning tool and more immersive world:

1. **Streaming Responses** - Reduce perceived latency from 10-20s to ~2s
2. **Living NPCs** - Auto-created characters with memory and relationships
3. **French Learning System** - Inline annotations, personal notebook, spaced repetition

---

## 1. Streaming Responses

### Problem
Current flow waits for complete AI response (10-20 seconds):
```
Player action → processPlayerInput (5-10s) → narrateRollOutcome (5-10s) → Display
```

### Solution
Stream responses word-by-word as they generate:
```
Player action → Start streaming → Display immediately (~2s to first word)
```

### Implementation
- Use DeepSeek streaming API (`stream: true`)
- Create new Convex action that yields chunks
- Frontend uses `useAction` with streaming handler
- Display text as it arrives with typing animation

### Technical Notes
- Convex supports streaming via `ctx.stream()`
- Need to buffer JSON parsing until complete for structured data
- Show narration immediately, parse metadata after stream ends

---

## 2. Living NPC System

### Concept
NPCs are auto-created when the AI mentions them and you interact. They persist, age, and remember.

### NPC Memory Model

```typescript
interface NPCMemory {
  // Identity
  npcId: Id<"npcs">;
  name: string;

  // Key Moments (5-10 max, pruned by significance)
  keyMoments: Array<{
    date: number;
    summary: string;        // "Player impressed me with perception"
    emotionalImpact: number; // -10 to +10
    tags: string[];         // ["first_meeting", "trust_building"]
  }>;

  // Emotional Summary
  emotionalState: {
    currentMood: string;           // "intrigued", "wary", "affectionate"
    feelingsTowardPlayer: string;  // "You see me in ways others don't"
    trustLevel: number;            // 0-100
    attractionLevel: number;       // 0-100
    lastUpdated: number;
  };

  // Relationship Status
  relationship: {
    type: "stranger" | "acquaintance" | "friend" | "intimate" | "rival";
    dynamicEstablished: boolean;   // BDSM dynamic agreed
    sharedSecrets: string[];       // Things only you two know
  };
}
```

### Auto-Creation Flow

1. AI mentions NPC by name in dialogue
2. System checks if NPC exists in database
3. If not exists AND player interacts (dialogue):
   - Create NPC record with AI-generated details
   - Initialize empty memory
4. After each interaction:
   - AI summarizes key moment (if significant)
   - Update emotional state
   - Prune old moments if > 10 (keep most impactful)

### Aging System
- NPCs have `birthDate` and `ageRate` (default: 1 day real = 1 week game)
- Age affects: appearance descriptions, energy levels, life events
- Major NPCs can have life events (promotions, moves, illness)

---

## 3. French Learning System

### 3.1 Inline Analysis Panel

Each French paragraph has an expandable learning panel:

```
┌─────────────────────────────────────────────────────────────┐
│ "La lumière de la torche vacille..."                       │
│                                                             │
│  ▼ Show Analysis                                            │
├─────────────────────────────────────────────────────────────┤
│ GRAMMAR                                                     │
│ • "vacille" - present tense, 3rd person singular           │
│   of "vaciller" (to flicker). Regular -er verb.            │
│                                                             │
│ VOCABULARY                                                  │
│ • vacille (flickers) - describes unstable light            │
│ • suspendus (suspended) - past participle of suspendre     │
│                                                             │
│ USAGE NOTE                                                  │
│ "rester + past participle" = to remain in a state          │
│                                                             │
│ [Save to Notebook]  [Listen]                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Personal Notebook

**Schema:**
```typescript
interface NotebookEntry {
  _id: Id<"notebook">;
  userId: Id<"users">;

  // Content
  frenchText: string;
  englishText: string;
  grammarNotes: string[];
  vocabularyItems: Array<{
    word: string;
    translation: string;
    partOfSpeech: string;
  }>;
  usageNote: string;

  // Context Link
  gameLogId: Id<"gameLog">;      // Link back to story
  campaignId: Id<"campaigns">;
  sceneSummary: string;          // "Stone Chamber with Elara/Kael"

  // Organization
  tags: string[];
  userNotes: string;

  // Spaced Repetition
  nextReviewDate: number;
  intervalDays: number;          // Current interval
  easeFactor: number;            // SM-2 algorithm factor
  reviewCount: number;
  lastReviewDate: number;
}
```

**Features:**
- Filter by tags, date, campaign, scene
- Search across all saved sentences
- Sort by review status (due first)
- Export to Anki/CSV

### 3.3 Story Context Panel

When viewing a notebook entry, "View in Story" opens side panel:
- Shows ~5 game log entries before/after saved sentence
- Highlights the saved sentence
- "Continue Reading from Here" for read-only replay
- Optional: "Resume Game from Here" for branching

### 3.4 Spaced Repetition Review

**Review Types:**
1. Fill in the blank (vocabulary recall)
2. Translate sentence (comprehension)
3. Grammar identification (structure)
4. Audio dictation (future)

**Schedule (SM-2 algorithm):**
- New: 1 day
- After correct: interval × ease factor (default 2.5)
- After wrong: reset to 1 day, reduce ease
- Intervals: 1 → 3 → 7 → 14 → 30 → 90 days

**Self-Rating:**
- Hard: interval × 1.2
- Medium: interval × ease factor
- Easy: interval × ease factor × 1.3

**Notifications:**
- Show badge: "12 items due" when opening game
- Optional daily reminder

---

## 4. Database Schema Changes

### New Tables

```typescript
// Notebook entries for French learning
notebook: defineTable({
  userId: v.id("users"),
  frenchText: v.string(),
  englishText: v.string(),
  grammarNotes: v.array(v.string()),
  vocabularyItems: v.array(v.object({
    word: v.string(),
    translation: v.string(),
    partOfSpeech: v.string(),
  })),
  usageNote: v.string(),
  gameLogId: v.id("gameLog"),
  campaignId: v.id("campaigns"),
  sceneSummary: v.string(),
  tags: v.array(v.string()),
  userNotes: v.string(),
  nextReviewDate: v.number(),
  intervalDays: v.number(),
  easeFactor: v.number(),
  reviewCount: v.number(),
  lastReviewDate: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_user_and_review", ["userId", "nextReviewDate"])
  .index("by_game_log", ["gameLogId"]),

// NPC memories (separate from npcs table)
npcMemories: defineTable({
  npcId: v.id("npcs"),

  keyMoments: v.array(v.object({
    date: v.number(),
    summary: v.string(),
    emotionalImpact: v.number(),
    tags: v.array(v.string()),
  })),

  emotionalState: v.object({
    currentMood: v.string(),
    feelingsTowardPlayer: v.string(),
    trustLevel: v.number(),
    attractionLevel: v.number(),
    lastUpdated: v.number(),
  }),

  relationship: v.object({
    type: v.string(),
    dynamicEstablished: v.boolean(),
    sharedSecrets: v.array(v.string()),
  }),
}).index("by_npc", ["npcId"]),
```

### Modified Tables

```typescript
// Add to npcs table
npcs: {
  // ... existing fields
  birthDate: v.optional(v.number()),
  ageRate: v.optional(v.number()),      // Real days per game week
  autoCreated: v.optional(v.boolean()), // Was created by AI
  firstMetAt: v.optional(v.number()),   // Timestamp of first interaction
}

// Add to gameLog table
gameLog: {
  // ... existing fields
  linguisticAnalysis: v.optional(v.object({
    grammar: v.array(v.string()),
    vocabulary: v.array(v.object({
      word: v.string(),
      translation: v.string(),
      partOfSpeech: v.string(),
      usage: v.optional(v.string()),
    })),
    usageNotes: v.array(v.string()),
  })),
}
```

---

## 5. UI Components

### New Components
```
src/components/
  learning/
    AnalysisPanel.tsx       # Expandable grammar/vocab panel
    NotebookPage.tsx        # Full notebook view
    NotebookEntry.tsx       # Single entry card
    ReviewSession.tsx       # Spaced repetition UI
    StoryContextPanel.tsx   # Side panel showing story context
    ReviewReminder.tsx      # Badge showing due items

  npcs/
    NPCSidebar.tsx          # NPCs at current location
    NPCCard.tsx             # NPC portrait + relationship summary
    NPCMemoryView.tsx       # Full memory/relationship detail
```

### Modified Components
```
src/app/(game)/play/[campaignId]/page.tsx
  - Add NPC section to sidebar
  - Integrate AnalysisPanel into LogEntry
  - Add ReviewReminder to header
```

---

## 6. Implementation Priority

### Phase 1: Quick Wins
1. Streaming responses (biggest UX impact)
2. NPC sidebar display (use existing relationship data)

### Phase 2: French Learning Core
3. Linguistic analysis in AI prompt
4. AnalysisPanel component
5. Notebook schema + save functionality

### Phase 3: Learning Features
6. NotebookPage with filtering/search
7. Story context linking
8. Spaced repetition review

### Phase 4: Living World
9. NPC auto-creation from AI
10. NPC memory system
11. Aging system

---

## 7. Success Metrics

- Response perceived latency: < 3 seconds to first text
- Notebook usage: Users save 5+ sentences per session
- Review retention: 80%+ correct on due items
- NPC engagement: Users check NPC sidebar regularly

---

## Appendix: AI Prompt Changes

### Enhanced Linguistic Analysis Prompt

Add to DM system prompt:
```
For each French paragraph, provide detailed linguistic analysis:

"linguisticAnalysis": {
  "grammar": [
    "Explanation of key grammatical structures used",
    "Verb tenses and why they're used",
    "Agreement rules demonstrated"
  ],
  "vocabulary": [
    {
      "word": "French word",
      "translation": "English",
      "partOfSpeech": "noun/verb/adj/etc",
      "usage": "How this word is typically used"
    }
  ],
  "usageNotes": [
    "Cultural or contextual notes about phrasing",
    "Common expressions or idioms used"
  ]
}
```
