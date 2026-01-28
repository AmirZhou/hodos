import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const defaultSkills: Record<string, number> = {
  // Strength
  athletics: 0,
  intimidation: 0,
  // Dexterity
  acrobatics: 0,
  sleightOfHand: 0,
  stealth: 0,
  ropework: 0,
  // Intelligence
  investigation: 0,
  history: 0,
  psychology: 0,
  languages: 0,
  // Wisdom
  insight: 0,
  perception: 0,
  medicine: 0,
  aftercare: 0,
  // Charisma
  persuasion: 0,
  deception: 0,
  seduction: 0,
  performance: 0,
  domination: 0,
  submission: 0,
  // BDSM Skills
  ropeArts: 0,
  impactTechnique: 0,
  sensationCraft: 0,
  painProcessing: 0,
  negotiation: 0,
  sceneDesign: 0,
  edgeAwareness: 0,
};

const defaultKinks: Record<string, number> = {
  // Bondage & Restraint
  rope: 0,
  cuffs: 0,
  spreaderBars: 0,
  mummification: 0,
  predicament: 0,
  shibari: 0,
  // Impact
  spanking: 0,
  flogging: 0,
  caning: 0,
  paddling: 0,
  crops: 0,
  bareHand: 0,
  // Sensation
  wax: 0,
  ice: 0,
  pinwheels: 0,
  electricity: 0,
  tickling: 0,
  scratching: 0,
  // Power Exchange
  protocols: 0,
  titles: 0,
  rules: 0,
  punishmentReward: 0,
  orgasmControl: 0,
  chastity: 0,
  // Service
  domesticService: 0,
  bodyWorship: 0,
  grooming: 0,
  waiting: 0,
  devotion: 0,
  // Role Play
  petPlay: 0,
  authorityFigures: 0,
  strangerScenarios: 0,
  preyPredator: 0,
  // Humiliation
  verbal: 0,
  public: 0,
  clothingControl: 0,
  objectification: 0,
  tasks: 0,
  // Exhibition/Voyeur
  beingWatched: 0,
  watching: 0,
  sharing: 0,
  publicPlay: 0,
  photography: 0,
  // Edge Play
  breathPlay: -2,
  knifePlay: -2,
  fearPlay: 0,
  consensualNonConsent: -2,
  // Worship
  footWorship: 0,
  praiseWorship: 0,
  religiousMotifs: 0,
  ritualistic: 0,
};

function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function calculateMaxHp(constitution: number, level: number): number {
  const conMod = calculateModifier(constitution);
  // d10 hit die (average 6), + CON mod per level
  return 10 + conMod + (level - 1) * (6 + conMod);
}

function calculateAc(dexterity: number): number {
  // Base 10 + DEX mod (no armor)
  return 10 + calculateModifier(dexterity);
}

function calculateProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export const create = mutation({
  args: {
    userId: v.id("users"),
    campaignId: v.id("campaigns"),
    name: v.string(),
    pronouns: v.string(),
    portrait: v.optional(v.string()),
    abilities: v.object({
      strength: v.number(),
      dexterity: v.number(),
      constitution: v.number(),
      intelligence: v.number(),
      wisdom: v.number(),
      charisma: v.number(),
    }),
    class: v.optional(v.string()),
    background: v.optional(v.string()),
    adultStats: v.optional(v.object({
      composure: v.number(),
      arousal: v.number(),
      dominance: v.number(),
      submission: v.number(),
    })),
    kinkPreferences: v.optional(v.record(v.string(), v.number())),
    hardLimits: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const level = 1;
    const maxHp = calculateMaxHp(args.abilities.constitution, level);

    const characterId = await ctx.db.insert("characters", {
      userId: args.userId,
      campaignId: args.campaignId,
      name: args.name,
      pronouns: args.pronouns,
      portrait: args.portrait,

      level,
      xp: 0,
      hp: maxHp,
      maxHp,
      tempHp: 0,
      ac: calculateAc(args.abilities.dexterity),
      speed: 30,
      proficiencyBonus: calculateProficiencyBonus(level),

      abilities: args.abilities,
      skills: defaultSkills,

      class: args.class,
      background: args.background,
      classFeatures: [],

      inventory: [],
      equipped: {},

      conditions: [],
      exhaustionLevel: 0,
      deathSaves: { successes: 0, failures: 0 },

      adultStats: args.adultStats || {
        composure: 75,
        arousal: 0,
        dominance: 50,
        submission: 50,
      },
      kinkPreferences: args.kinkPreferences || defaultKinks,
      hardLimits: args.hardLimits || [],

      createdAt: Date.now(),
    });

    // Link character to campaign membership
    const membership = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_and_user", (q) =>
        q.eq("campaignId", args.campaignId).eq("userId", args.userId)
      )
      .first();

    if (membership) {
      await ctx.db.patch(membership._id, { characterId });
    }

    return characterId;
  },
});

export const get = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.characterId);
  },
});

export const listByCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .collect();
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const updateHp = mutation({
  args: {
    characterId: v.id("characters"),
    hp: v.number(),
    tempHp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const newHp = Math.max(0, Math.min(args.hp, character.maxHp));
    await ctx.db.patch(args.characterId, {
      hp: newHp,
      ...(args.tempHp !== undefined && { tempHp: args.tempHp }),
    });
  },
});

export const addXp = mutation({
  args: {
    characterId: v.id("characters"),
    xp: v.number(),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const newXp = character.xp + args.xp;
    const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
      85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

    let newLevel = character.level;
    while (newLevel < 20 && newXp >= xpThresholds[newLevel]) {
      newLevel++;
    }

    if (newLevel > character.level) {
      const newMaxHp = calculateMaxHp(character.abilities.constitution, newLevel);
      await ctx.db.patch(args.characterId, {
        xp: newXp,
        level: newLevel,
        maxHp: newMaxHp,
        hp: character.hp + (newMaxHp - character.maxHp), // Heal for the HP gained
        proficiencyBonus: calculateProficiencyBonus(newLevel),
      });
    } else {
      await ctx.db.patch(args.characterId, { xp: newXp });
    }

    return { newXp, newLevel, leveledUp: newLevel > character.level };
  },
});
