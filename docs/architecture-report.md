# Hodos Architecture Report

**Date:** January 27, 2026
**Status:** Active Development (Prototype)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure](#3-directory-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Data Flow](#6-data-flow)
7. [AI Integration](#7-ai-integration)
8. [Auth System](#8-auth-system)
9. [Issues Found](#9-issues-found)
10. [Improvement Recommendations](#10-improvement-recommendations)

---

## 1. System Overview

Hodos is a bilingual (English/French) AI-powered tabletop RPG platform. Players create campaigns, build D&D 5e characters, and interact with an AI Dungeon Master powered by DeepSeek. The game includes adult content (BDSM mechanics with consent/safeword systems) and integrates French language learning with spaced repetition.

### Core Features
- AI Dungeon Master (narration, NPC dialogue, dice rolls, world state)
- D&D 5e mechanics (combat, abilities, equipment, leveling)
- Bilingual content with French vocabulary/grammar analysis
- BDSM scene system with consent, safewords, aftercare
- NPC relationships (affinity, trust, attraction, intimacy)
- NPC memory system (key moments, emotional state)
- Equipment system (170+ items, 11 slots, 6 rarity tiers)
- French learning notebook with SM-2 spaced repetition
- Seed scenarios for quick-start campaigns

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Convex (serverless real-time database) |
| AI | DeepSeek Chat API (temperature 0.8, 4000 max tokens, JSON mode) |
| Styling | Tailwind CSS 4 |
| Auth | Email-only (localStorage, no password) |
| State | Convex reactive queries (no Redux/Zustand) |
| Testing | Vitest + Testing Library |

---

## 3. Directory Structure

```
hodos/
├── convex/                    # Backend (Convex serverless functions)
│   ├── _generated/            # Auto-generated API types
│   ├── ai/
│   │   └── dm.ts              # DeepSeek AI integration
│   ├── data/
│   │   └── equipmentItems.ts  # 170+ item catalog
│   ├── game/
│   │   ├── actions.ts         # Main game loop (submitAction)
│   │   ├── combat.ts          # Turn-based tactical combat
│   │   ├── scene.ts           # BDSM scene system
│   │   ├── session.ts         # Session lifecycle
│   │   ├── log.ts             # Bilingual game log
│   │   ├── travel.ts          # Location/map navigation
│   │   ├── npcs.ts            # NPC getOrCreate
│   │   ├── itemGrants.ts      # AI item grant validation
│   │   ├── npcNameResolver.ts # Fuzzy NPC name matching
│   │   ├── seedTestScenario.ts# Seed scenario system
│   │   └── streaming.ts       # Streaming session mgmt
│   ├── schema.ts              # Database schema (18+ tables)
│   ├── campaigns.ts           # Campaign CRUD
│   ├── characters.ts          # D&D 5e character system
│   ├── npcs.ts                # NPC management
│   ├── npcMemories.ts         # NPC memory system
│   ├── relationships.ts       # Character-NPC relationships
│   ├── equipment.ts           # Equipment/inventory
│   ├── notebook.ts            # French learning + SM-2
│   ├── users.ts               # User management
│   ├── dice.ts                # Dice rolling utilities
│   ├── presence.ts            # Online/offline tracking
│   └── http.ts                # HTTP routes
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Email login
│   │   ├── (game)/play/[campaignId]/  # Main gameplay (1,262 lines)
│   │   └── (main)/
│   │       ├── page.tsx               # Dashboard
│   │       ├── campaigns/             # Campaign list, create, lobby
│   │       ├── characters/            # Character list
│   │       ├── notebook/              # French notebook + review
│   │       ├── settings/              # User settings
│   │       └── help/                  # Help page
│   ├── components/
│   │   ├── game/              # 23 game components (combat, scene, map, etc.)
│   │   ├── learning/          # French learning UI
│   │   ├── layout/            # Sidebar, nav
│   │   ├── providers/         # Auth + Convex providers
│   │   └── ui/                # Base UI (shadcn)
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Utilities
└── docs/                      # Documentation
```

---

## 4. Backend Architecture

### Schema (18+ tables)

Key tables: `users`, `campaigns`, `campaignMembers`, `characters`, `npcs`, `npcMemories`, `relationships`, `gameSessions`, `gameLog`, `locations`, `notebook`, `presence`

### Key Modules

**`game/actions.ts`** — Main game loop orchestrator. `submitAction` is the primary entry point:
1. Fetches character, session, NPCs, relationships, recent history
2. Logs player action
3. Calls AI DM with full context
4. Handles dice rolls (d20 + modifiers + proficiency)
5. Auto-creates NPCs mentioned in dialogue
6. Logs all dialogue entries
7. Applies relationship changes
8. Processes validated item grants
9. Updates session with new suggested actions

**`ai/dm.ts`** — DeepSeek integration. System prompt defines the DM as a bilingual TTRPG expert. Returns structured JSON: narration, NPC dialogue, roll requirements, suggested actions, world state changes, item grants, linguistic analysis.

**`game/combat.ts`** — Turn-based tactical combat with initiative, grid positioning, action economy (action/bonus/reaction/movement), turn timeouts.

**`game/scene.ts`** — BDSM scene management. Phases: negotiation → active → aftercare → ended. Tracks consent, limits, comfort (0-100), intensity (0-100), safewords (yellow/red).

**`notebook.ts`** — SM-2 spaced repetition. Intervals grow from 1 day up to 365 days based on review performance.

**`game/seedTestScenario.ts`** — Seed scenarios (BDSM dungeon, foot fetish spa, devoted servant, mid-scene). Creates location, NPCs with intimacy profiles, relationships, items, game log entries, and session.

---

## 5. Frontend Architecture

### Pages
- 17 page routes across auth, game, and main sections
- Main gameplay at `/play/[campaignId]` — 1,262 lines, 13 components in one file

### State Management
- **Convex reactive queries** as sole state system
- Database is single source of truth
- `useQuery` subscriptions auto-update on changes
- `GameProvider` context wraps gameplay page
- `useGameState` hook subscribes to session, log, characters, NPCs, relationships

### Component Structure
- 23 game components in `src/components/game/`
- Game engine: `GameProvider`, `useGameState`, `usePresence`
- Views: `CombatView`, `SceneView`, `LocationGraph`
- UI: shadcn component library

---

## 6. Data Flow

```
Player types action
    ↓
Frontend: ExplorationView → handleSubmit()
    ↓
Convex Action: game/actions.ts → submitAction
    ↓
1. Fetch context (character, NPCs, relationships, 10 recent logs)
2. Log player action to gameLog
3. Build context for AI (location, stats, NPC data, memories, history)
    ↓
Convex Action: ai/dm.ts → processPlayerInput
    ↓
4. Call DeepSeek API (JSON mode, temp 0.8, max 4000 tokens)
5. Parse structured JSON response
    ↓
Back to game/actions.ts
    ↓
6. If roll needed: d20 + modifiers → compare DC → narrate outcome
7. Auto-create NPCs from dialogue (fuzzy name matching)
8. Log narration + dialogue entries (bilingual + vocab annotations)
9. Apply relationship changes (affinity, trust, attraction)
10. Validate + grant items from catalog
11. Update session (suggested actions, timestamp)
    ↓
Convex database writes → reactive queries fire → UI updates
```

---

## 7. AI Integration

- **Model:** DeepSeek Chat (`deepseek-chat`) via `api.deepseek.com`
- **Temperature:** 0.8 (creative but consistent)
- **Max tokens:** 4000
- **Response format:** JSON mode (structured output)

### System Prompt Covers:
- Expert TTRPG DM with D&D 5e mechanics
- Bilingual content (EN/FR) with B1-B2 French level targeting
- Adult content guidelines (explicit but with consent mechanics)
- NPC name consistency rules (exact names, no title additions)
- Item granting from catalog (validated by rarity/level, max 3 per response)
- Vocabulary highlights (2-4 per paragraph) and grammar structures (1-2 per response)

### Context Sent to AI:
- Current location and session mode
- Character stats, HP, equipment, inventory count
- Nearby NPCs with personality, description, relationship values, memories
- Last 10 game log entries
- Player's action text

---

## 8. Auth System

**Email-only, no password.** This is a prototype auth:
- User enters email → `getOrCreateByEmail` mutation
- User object stored in localStorage (`hodos_user`)
- React context (`AuthContext`) provides `user`, `isAuthenticated`, `isLoading`
- Schema has `clerkId: v.optional(v.string())` prepared for future Clerk integration

**NOT production-ready:** No password, no email verification, no rate limiting, localStorage vulnerable to XSS.

---

## 9. Issues Found

### 9.1 CRITICAL — Security (No Auth on Mutations)

**Every mutation trusts the caller.** No authentication or authorization middleware. Any user can modify any other user's data by providing their IDs.

Affected mutations (all of them):
- `campaigns.updateStatus` — Any user can change any campaign's status
- `characters.updateHp` — User A can set User B's HP to 0
- `characters.addXp` — No max value check, no ownership check
- `notebook.updateNotes` — Users can edit each other's notebooks
- `relationships.update` — Any user can modify any relationship
- `equipment.equipItem` — User A can manipulate User B's inventory
- `npcs.updateHp` — Anyone can kill NPCs in any campaign
- `campaigns.create` — Caller provides `userId` directly, can impersonate

### 9.2 CRITICAL — Race Conditions

| Race Condition | Impact |
|---------------|--------|
| **Combat HP** — read-modify-write in `combat.ts:316-336` | Two attacks: damage lost (reads stale HP) |
| **Scene consent** — `scene.ts:205-281` | Two participants submit simultaneously, consent not properly recorded |
| **Inventory duplication** — `equipment.ts:120-137` | AI grants same item twice in quick succession → duplicated |
| **Campaign join** — `campaigns.ts:166-174` | Two players join last slot simultaneously → exceeds max |
| **XP/level-up** — `characters.ts:257-289` | Concurrent XP awards → XP lost |

### 9.3 HIGH — Schema Issues

- **Missing indexes:** npcs by campaign+location, locations by parent, gameLog by session
- **Unbounded arrays:** `npcs.memories` and `relationships.history` grow without limit

### 9.4 HIGH — AI Robustness

| Issue | Detail |
|-------|--------|
| No timeout on DeepSeek calls | `fetch()` with no `AbortController` — hangs indefinitely |
| No retry logic | Single call, 503/429 = total failure |
| Malformed JSON fallback loses data | NPC dialogue, items, world changes all lost |
| Silent item grant failures | Player thinks they got item but didn't |
| AI can create infinite NPCs | No per-action or per-campaign NPC limit |
| Unbounded relationship deltas | AI can return `{ affinity: 9999 }` |

### 9.5 HIGH — Game Logic Bugs

| Bug | Location | Impact |
|-----|----------|--------|
| Death not checked in combat | `combat.ts:316-336` | HP hits 0 but character stays in turn order |
| Movement ignores diagonal cost and terrain | `combat.ts:372-418` | Always 5ft/cell, D&D rules require 5-10-5-10 diagonal |
| Equipment slot collision | `equipment.ts:42-54` | Both ring slots full → silently overwrites ring1 |
| Aftercare trust double-applies | `scene.ts:540-546` | Spread operator doesn't override `trust` correctly |
| Turn timeout never enforced | `combat.ts:683-705` | `handleTurnTimeout` exported but never called automatically |
| Scene intensity 0 during aftercare | `scene.ts:315-333` | Mood becomes "anticipation" instead of aftercare-appropriate |

### 9.6 HIGH — Frontend Issues

| Issue | Detail |
|-------|--------|
| **God component** | `play/[campaignId]/page.tsx` = 1,262 lines, 13 components in one file |
| **No error boundaries** | Zero `error.tsx` files, single crash kills entire app |
| **Silent failures** | 43 catch blocks with only `console.error`, no user feedback |
| **Zero React.memo** | No memoization despite heavy re-rendering |
| **Zero accessibility** | No `aria-*` attributes, no `role=`, no `<label>` elements |
| **Index as array key** | 15+ instances of `key={i}`, breaks reconciliation |
| **No code splitting** | CombatView, SceneView loaded eagerly |
| **Non-functional UI** | Mic button always disabled, thumbs up/down buttons have no handlers |
| **No virtual scrolling** | Game log fetches 50 entries, no pagination |
| **Deep imports** | 43 instances of `../../../` instead of `@/` alias |

### 9.7 MEDIUM — Performance

| Issue | Detail |
|-------|--------|
| N+1 in campaign list | `campaigns.ts:61-89` — 1 + 10 + 10 queries for 10 campaigns |
| Full log scan for context | `notebook.ts:278-294` — fetches ALL logs to find 7 nearby entries |
| Individual combat queries | `combat.ts:54-91` — N queries for N combatants |
| No rate limiting on actions | Players can spam actions, rack up AI costs |

---

## 10. Improvement Recommendations

### Tier 1 — Before Any Production Use

1. **Add auth middleware to all mutations.** Every mutation must verify caller identity and ownership. Create a reusable `withAuth` wrapper.
2. **Add retry + timeout to DeepSeek calls.** Use `AbortController` with 30s timeout and exponential backoff (3 retries).
3. **Add error boundaries.** Create `src/app/error.tsx` and `src/app/(game)/play/[campaignId]/error.tsx`.
4. **Fix combat HP race condition.** Use Convex's atomic operations or optimistic locking.

### Tier 2 — High Priority

5. **Split the god component.** Extract `play/[campaignId]/page.tsx` into ~10 focused files: `GameHeader`, `GameModeRouter`, `ExplorationView`, `LogEntry`, `QuickAction`, `EquipmentSlotPopover`, `GameSidebar`, `RelationshipEntry`, `StatCards`.
6. **Add missing schema indexes.** NPCs by campaign+location, locations by parent, gameLog by session.
7. **Fix game logic bugs.** Death checks in combat, ring slot collision, aftercare trust calculation, scene intensity during aftercare.
8. **Add user-facing error messages.** Replace all `console.error`-only catch blocks with toast notifications or error states.
9. **Memoize expensive components.** `React.memo` on `LogEntry`, `RelationshipEntry`, `QuickAction`. Memoize `startSession`/`endSession` callbacks in `GameProvider`.

### Tier 3 — Medium Priority

10. **Add accessibility.** `aria-label` on icon buttons, proper `<label>` elements, `role` attributes on interactive elements.
11. **Implement code splitting.** `React.lazy()` for CombatView, SceneView, LocationGraph.
12. **Add rate limiting.** Cooldown between player actions (e.g., 2s minimum).
13. **Cap unbounded arrays.** Max 50 NPC memories, max 100 relationship history entries.
14. **Limit AI NPC creation.** Max 3 new NPCs per action, max 50 per campaign.
15. **Optimize N+1 queries.** Batch campaign lookups, denormalize member counts.
16. **Add virtual scrolling** for game log (react-window or similar).

### Tier 4 — Technical Debt

17. Replace deep `../../../` imports with `@/` path alias consistently.
18. Remove non-functional UI (disabled mic button, no-op thumbs up/down).
19. Refactor character creation page (752 lines) into step components.
20. Add observability/logging beyond console.warn.
21. Upgrade auth to Clerk (schema already has `clerkId` field prepared).

---

## Issue Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Security | 8 | — | — | 8 |
| Race Conditions | 3 | 2 | — | 5 |
| Schema | — | 3 | 2 | 5 |
| AI Robustness | 2 | 4 | — | 6 |
| Game Logic | 1 | 5 | 1 | 7 |
| Frontend | 3 | 6 | 4 | 13 |
| Performance | — | 3 | 1 | 4 |
| **Total** | **17** | **23** | **8** | **48** |
