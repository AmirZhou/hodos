# Adult D&D Game Redesign

**Date:** 2026-01-28
**Status:** Approved
**Goal:** Transform the current application into a commercial adult D&D game with proper mechanics, NPC depth, and quality writing.

---

## Executive Summary

The game is **D&D first** — a full tabletop RPG where adult content is a meaningful feature, not the entire focus. Think Baldur's Gate 3: real RPG systems where intimacy is part of character relationships.

### Key Changes
- Remove all French language learning features
- Add adult-specific mechanics (Composure, Arousal, Dom/Sub scores)
- Redesign NPC interaction and memory systems
- Implement scene structure with aftercare tracking
- Add Quick Scene mode for shorter sessions
- Comprehensive kink taxonomy with AI writing guidance
- Overhaul AI prompt for quality erotic writing

---

## Part 1: Mechanics Overhaul

### 1.1 New Resource System

**Keep from D&D:**
- HP, AC, combat stats
- Ability scores (STR, DEX, CON, INT, WIS, CHA)
- Skills and proficiencies
- Standard combat and exploration

**Add for Adult Content:**

#### Composure (0-100)
- Your ability to stay in control of yourself
- **Drops when:** aroused, teased, denied, overwhelmed, humiliated
- **At 0:** You break — loss of control, other party decides what happens
- **Recovery:** After scenes, during aftercare, with rest

#### Arousal (0-100)
- Current state of excitement
- **Rises when:** stimulated, teased, witnessing/experiencing kink content
- **Effects:** High arousal = disadvantage on Composure saves
- **Release:** Can be denied (keeps building) or granted (resets)

#### Dominance Score (0-100)
- Capacity and desire to control, command, take
- High = enjoys being in charge, skilled at dominating
- Affects: dialogue options, NPC reactions, scene directions

#### Submission Score (0-100)
- Capacity and desire to surrender, serve, receive
- High = enjoys giving up control, skilled at submitting
- Not opposite of Dominance — both can be high (switch)

### 1.2 The Two-Axis Power System

Dominance and Submission are separate axes:

```
                    High Submission
                          │
         SWITCH           │          SUBMISSIVE
      (enjoys both)       │       (wants to serve)
                          │
 Low Dom ─────────────────┼───────────────── High Dominance
                          │
        VANILLA           │          DOMINANT
     (inexperienced)      │       (wants control)
                          │
                    Low Submission
```

**Examples:**
- Dom 85 / Sub 15 — Pure dominant
- Dom 20 / Sub 90 — Pure submissive
- Dom 75 / Sub 80 — True switch
- Dom 30 / Sub 25 — Vanilla/new to scene
- Dom 90 / Sub 60 — Dom-leaning switch

**NPCs have these scores too.** They can be trained, broken, shifted over time.

### 1.3 Dice Philosophy

**Principle: Rolls are for pivotal moments only.**

Scenes should FLOW narratively. Dice only appear when something is genuinely contested or uncertain.

#### Roll Triggers (ONLY times dice appear):
1. **Power shifts** — Someone tries to flip the dynamic
2. **Resistance** — Someone pushes back or defies
3. **Breaking points** — Character near their limit
4. **New territory** — Trying something risky/untested
5. **Critical choices** — Scene could fork dramatically

#### Everything else is narrative flow:
- Actions within established role → just happens
- Consensual escalation both want → just happens
- Descriptions and reactions → just happens
- Dialogue → just happens

#### Universal Roll Mechanic

One core mechanic with variable stakes:

```
Roll: d20 + relevant stat + modifiers
Against: DC (set by difficulty) or Opposed roll
```

**AI DM declares stakes before roll:**
- What you RISK (Composure, Control, Dignity, Arousal spike)
- What you GAIN (Control, NPC's Submission, Escalation)

**Example:**
> She edges you for the third time.
> **Roll CON, DC 18. Stakes: Fail = you beg, Composure drops to 0, she decides if you release.**

**Failure should advance the scene differently, not worse.** Both outcomes must be interesting.

---

## Part 2: Scene Structure

### 2.1 Three Acts (Organic, Not Forced)

**Act 1: Negotiation**
- What's on the table?
- Establish limits (hard no's, soft maybe's, yes please)
- Set dynamic (who leads, who follows, or contested)
- This is gameplay — choices shape the scene

**Act 2: Play**
- The scene itself
- Narrative flow with pivotal roll moments
- Escalation, tension, release or denial
- Ends: safeword, natural conclusion, or breaking point

**Act 3: Aftercare**
- Wind down, reconnect
- Process what happened
- **Not forced as a "phase"** — AI leads naturally
- **Tracked mechanically** — NPCs remember if it happened

### 2.2 Aftercare Consequences

| Aftercare Quality | Effect |
|-------------------|--------|
| Good aftercare | Relationship +, trust +, unlock deeper content |
| Rushed | Neutral, no bonus |
| Skipped | Trust drops, NPC cold next session, possible player debuffs |

---

## Part 3: NPC System

### 3.1 Interaction Menu

**Top Level (Normal RPG):**
- **Talk** → Conversation, quests, get to know them
- **Trade** → If merchant
- **Fight** → If hostile or sparring
- **Examine** → Learn about them

**Inside Talk (Unlocks Based on Relationship):**
- Casual conversation (always)
- Ask about quest/lore (always)
- Flirt (unlocks at attraction threshold)
- Discuss relationship (unlocks at intimacy threshold)
- **Intimate...** → Submenu (unlocks when appropriate)

**Inside Intimate Submenu:**
- Propose a scene (negotiate)
- Offer yourself (submit)
- Make a demand (dominate)
- Just be close (tender, non-scene)

### 3.2 NPC Memory Schema

```typescript
interface NPCMemory {
  // Relationship scores
  trust: number;           // 0-100
  intimacy: number;        // 0-100
  attraction: number;      // 0-100
  fear: number;            // 0-100

  // Power dynamic
  theirDomScore: number;
  theirSubScore: number;
  playerDomOverThem: number;   // How dominant player is in their eyes
  playerSubToThem: number;     // How submissive player is in their eyes

  // Preferences
  theirKinks: string[];        // What they enjoy
  theirLimits: string[];       // What they won't do
  wantsFromPlayer: string;     // Current desire
  avoidsWithPlayer: string;    // Current avoidance

  // Scene history
  sceneHistory: Array<{
    timestamp: number;
    playerRole: "dominant" | "submissive" | "switch";
    npcRole: "dominant" | "submissive" | "switch";
    activities: string[];
    intensity: number;         // 1-10
    keyMoments: string[];
    aftercare: "good" | "rushed" | "skipped";
    npcFeeling: string;
  }>;

  // Key memories (AI references in dialogue)
  keyMoments: Array<{
    summary: string;
    impact: "positive" | "negative" | "neutral";
    timestamp: number;
  }>;

  // Current state
  currentMood: string;
}
```

### 3.3 NPC Behavior

NPCs should be **active, not passive:**
- Make demands
- Set their own terms
- Refuse things
- Push boundaries (within limits)
- Have their own agenda
- Try to shift player's position

A dominant NPC should DOMINATE, not wait for input.

---

## Part 4: Kink Taxonomy

### 4.1 Categories

**Impact Play**
- Spanking, Paddling, Flogging, Caning, Cropping, Slapping

**Bondage & Restraint**
- Rope bondage, Cuffs/shackles, Spreader bars, Suspension, Predicament bondage, Mummification

**Sensation Play**
- Wax play, Ice/temperature, Pinwheels, Tickling, Electro-stim

**Worship**
- Foot worship, Boot/shoe worship, Body worship, Ass worship, Oral servitude

**Power & Control**
- Orgasm denial, Edging, Chastity, Forced orgasms, Begging/permission

**Service**
- Domestic service, Sexual service, Protocol, Objectification

**Humiliation**
- Verbal degradation, Pet play, Public humiliation, Embarrassment, SPH

**Role Play**
- Master/slave, Pet play (puppy/kitten/pony), Captor/captive, Authority figures

**Bodily**
- Watersports, Spitting, Sweat, Scent play

**Pain Play**
- Nipple torture, CBT, Biting/scratching, Clamps

**Edge Play** (flagged advanced)
- Breath play, Knife play, Fear play, CNC

**Intimacy** (vanilla options)
- Kissing, Vanilla sex, Oral, Anal, Cuddling

### 4.2 Kink Data Structure

```typescript
interface KinkDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  intensity: "mild" | "moderate" | "intense" | "extreme";
  keywords: string[];
  writingGuidance: string;      // How AI should write this
  safetyNotes: string | null;   // For edge play
}
```

**Example:**
```typescript
{
  id: "foot_worship",
  name: "Foot Worship",
  category: "worship",
  description: "Adoration, kissing, massaging, licking of feet",
  intensity: "mild",
  keywords: ["feet", "toes", "soles", "arches"],
  writingGuidance: "Focus on sensory detail — texture, scent, taste. The psychological submission through worship. Describe dominant's pleasure at being adored.",
  safetyNotes: null
}
```

### 4.3 Player Preferences UI

```
┌─────────────────────────────────────────┐
│  YOUR INTERESTS                         │
├─────────────────────────────────────────┤
│  ▼ Worship                              │
│    ☑ Foot worship                       │
│    ☑ Body worship                       │
│    ☐ Boot/shoe worship                  │
│                                         │
│  ▼ Bodily                               │
│    ☑ Watersports                        │
│    ☐ Spitting                           │
│                                         │
│  ▼ Edge Play ⚠️                         │
│    ☐ Breath play                        │
│    ☐ Knife play                         │
│                                         │
│  HARD LIMITS (never include)            │
│    ☑ Blood                              │
│    ☑ Scat                               │
└─────────────────────────────────────────┘
```

---

## Part 5: Quick Scene Mode

### 5.1 Purpose
- 20-minute complete experience
- Low friction for returning players
- "I want X specific thing now" is valid
- Can link to campaign or standalone

### 5.2 Setup Screen

```
┌─────────────────────────────────────────┐
│  QUICK SCENE SETUP                      │
├─────────────────────────────────────────┤
│  Your Role:    [Dominant ▼]             │
│                                         │
│  Partner:      [Strict Mistress ▼]      │
│                [Playful Brat    ]       │
│                [Eager Servant   ]       │
│                [Custom...       ]       │
│                                         │
│  Setting:      [Dungeon ▼]              │
│                                         │
│  Intensity:    [███████░░░] 7/10        │
│                                         │
│  Include:      ☑ Bondage                │
│                ☑ Foot worship           │
│                ☑ Denial                 │
│                                         │
│  Exclude:      [Hard limits apply]      │
│                                         │
│         [ Start Scene ]                 │
└─────────────────────────────────────────┘
```

### 5.3 Flow
1. Parameter selection (compressed negotiation)
2. AI generates matching scenario
3. Drops into action (minimal setup)
4. Scene plays with normal mechanics
5. Brief aftercare/resolution
6. Stats saved if linked to campaign

---

## Part 6: AI Prompt Structure

### 6.1 Core Identity
```
You are the Dungeon Master for an adult tabletop RPG. You run
immersive D&D-style campaigns where mature content is a natural
part of the world — not the entire focus, but not shied away from.

You are both a game master AND an erotic fiction writer.
```

### 6.2 Writing Craft
```
WRITING STYLE:

Pacing:
- Build tension slowly. Anticipation is hotter than action.
- Vary rhythm. Short punchy sentences for intensity.
  Longer flowing prose for sensuality.
- Don't rush to the "good parts." The journey matters.

Sensory Detail:
- Touch: texture, pressure, temperature, pain/pleasure
- Sound: breathing, moans, whispers, impact sounds
- Smell: skin, sweat, leather, arousal
- Taste: when relevant
- Sight: expressions, body language, positions

Internal Experience:
- What the character FEELS, not just what happens
- Racing heart, held breath, trembling, heat spreading
- Emotional state: anticipation, shame, pride, desperation

Power Dynamics in Prose:
- Word choice reflects who's in control
- Dominant: declarative sentences, commands
- Submissive: reactive, responsive, pleading
- Show dynamic through action, not just dialogue

Avoid:
- Clinical/medical terminology
- Purple prose ("throbbing member")
- Rushing through scenes
- Repetitive descriptions
- Breaking immersion with mechanical language
```

### 6.3 Scene Management
```
DICE ROLLS:

Only at pivotal moments:
- Power is contested
- Someone resists
- Breaking point approaches
- Scene could fork different directions

Between rolls: NARRATE. Let the scene breathe.

When rolls happen:
- Declare stakes clearly before roll
- Failure advances differently, not worse
- Both outcomes must be interesting

AFTERCARE:
Transition naturally when scenes wind down.
Don't force it, but track whether it happened.
NPCs remember.
```

### 6.4 Dynamic Kink Context
```
PLAYER PREFERENCES THIS SESSION:
Include: [list with writing guidance for each]
Exclude (HARD LIMITS): [list - never mention these]
Intensity: X/10

NPC PREFERENCES:
[NPC name] enjoys: [their kinks]
[NPC name] limits: [their limits]
[NPC name] currently wants: [their desire]
```

---

## Part 7: What to Remove

### Confirmed Deletions
- ❌ All French language learning
- ❌ Linguistic analysis on messages
- ❌ Vocabulary highlights
- ❌ Grammar notes
- ❌ Bilingual content (Fr/En)
- ❌ Notebook/flashcard system

### Keep but Modify
- ✅ Equipment — add adult items (restraints, toys, collars)
- ✅ Grid exploration — useful for dungeons
- ✅ Combat system — core D&D

---

## Part 8: Implementation Phases

### Phase 1: Foundation
1. Remove French learning (all code and UI)
2. Add new stats to character schema (Composure, Arousal, Dom, Sub)
3. Add new stats to NPC schema
4. Update NPC memory structure
5. Create kink taxonomy data file

### Phase 2: Core Loop
6. Rewrite AI DM prompt (writing quality focus)
7. Implement pivotal-moment dice system
8. Redesign NPC interaction modal
9. Add scene structure tracking
10. Implement aftercare memory effects

### Phase 3: Quick Scene
11. Quick Scene setup UI
12. Partner templates
13. Parameter-driven scene generation
14. Standalone mode (no campaign required)

### Phase 4: Polish
15. Kink preferences UI (character creation + settings)
16. Relationship progression visualization
17. Scene history display
18. NPC mood/state indicators

---

## Success Criteria

- [ ] Player can complete a dungeon with combat AND have intimate scene with NPC
- [ ] NPC remembers past scenes and references them
- [ ] Skipping aftercare has visible consequences
- [ ] Dice rolls feel dramatic, not interruptive
- [ ] Quick Scene delivers complete experience in <20 min
- [ ] AI writes sensual prose, not mechanical descriptions
- [ ] Adult content feels earned through relationship building
- [ ] Game is fun even without adult content (real RPG)
