# Unified Skill & Technique System

## Problem

The current skill system is shallow — skills are static numbers (0/1/2) set at character creation that never change. NPCs have no skills at all. Magic, martial arts, BDSM techniques, and social abilities all use separate, disconnected systems. The AI DM makes inconsistent rulings on skill checks because there's no deterministic resolution.

## Design Goals

1. **One unified framework** for all skill types: combat, magic, social, intimate, utility
2. **Learnable techniques** with specific mechanical effects, not just proficiency modifiers
3. **Deterministic resolution** — techniques resolve via system math, not AI dice calls
4. **Meaningful progression** — NPCs/discoveries raise ceilings, practice fills the bar
5. **NPC parity** — NPCs use the same system with skills, tiers, and individual techniques
6. **Campaign reusability** — shared catalog of skills/techniques, campaign-specific packs

## Skill Tiers (0-8)

| Tier | Label | Power Contribution (tier x 3) |
|------|-------|-------------------------------|
| 0 | Untrained | +0 |
| 1 | Novice | +3 |
| 2 | Apprentice | +6 |
| 3 | Journeyman | +9 |
| 4 | Adept | +12 |
| 5 | Expert | +15 |
| 6 | Master | +18 |
| 7 | Grandmaster | +21 |
| 8 | Legendary | +24 |

## Progression Model

**Ceiling** — the maximum tier a character can reach in a skill. Starts at 0 for most skills. Raised by:
- NPC training (requires trust threshold, NPC must know the skill)
- Milestone discoveries (ancient scrolls, trials, narrative events)
- Quest completion

**Practice XP** — earned by using techniques in gameplay. Fills progress toward the next tier, capped by the ceiling.

**XP-to-tier thresholds (escalating):**

| Transition | XP Required |
|-----------|-------------|
| 0 to 1 | 50 |
| 1 to 2 | 120 |
| 2 to 3 | 220 |
| 3 to 4 | 360 |
| 4 to 5 | 550 |
| 5 to 6 | 800 |
| 6 to 7 | 1100 |
| 7 to 8 | 1500 |

**XP awards (deterministic, code-enforced, not AI-decided):**

| Condition | XP |
|-----------|-----|
| Base technique use | 10 |
| First time using a technique | +20 |
| Target's counter-tier > your tier | +5 |
| Potency was "overwhelming" | +5 |
| Potency was "negated" | +3 (learn from failure) |
| Same technique used 3+ times today | 0 (daily cap) |
| Technique tier < your current tier - 2 | half XP (diminishing returns) |

## Resolution Engine (Deterministic, No Dice)

When a player clicks a technique, the system resolves it:

**Power calculation (actor):**
```
actorPower = (currentTier x 3) + abilityModifier + technique.rollBonus
```

**Resistance calculation (target):**
```
targetResistance = (counterTier x 3) + counterAbilityModifier
```

**Potency from gap:**
```
gap = actorPower - targetResistance

gap >= 10  -> "overwhelming"  (150% effects, bonus narrative)
gap >= 5   -> "full"          (100% effects)
gap >= 0   -> "standard"      (80% effects)
gap >= -5  -> "reduced"       (50% effects)
gap < -5   -> "negated"       (no effect, target resists)
```

**Critical/resist thresholds (stat-driven):**
- actorPower > targetResistance x 2 -> critical effect (unique narrative, extra XP)
- targetResistance > actorPower x 2 -> full resist (target counters, they get XP)

**Cooldown enforcement:**
- Each technique has a cooldown in rounds/actions
- System blocks reactivation until cooldown expires
- UI greys out technique button with timer

## Two Interaction Modes

| Mode | Resolution | Who decides |
|------|-----------|-------------|
| Technique activation (click) | Deterministic math | System |
| Freeform action (text) | AI DM may call a roll OR suggest a matching technique | AI DM for rolls, system for technique redirect |

When a player types freeform text that maps to a known technique, the DM can suggest: "Use Silver Tongue?" — player clicks yes and it resolves deterministically.

## Data Model

### Shared Catalog (reusable across campaigns)

**skillDefinitions**
```
{
  id: "rope_arts"
  name: "Rope Arts"
  category: "combat" | "magic" | "social" | "intimate" | "utility"
  baseAbility: "dexterity"
  counterAbility: "strength"
  description: "The art of binding and restraint..."
  maxTier: 8
}
```

**techniqueDefinitions**
```
{
  id: "suspension_rig"
  name: "Suspension Rig"
  skillId: "rope_arts"
  tierRequired: 4
  description: "Full suspension bondage..."
  contexts: ["scene"]
  prerequisites: ["double_column_tie"]
  effects: {
    scene: { intensityChange: 20, comfortImpact: -10 }
    combat: { damage: "2d6", condition: "restrained" }
  }
  rollBonus: 2
  cooldown: 2
  teachable: true
}
```

### Campaign Skill Pack

**campaignSkillPacks**
```
{
  campaignId: id
  skillIds: ["rope_arts", "impact_technique", "fire_magic", ...]
  techniqueIds: ["basic_binding", "suspension_rig", "fireball", ...]
}
```

### Per-Entity State

**entitySkills** (one record per entity per skill)
```
{
  entityId: characterId or npcId
  entityType: "character" | "npc"
  campaignId: id
  skillId: "rope_arts"
  currentTier: 3
  ceiling: 5
  practiceXp: 45
  xpToNextTier: 360
}
```

**entityTechniques** (one record per entity per technique)
```
{
  entityId: characterId or npcId
  entityType: "character" | "npc"
  campaignId: id
  techniqueId: "suspension_rig"
  skillId: "rope_arts"
  timesUsed: 12
  lastUsedAt: timestamp
  usesToday: 2
}
```

### Teaching & Discovery

**teachingAvailability**
```
{
  npcId: id
  techniqueId: "suspension_rig"
  trustRequired: 60
  ceilingGrant: 5
  questPrerequisite?: "quest_id"
}
```

**ceilingRaises** (audit log)
```
{
  characterId: id
  skillId: "rope_arts"
  previousCeiling: 3
  newCeiling: 5
  source: "npc_training" | "discovery" | "milestone"
  sourceId: npcId or questId
  timestamp: number
}
```

### Activation Records

**techniqueActivations** (resolution log)
```
{
  campaignId: id
  actorId: characterId or npcId
  actorType: "character" | "npc"
  targetId: characterId or npcId
  targetType: "character" | "npc"
  techniqueId: "suspension_rig"
  context: "scene" | "combat" | "social" | "exploration"
  actorPower: 22
  targetResistance: 14
  potency: "overwhelming" | "full" | "standard" | "reduced" | "negated"
  effectsApplied: { intensityChange: 20, comfortImpact: -10 }
  xpAwarded: 10
  bonusXp: 5
  timestamp: number
}
```

## AI DM Integration

The DM's role shifts from referee to narrator for technique-based actions:

**On technique activation**, the DM receives:
```
## Technique Activated
- Actor: Elara used "Suspension Rig" (Rope Arts, Tier 4)
- Target: Kira Bloodthorn (Counter: Strength Tier 3)
- Potency: Full (100%)
- Effects applied: Intensity +20, Comfort -10, Target restrained
- Setting: Active scene, Kira's private chamber

Narrate the outcome. Do NOT contradict the mechanical effects.
```

**On freeform action**, the DM receives the character's known techniques and can suggest a match instead of calling for a roll.

**On tier-up**, the DM receives a progression event and narrates growth.

**DM rules:**
- Techniques resolve mechanically. DM narrates, does not decide success/failure.
- DM describes potency level vividly (overwhelming = exceptional, reduced = struggle).
- DM may suggest relationship/mood changes but cannot alter mechanical effects.
- For freeform: check if a known technique applies before calling for a roll.
- DM does NOT assign XP. Code does.

## UI Design

### 1. Skill Panel (character sheet tab)

Vertical list grouped by category. Each skill shows:
- Tier number and label
- Ceiling (so player knows their limit)
- XP progress bar toward next tier
- Count of known techniques
- Click to expand technique grid

### 2. Technique Grid (expanded skill view)

Cards for each technique in the skill:
- Learned: full color, shows times used
- Locked by ceiling: shows which NPC or discovery can unlock
- Locked by tier: shows tier requirement
- Locked by prerequisite: shows which technique needed first
- Hover for full description and effects

### 3. In-Gameplay Technique Bar

During combat or scenes, horizontal action bar at bottom:
- Only techniques valid for current context
- Greyed out with cooldown timer if on cooldown
- Freeform text input always available alongside technique buttons
- Click technique -> select target -> immediate resolution

## Migration from Current System

The existing `skills: Record<string, number>` on characters maps to the new system:
- Current skill proficiency (0/1/2) converts to initial tier (0/1/2)
- Existing BDSM skills (ropeArts, impactTechnique, etc.) become entries in entitySkills
- Existing spell system remains but magical techniques layer on top as the new framework
- Existing class features (Sneak Attack, Rage, etc.) become techniques in Combat skills
- Existing scene actions (tease, restrain, impact, etc.) map to technique contexts

NPCs get initialized with skills and techniques based on their templates (rivermootNpcs.ts already has ability scores and kink data to derive from).
