import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getItemById } from "../data/equipmentItems";
import type { EquipmentItem } from "../data/equipmentItems";

function itemToDoc(item: EquipmentItem) {
  return {
    id: item.id,
    name: item.name,
    nameFr: item.nameFr,
    description: item.description,
    type: item.type as "head" | "chest" | "hands" | "boots" | "cloak" | "ring" | "necklace" | "mainHand" | "offHand" | "book",
    rarity: item.rarity as "mundane" | "common" | "uncommon" | "rare" | "epic" | "legendary",
    stats: item.stats,
    specialAttributes: item.specialAttributes,
    passive: item.passive,
  };
}

export const seedTestScenario = mutation({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const { campaignId, characterId } = args;

    // Verify character exists
    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");

    // 1. Create location: The Velvet Sanctum
    const locationId = await ctx.db.insert("locations", {
      campaignId,
      name: "The Velvet Sanctum",
      nameFr: "Le Sanctuaire de Velours",
      description:
        "A luxurious underground chamber draped in deep crimson and black velvet. Wrought-iron candelabras cast flickering shadows across an array of ornate furniture — a padded St. Andrew's cross, silk-draped suspension frame, and a throne of dark leather. The air is thick with the scent of sandalwood and warm wax. Soft ambient music drifts from unseen sources.",
      descriptionFr:
        "Une chambre souterraine luxueuse drapée de velours cramoisi et noir. Des candélabres en fer forgé projettent des ombres vacillantes sur un ensemble de meubles ornés — une croix de Saint-André rembourrée, un cadre de suspension drapé de soie et un trône de cuir sombre. L'air est chargé de santal et de cire chaude. Une musique ambiante douce flotte depuis des sources invisibles.",
      connectedTo: [],
      isDiscovered: true,
      properties: {
        type: "dungeon",
        lighting: "candlelight",
        mood: "intimate",
        privacy: "private",
      },
    });

    // 2. Create NPCs
    const now = Date.now();

    const vivienneId = await ctx.db.insert("npcs", {
      campaignId,
      name: "Vivienne",
      pronouns: "she/her",
      description:
        "A tall, striking woman with sharp cheekbones and knowing dark eyes. She wears a fitted black corset over flowing crimson silk, thigh-high boots, and carries a coiled riding crop at her hip. Every movement radiates confident authority.",
      descriptionFr:
        "Une femme grande et frappante aux pommettes saillantes et aux yeux sombres perspicaces. Elle porte un corset noir ajusté sur de la soie cramoisie fluide, des cuissardes, et une cravache enroulée à la hanche. Chaque mouvement irradie une autorité confiante.",
      personality:
        "Commanding yet attentive. Vivienne reads people effortlessly and takes pleasure in guiding others to discover their desires. Strict but caring — she enforces rules because she values trust and safety above all.",
      level: 5,
      hp: 35,
      maxHp: 35,
      ac: 14,
      abilities: {
        strength: 12,
        dexterity: 14,
        constitution: 12,
        intelligence: 16,
        wisdom: 15,
        charisma: 19,
      },
      isAlive: true,
      conditions: [],
      memories: [],
      autoCreated: false,
      firstMetAt: now,
      currentLocationId: locationId,
      intimacyProfile: {
        orientation: "dominant",
        roleIdentity: {
          power: 85,
          action: 75,
          sensation: 70,
          service: 30,
          flexibility: 35,
        },
        kinks: {
          bondage: 3,
          impact: 3,
          "power exchange": 3,
          "sensation play": 2,
          "role play": 2,
          worship: 2,
          "verbal humiliation": 1,
          aftercare: 3,
        },
        aftercareNeed: 70,
        trustThreshold: 40,
      },
    });

    const lucId = await ctx.db.insert("npcs", {
      campaignId,
      name: "Luc",
      pronouns: "he/him",
      description:
        "A lean, graceful young man with pale skin, soft auburn hair, and downcast green eyes. He wears a simple black collar with a silver ring, fitted dark trousers, and no shirt — revealing faint marks across his shoulders. He moves quietly, always attentive.",
      descriptionFr:
        "Un jeune homme mince et gracieux à la peau pâle, aux cheveux auburn doux et aux yeux verts baissés. Il porte un simple collier noir avec un anneau d'argent, un pantalon sombre ajusté, et pas de chemise — révélant de légères marques sur ses épaules. Il se déplace silencieusement, toujours attentif.",
      personality:
        "Devoted and eager to please. Luc finds peace in service and structure. He is shy at first but opens up quickly to those who show genuine care. Deeply loyal once trust is established.",
      level: 3,
      hp: 22,
      maxHp: 22,
      ac: 12,
      abilities: {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 13,
        wisdom: 11,
        charisma: 14,
      },
      isAlive: true,
      conditions: [],
      memories: [],
      autoCreated: false,
      firstMetAt: now,
      currentLocationId: locationId,
      intimacyProfile: {
        orientation: "submissive",
        roleIdentity: {
          power: 15,
          action: 25,
          sensation: 70,
          service: 90,
          flexibility: 40,
        },
        kinks: {
          bondage: 2,
          "power exchange": 3,
          service: 3,
          worship: 3,
          "sensation play": 2,
          collaring: 3,
          aftercare: 3,
        },
        aftercareNeed: 85,
        trustThreshold: 35,
      },
    });

    // 3. Create relationships with player character
    await ctx.db.insert("relationships", {
      campaignId,
      characterId,
      npcId: vivienneId,
      affinity: 15,
      trust: 20,
      attraction: 25,
      tension: 30,
      intimacy: 5,
      history: ["Met at the entrance to The Velvet Sanctum"],
      flags: {},
    });

    await ctx.db.insert("relationships", {
      campaignId,
      characterId,
      npcId: lucId,
      affinity: 20,
      trust: 15,
      attraction: 15,
      tension: 10,
      intimacy: 0,
      history: ["Luc greeted you at the door with a bow"],
      flags: {},
    });

    // 4. Add items to character inventory
    const inventoryItemIds = [
      "head_green_03",  // Velvet Mask
      "boots_green_03", // Heels of Confidence
      "off_white_04",   // Rope Coil
      "neck_green_02",  // Collar of Submission
      "ring_green_03",  // Ring of Seduction
      "main_white_06",  // Riding Crop
    ];

    const inventoryItems = inventoryItemIds
      .map((id) => getItemById(id))
      .filter((i): i is EquipmentItem => i !== undefined)
      .map(itemToDoc);

    await ctx.db.patch(characterId, {
      inventory: [...character.inventory, ...inventoryItems] as typeof character.inventory,
    });

    // 5. Start a session at the location
    // End existing sessions
    const existingSessions = await ctx.db
      .query("gameSessions")
      .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
      .filter((q) => q.neq(q.field("status"), "ended"))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.patch(session._id, { status: "ended" as const });
    }

    const sessionId = await ctx.db.insert("gameSessions", {
      campaignId,
      status: "active",
      mode: "exploration",
      locationId,
      startedAt: now,
      lastActionAt: now,
    });

    // 6. Create opening game log entries
    await ctx.db.insert("gameLog", {
      campaignId,
      sessionId,
      type: "system",
      contentEn: "You have entered The Velvet Sanctum. The heavy door closes behind you with a soft click.",
      contentFr: "Vous êtes entré dans le Sanctuaire de Velours. La lourde porte se referme derrière vous avec un clic doux.",
      createdAt: now,
    });

    await ctx.db.insert("gameLog", {
      campaignId,
      sessionId,
      type: "narration",
      contentEn:
        "The chamber unfolds before you — a realm of shadow and silk. Candles flicker in iron sconces, painting the crimson drapery with dancing light. The air is warm, heavy with sandalwood. A padded cross stands against the far wall, beside a throne of dark leather. Somewhere, soft music plays. Two figures await you within.",
      contentFr:
        "La chambre se déploie devant vous — un royaume d'ombre et de soie. Des bougies vacillent dans des appliques en fer, peignant les draperies cramoisies de lumière dansante. L'air est chaud, chargé de santal. Une croix rembourrée se dresse contre le mur du fond, à côté d'un trône de cuir sombre. Quelque part, une musique douce joue. Deux silhouettes vous attendent à l'intérieur.",
      actorType: "dm",
      createdAt: now + 1,
    });

    await ctx.db.insert("gameLog", {
      campaignId,
      sessionId,
      type: "dialogue",
      contentEn:
        "Welcome, darling. I've been expecting you. I am Vivienne — mistress of this sanctum. You may explore freely... but in here, there are rules. And I enforce them personally.",
      contentFr:
        "Bienvenue, chéri(e). Je vous attendais. Je suis Vivienne — maîtresse de ce sanctuaire. Vous pouvez explorer librement... mais ici, il y a des règles. Et je les fais respecter personnellement.",
      actorType: "npc",
      actorId: vivienneId,
      actorName: "Vivienne",
      createdAt: now + 2,
    });

    await ctx.db.insert("gameLog", {
      campaignId,
      sessionId,
      type: "system",
      contentEn:
        "You notice several items left on a velvet tray near the entrance: a Velvet Mask, Heels of Confidence, a Rope Coil, a Collar of Submission, a Ring of Seduction, and a Riding Crop. They have been added to your inventory.",
      contentFr:
        "Vous remarquez plusieurs objets posés sur un plateau de velours près de l'entrée : un Masque de Velours, des Talons de Confiance, un Rouleau de Corde, un Collier de Soumission, un Anneau de Séduction et une Cravache. Ils ont été ajoutés à votre inventaire.",
      createdAt: now + 3,
    });

    await ctx.db.insert("gameLog", {
      campaignId,
      sessionId,
      type: "system",
      contentEn:
        "Quick actions: [Approach Vivienne] [Speak to Luc] [Examine the cross] [Sit on the throne] [Open your inventory]",
      contentFr:
        "Actions rapides : [Approcher Vivienne] [Parler à Luc] [Examiner la croix] [S'asseoir sur le trône] [Ouvrir votre inventaire]",
      createdAt: now + 4,
    });

    return { locationId, vivienneId, lucId, sessionId };
  },
});
