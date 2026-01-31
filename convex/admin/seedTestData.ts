import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { ensureRivermootMap } from "../game/ensureRivermootMap";
import { createItemInstance, logItemEvent } from "../equipment";
import { RIVERMOOT_START_LOCATION } from "../data/rivermootCity";

/**
 * Seeds a complete test environment:
 * 1. Campaign
 * 2. Character with starting gear
 * 3. Game session at The Crossroads
 * 4. Loot containers with item instances
 *
 * Usage: npx convex run admin/seedTestData:seed '{"userId":"<USER_ID>"}'
 */
export const seed = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Create campaign
    const campaignId = await ctx.db.insert("campaigns", {
      ownerId: args.userId,
      name: "Test Campaign — Item System",
      inviteCode: "TEST-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      status: "active",
      settings: {
        maxPlayers: 4,
        allowVideoChat: false,
        contentRating: "explicit",
      },
      seedScenario: "rivermoot-city",
      createdAt: now,
      lastPlayedAt: now,
    });

    // 2. Create campaign membership
    await ctx.db.insert("campaignMembers", {
      campaignId,
      userId: args.userId,
      role: "owner",
      isOnline: false,
      lastSeenAt: now,
    });

    // 3. Create character
    const characterId = await ctx.db.insert("characters", {
      userId: args.userId,
      campaignId,
      name: "Rhai",
      pronouns: "she/her",
      level: 5,
      xp: 6500,
      hp: 45,
      maxHp: 45,
      tempHp: 0,
      ac: 14,
      speed: 30,
      proficiencyBonus: 3,
      abilities: {
        strength: 10,
        dexterity: 16,
        constitution: 14,
        intelligence: 12,
        wisdom: 13,
        charisma: 8,
      },
      skills: {
        acrobatics: 1,
        stealth: 2,
        perception: 1,
        sleightOfHand: 1,
        athletics: 0,
        intimidation: 0,
        ropework: 0,
        investigation: 0,
        history: 0,
        psychology: 0,
        languages: 0,
        insight: 0,
        medicine: 0,
        aftercare: 0,
        persuasion: 0,
        deception: 1,
        seduction: 0,
        performance: 0,
        domination: 0,
        submission: 0,
        ropeArts: 0,
        impactTechnique: 0,
        sensationCraft: 0,
        painProcessing: 0,
        negotiation: 0,
        sceneDesign: 0,
        edgeAwareness: 0,
      },
      class: "rogue",
      background: "Urchin",
      classFeatures: ["Sneak Attack", "Cunning Action"],
      conditions: [],
      exhaustionLevel: 0,
      deathSaves: { successes: 0, failures: 0 },
      adultStats: {
        composure: 75,
        arousal: 0,
        dominance: 40,
        submission: 60,
      },
      createdAt: now,
    });

    // Link character to membership
    const membership = await ctx.db
      .query("campaignMembers")
      .withIndex("by_campaign_and_user", (q) =>
        q.eq("campaignId", campaignId).eq("userId", args.userId)
      )
      .first();
    if (membership) {
      await ctx.db.patch(membership._id, { characterId });
    }

    // 4. Give starting gear (rogue)
    const rogueGear: { slot: string; templateId: string }[] = [
      { slot: "head", templateId: "head_green_01" },
      { slot: "chest", templateId: "chest_white_03" },
      { slot: "hands", templateId: "hands_white_01" },
      { slot: "boots", templateId: "boots_green_02" },
      { slot: "mainHand", templateId: "main_white_04" },
    ];

    for (const { slot, templateId } of rogueGear) {
      const itemId = await createItemInstance(ctx, {
        templateId,
        campaignId,
        status: "equipped",
        ownerId: characterId,
        equippedSlot: slot,
      });
      await logItemEvent(ctx, {
        itemId,
        campaignId,
        event: "created",
        actorId: characterId,
        metadata: "Starting gear",
      });
    }

    // Inventory item
    const invItemId = await createItemInstance(ctx, {
      templateId: "off_white_03",
      campaignId,
      status: "inventory",
      ownerId: characterId,
    });
    await logItemEvent(ctx, {
      itemId: invItemId,
      campaignId,
      event: "created",
      actorId: characterId,
      metadata: "Starting gear",
    });

    // 5. Ensure Rivermoot map exists
    await ensureRivermootMap(ctx, campaignId);

    // Find The Crossroads location
    const maps = await ctx.db
      .query("campaignMaps")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .collect();

    let locationId = undefined;
    for (const cm of maps) {
      const map = await ctx.db.get(cm.mapId);
      if (!map?.cityGridData) continue;
      const loc = await ctx.db
        .query("locations")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .filter((q) => q.eq(q.field("templateId"), RIVERMOOT_START_LOCATION))
        .first();
      if (loc) {
        locationId = loc._id;
        break;
      }
    }

    // 6. Create game session at The Crossroads
    // End old sessions for this campaign first
    const oldSessions = await ctx.db
      .query("gameSessions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .collect();
    for (const s of oldSessions) {
      await ctx.db.patch(s._id, { status: "ended" });
    }

    // Find city map for navigation
    let currentMapId = undefined;
    for (const cm of maps) {
      const map = await ctx.db.get(cm.mapId);
      if (map?.cityGridData) {
        currentMapId = map._id;
        break;
      }
    }

    const sessionId = await ctx.db.insert("gameSessions", {
      campaignId,
      status: "active",
      mode: "exploration",
      locationId,
      currentMapId,
      navigationMode: "location",
      cityPosition: { x: 7, y: 7 },
      startedAt: now,
      lastActionAt: now,
    });

    // 7. Create world state
    await ctx.db.insert("worldState", {
      campaignId,
      currentTime: { day: 1, hour: 10, minute: 0 },
      weather: "clear",
      flags: {},
      activeEvents: [],
    });

    // 8. Seed loot containers at The Crossroads
    if (locationId) {
      // Container 1: Merchant's Cart (mixed rarity)
      const cartId = await ctx.db.insert("lootContainers", {
        campaignId,
        locationId,
        containerType: "container",
        name: "Merchant's Cart",
        description: "A weathered cart overflowing with goods.",
        isOpened: false,
        isLooted: false,
        sourceType: "seed",
        createdAt: now,
      });

      const cartItems = [
        "main_legendary_01", // Godslayer Blade (legendary - BOP)
        "chest_epic_01",     // Dragon Scale Mail (epic - BOE)
        "boots_white_01",    // common
        "cloak_white_01",    // common
        "neck_white_02",     // common
      ];

      for (const templateId of cartItems) {
        const itemId = await createItemInstance(ctx, {
          templateId,
          campaignId,
          status: "container",
          containerId: cartId,
        });
        await logItemEvent(ctx, {
          itemId,
          campaignId,
          event: "created",
          metadata: `Seeded in Merchant's Cart`,
        });
      }

      // Container 2: Ground items (mundane)
      const groundId = await ctx.db.insert("lootContainers", {
        campaignId,
        locationId,
        containerType: "ground",
        name: "Scattered Items",
        isOpened: true,
        isLooted: false,
        sourceType: "seed",
        createdAt: now,
      });

      const groundItems = [
        "head_gray_01",
        "hands_gray_01",
        "ring_gray_02",
        "off_gray_01",
      ];

      for (const templateId of groundItems) {
        const itemId = await createItemInstance(ctx, {
          templateId,
          campaignId,
          status: "container",
          containerId: groundId,
        });
        await logItemEvent(ctx, {
          itemId,
          campaignId,
          event: "created",
          metadata: "Seeded on ground",
        });
      }

      // Container 3: Locked chest (rare items)
      const chestId = await ctx.db.insert("lootContainers", {
        campaignId,
        locationId,
        containerType: "chest",
        name: "Iron-Bound Chest",
        description: "A heavy chest secured with a rusted padlock.",
        lock: { isLocked: true, dc: 15 },
        isOpened: false,
        isLooted: false,
        sourceType: "seed",
        createdAt: now,
      });

      const chestItems = [
        "main_rare_02",
        "ring_rare_01",
        "book_green_01",
      ];

      for (const templateId of chestItems) {
        const itemId = await createItemInstance(ctx, {
          templateId,
          campaignId,
          status: "container",
          containerId: chestId,
        });
        await logItemEvent(ctx, {
          itemId,
          campaignId,
          event: "created",
          metadata: "Seeded in Iron-Bound Chest",
        });
      }
    }

    return {
      campaignId,
      characterId,
      sessionId,
      locationId,
      message: "Test data seeded successfully",
    };
  },
});
