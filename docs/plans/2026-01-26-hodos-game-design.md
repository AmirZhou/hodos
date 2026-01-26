# Hodos - AI TTRPG Game Engine Design

## Overview

Hodos is a multiplayer AI-powered TTRPG engine with:
- Full D&D-style mechanics (ability scores, d20 system, tactical combat)
- Deep romance/relationship system with explicit adult content
- Comprehensive BDSM mechanics as a core feature
- Bilingual display (English primary, French alongside) for language learning
- Real-time multiplayer with video chat support
- Mobile-first design inspired by fables.gg

## Target Audience

Adults learning French who enjoy gaming. Explicit content disclosed upfront.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Mobile-first web app (Next.js)                              │
│  - Bilingual game UI                                         │
│  - Video/audio chat (WebRTC)                                 │
│  - Character sheet, combat, relationships                    │
│  - French learning aids                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 CAMPAIGN INSTANCE                     │   │
│  │  - Unique ID, invite code                            │   │
│  │  - Story pack reference                              │   │
│  │  - World state (NPCs, locations, events, flags)      │   │
│  │  - All player characters                             │   │
│  │  - Session history / transcript                      │   │
│  │  - Real-time presence (who's online)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Rules       │  │ AI DM       │  │ Real-time Sync      │  │
│  │ Engine      │  │ Layer       │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   VIDEO/AUDIO LAYER                     ││
│  │  WebRTC via LiveKit / Daily / Twilio                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Character System

### Ability Scores (D&D-style)

| Ability | Governs |
|---------|---------|
| Strength | Physical power, melee damage, restraining |
| Dexterity | Agility, reflexes, bondage knots |
| Constitution | Endurance, HP, stamina, pain tolerance |
| Intelligence | Knowledge, reasoning, psychology |
| Wisdom | Perception, insight, reading consent/mood |
| Charisma | Charm, seduction, domination presence |

### Skills (expanded)

- Strength: Athletics, Intimidation
- Dexterity: Acrobatics, Sleight of Hand, Stealth, Ropework
- Intelligence: Investigation, History, Psychology, Languages
- Wisdom: Insight, Perception, Medicine, Aftercare
- Charisma: Persuasion, Deception, Seduction, Performance, Domination, Submission

### Intimacy Profile

**Role Identity (Multi-axis, 0-100 scales):**
- Power: Dominant ↔ Submissive
- Action: Top ↔ Bottom
- Sensation: Sadist ↔ Masochist
- Service: Service-giving ↔ Service-receiving
- Flexibility: Fixed ↔ Switch

**Kink Tags (levels -2 to +3):**
- -2: Hard limit
- -1: Soft limit
- 0: Neutral
- +1: Curious
- +2: Enthusiast
- +3: Expert/Core

**Categories:**
- Bondage & Restraint
- Impact
- Sensation
- Power Exchange
- Service
- Role Play
- Humiliation
- Exhibition/Voyeur
- Edge Play
- Worship & Devotion

### BDSM Skills

| Skill | Ability | Governs |
|-------|---------|---------|
| Rope Arts | DEX | Bondage technique, safety, aesthetics |
| Impact Technique | DEX/STR | Accuracy, force control, rhythm |
| Sensation Craft | WIS | Reading reactions, pacing |
| Dominance | CHA | Commanding presence, control |
| Submission | WIS | Letting go, grace under control |
| Pain Processing | CON | Endurance, subspace |
| Negotiation | INT/CHA | Limits, dynamics, clarity |
| Aftercare | WIS | Comfort, emotional support |
| Scene Design | INT | Planning, pacing, narrative |
| Edge Awareness | WIS | Safety, reading danger signs |

### Consent Framework

- Safeword system: Green / Yellow / Red
- Negotiation phase before intense scenes
- Compatibility scoring from profiles
- Aftercare requirements tracked

## Rules Engine

### Core Mechanic

```
d20 + Ability Modifier + Proficiency (if proficient) vs DC
```

### Combat System

- Initiative: d20 + DEX
- Actions: Action, Bonus Action, Reaction, Movement
- Attack: d20 + mods vs AC
- Conditions: Full D&D condition list
- Death saves: 3 successes/failures

### Intimacy Scene Mechanics

- Similar action economy to combat
- Intensity tracker (0-100) instead of HP
- Scene conditions: Bound, Subspace, etc.
- Aftercare phase required for positive outcomes

### Relationships

Per-NPC tracking:
- Affinity (-100 to +100)
- Trust (0-100)
- Attraction (0-100)
- Tension (0-100)
- Intimacy (0-100)
- Dynamic (type + protocol level)

## Campaign Lifecycle

1. Create: Player starts campaign, picks story pack, generates invite code
2. Join: Others join via code, create/bring characters
3. Play: AI DM runs sessions, state syncs real-time, video optional
4. Pause: Players leave, state persists
5. Resume: Anyone rejoins, picks up where left off

## AI DM Responsibilities

**AI Decides:**
- Narrative descriptions
- NPC dialogue and behavior
- Setting DCs
- Interpreting creative input
- Generating bilingual content

**Engine Enforces:**
- All dice math
- HP, damage, death
- Conditions and durations
- Turn order
- Relationship thresholds
- Consent mechanics (safewords always work)

## Tech Stack

- Frontend: Next.js 14+ (App Router)
- Backend: Convex
- Auth: Clerk
- Video: LiveKit/Daily
- AI: Claude API
- Styling: Tailwind CSS
- UI: shadcn/ui components

## Design Reference

Mobile-first, inspired by fables.gg:
- Dark theme
- Sidebar navigation
- Campaign cards
- Narrative-focused gameplay view
- Character sheet sidebar
- Bottom input bar
