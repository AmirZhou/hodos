import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getItemById } from "../data/equipmentItems";
import type { EquipmentItem } from "../data/equipmentItems";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

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

// Clean up all seeded data for a campaign so we can re-seed cleanly
async function cleanCampaignSeedData(ctx: MutationCtx, campaignId: Id<"campaigns">, characterId: Id<"characters">) {
  // Delete NPCs (non-auto-created = seeded)
  const npcs = await ctx.db
    .query("npcs")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();
  for (const npc of npcs) {
    // Delete relationships for this NPC
    const rels = await ctx.db
      .query("relationships")
      .withIndex("by_character_and_npc", (q) =>
        q.eq("characterId", characterId).eq("npcId", npc._id)
      )
      .collect();
    for (const rel of rels) {
      await ctx.db.delete(rel._id);
    }
    await ctx.db.delete(npc._id);
  }

  // Delete locations
  const locations = await ctx.db
    .query("locations")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();
  for (const loc of locations) {
    await ctx.db.delete(loc._id);
  }

  // End sessions
  const sessions = await ctx.db
    .query("gameSessions")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .filter((q) => q.neq(q.field("status"), "ended"))
    .collect();
  for (const session of sessions) {
    await ctx.db.patch(session._id, { status: "ended" as const });
  }

  // Delete game log
  const logs = await ctx.db
    .query("gameLog")
    .withIndex("by_campaign", (q) => q.eq("campaignId", campaignId))
    .collect();
  for (const log of logs) {
    await ctx.db.delete(log._id);
  }

  // Reset character inventory
  const character = await ctx.db.get(characterId);
  if (character) {
    await ctx.db.patch(characterId, { inventory: [] as typeof character.inventory });
  }
}

function resolveItems(ids: string[]) {
  return ids
    .map((id) => getItemById(id))
    .filter((i): i is EquipmentItem => i !== undefined)
    .map(itemToDoc);
}

// ─── Scenario: BDSM Dungeon ────────────────────────────────────

async function seedBdsmDungeon(ctx: MutationCtx, campaignId: Id<"campaigns">, characterId: Id<"characters">, character: { inventory: any[] }) {
  const now = Date.now();

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
    properties: { type: "dungeon", lighting: "candlelight", mood: "intimate", privacy: "private" },
  });

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
    level: 5, hp: 35, maxHp: 35, ac: 14,
    abilities: { strength: 12, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 15, charisma: 19 },
    isAlive: true, conditions: [], memories: [], autoCreated: false, firstMetAt: now, currentLocationId: locationId,
    intimacyProfile: {
      orientation: "dominant",
      roleIdentity: { power: 85, action: 75, sensation: 70, service: 30, flexibility: 35 },
      kinks: { bondage: 3, impact: 3, "power exchange": 3, "sensation play": 2, "role play": 2, worship: 2, "verbal humiliation": 1, aftercare: 3 },
      aftercareNeed: 70, trustThreshold: 40,
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
    level: 3, hp: 22, maxHp: 22, ac: 12,
    abilities: { strength: 10, dexterity: 16, constitution: 12, intelligence: 13, wisdom: 11, charisma: 14 },
    isAlive: true, conditions: [], memories: [], autoCreated: false, firstMetAt: now, currentLocationId: locationId,
    intimacyProfile: {
      orientation: "submissive",
      roleIdentity: { power: 15, action: 25, sensation: 70, service: 90, flexibility: 40 },
      kinks: { bondage: 2, "power exchange": 3, service: 3, worship: 3, "sensation play": 2, collaring: 3, aftercare: 3 },
      aftercareNeed: 85, trustThreshold: 35,
    },
  });

  await ctx.db.insert("relationships", {
    campaignId, characterId, npcId: vivienneId,
    affinity: 15, trust: 20, attraction: 25, tension: 30, intimacy: 5,
    history: ["Met at the entrance to The Velvet Sanctum"], flags: {},
  });
  await ctx.db.insert("relationships", {
    campaignId, characterId, npcId: lucId,
    affinity: 20, trust: 15, attraction: 15, tension: 10, intimacy: 0,
    history: ["Luc greeted you at the door with a bow"], flags: {},
  });

  const items = resolveItems(["head_green_03", "boots_green_03", "off_white_04", "neck_green_02", "ring_green_03", "main_white_06"]);
  await ctx.db.patch(characterId, {
    inventory: [...character.inventory, ...items] as typeof character.inventory,
  });

  const sessionId = await ctx.db.insert("gameSessions", {
    campaignId, status: "active", mode: "exploration", locationId, startedAt: now, lastActionAt: now,
  });

  await ctx.db.insert("gameLog", { campaignId, sessionId, type: "system", contentEn: "You have entered The Velvet Sanctum. The heavy door closes behind you with a soft click.", contentFr: "Vous êtes entré dans le Sanctuaire de Velours. La lourde porte se referme derrière vous avec un clic doux.", createdAt: now });
  await ctx.db.insert("gameLog", { campaignId, sessionId, type: "narration", actorType: "dm", contentEn: "The chamber unfolds before you — a realm of shadow and silk. Candles flicker in iron sconces, painting the crimson drapery with dancing light. The air is warm, heavy with sandalwood. A padded cross stands against the far wall, beside a throne of dark leather. Somewhere, soft music plays. Two figures await you within.", contentFr: "La chambre se déploie devant vous — un royaume d'ombre et de soie. Des bougies vacillent dans des appliques en fer, peignant les draperies cramoisies de lumière dansante. L'air est chaud, chargé de santal. Une croix rembourrée se dresse contre le mur du fond, à côté d'un trône de cuir sombre. Quelque part, une musique douce joue. Deux silhouettes vous attendent à l'intérieur.", createdAt: now + 1 });
  await ctx.db.insert("gameLog", { campaignId, sessionId, type: "dialogue", actorType: "npc", actorId: vivienneId, actorName: "Vivienne", contentEn: "Welcome, darling. I've been expecting you. I am Vivienne — mistress of this sanctum. You may explore freely... but in here, there are rules. And I enforce them personally.", contentFr: "Bienvenue, chéri(e). Je vous attendais. Je suis Vivienne — maîtresse de ce sanctuaire. Vous pouvez explorer librement... mais ici, il y a des règles. Et je les fais respecter personnellement.", createdAt: now + 2 });
  await ctx.db.insert("gameLog", { campaignId, sessionId, type: "system", contentEn: "You notice several items left on a velvet tray near the entrance: a Velvet Mask, Heels of Confidence, a Rope Coil, a Collar of Submission, a Ring of Seduction, and a Riding Crop. They have been added to your inventory.", contentFr: "Vous remarquez plusieurs objets posés sur un plateau de velours près de l'entrée : un Masque de Velours, des Talons de Confiance, un Rouleau de Corde, un Collier de Soumission, un Anneau de Séduction et une Cravache. Ils ont été ajoutés à votre inventaire.", createdAt: now + 3 });
  await ctx.db.insert("gameLog", { campaignId, sessionId, type: "system", contentEn: "Quick actions: [Approach Vivienne] [Speak to Luc] [Examine the cross] [Sit on the throne] [Open your inventory]", contentFr: "Actions rapides : [Approcher Vivienne] [Parler à Luc] [Examiner la croix] [S'asseoir sur le trône] [Ouvrir votre inventaire]", createdAt: now + 4 });

  return { locationId, sessionId };
}

// ─── Scenario: Foot Fetish Spa ─────────────────────────────────

async function seedFootFetishSpa(ctx: MutationCtx, campaignId: Id<"campaigns">, characterId: Id<"characters">, character: { inventory: any[] }) {
  const now = Date.now();

  const locationId = await ctx.db.insert("locations", {
    campaignId,
    name: "The Silken Step",
    nameFr: "Le Pas de Soie",
    description:
      "A lavish private spa suite with warm marble floors and the gentle sound of running water. Plush velvet chaise lounges line the walls beside low ottomans draped in silk. Aromatic oils, lotions, and warm towels are arranged on a gilded tray. Soft golden light filters through translucent curtains. In the center, a cushioned pedestal stands invitingly — clearly designed for foot worship and pampering. Ankle bracelets and toe rings glitter in a crystal dish.",
    descriptionFr:
      "Une suite de spa privée somptueuse avec des sols en marbre chaud et le doux bruit de l'eau courante. Des chaises longues en velours moelleux bordent les murs à côté de poufs bas drapés de soie. Des huiles aromatiques, des lotions et des serviettes chaudes sont disposées sur un plateau doré. Une lumière dorée douce filtre à travers des rideaux translucides. Au centre, un piédestal rembourré se dresse de manière invitante — clairement conçu pour le culte et le soin des pieds. Des bracelets de cheville et des bagues d'orteil scintillent dans un plat en cristal.",
    connectedTo: [],
    isDiscovered: true,
    properties: { type: "spa", lighting: "warm golden", mood: "sensual", privacy: "private" },
  });

  const isabelleId = await ctx.db.insert("npcs", {
    campaignId,
    name: "Isabelle",
    pronouns: "she/her",
    description:
      "A lithe, playful woman with honey-blonde hair and mischievous hazel eyes. She wears a sheer ivory robe that falls just above her knees, and her feet are bare — perfectly pedicured with crimson nails, adorned with a delicate gold ankle chain. She curls her toes against the warm marble as she smiles at you.",
    descriptionFr:
      "Une femme svelte et espiègle aux cheveux blond miel et aux yeux noisette malicieux. Elle porte une robe ivoire transparente qui tombe juste au-dessus des genoux, et ses pieds sont nus — parfaitement pédicurés avec des ongles cramoisis, ornés d'une délicate chaîne de cheville en or. Elle recroqueville ses orteils contre le marbre chaud en vous souriant.",
    personality:
      "Flirtatious and uninhibited. Isabelle adores attention — especially directed at her feet. She is warm, teasing, and expressive, often stretching or flexing her toes when she notices someone looking. She enjoys being pampered and is generous with affection in return.",
    level: 4, hp: 28, maxHp: 28, ac: 11,
    abilities: { strength: 10, dexterity: 15, constitution: 12, intelligence: 14, wisdom: 13, charisma: 18 },
    isAlive: true, conditions: [], memories: [], autoCreated: false, firstMetAt: now, currentLocationId: locationId,
    intimacyProfile: {
      orientation: "switch",
      roleIdentity: { power: 55, action: 60, sensation: 80, service: 45, flexibility: 75 },
      kinks: { "foot worship": 3, "sensation play": 3, massage: 3, pampering: 3, teasing: 2, "body worship": 2, "role play": 1, aftercare: 2 },
      aftercareNeed: 50, trustThreshold: 25,
    },
  });

  const marcelId = await ctx.db.insert("npcs", {
    campaignId,
    name: "Marcel",
    pronouns: "he/him",
    description:
      "A well-built man with warm brown skin, close-cropped hair, and a gentle smile. He wears loose linen trousers rolled to the calf, barefoot on the warm stone. His hands are strong and practiced — clearly a masseur by trade. A small tattoo of a lotus decorates his ankle.",
    descriptionFr:
      "Un homme bien bâti à la peau brune chaleureuse, aux cheveux coupés courts et au sourire doux. Il porte un pantalon en lin ample retroussé au mollet, pieds nus sur la pierre chaude. Ses mains sont fortes et exercées — visiblement un masseur de métier. Un petit tatouage de lotus orne sa cheville.",
    personality:
      "Attentive and sensual. Marcel is a devoted caretaker who expresses affection through touch. He takes pride in reading bodies and knowing exactly where and how to press. He is quietly confident, unhurried, and worships beauty in all its forms — with a particular reverence for feet.",
    level: 4, hp: 30, maxHp: 30, ac: 12,
    abilities: { strength: 14, dexterity: 16, constitution: 13, intelligence: 12, wisdom: 15, charisma: 16 },
    isAlive: true, conditions: [], memories: [], autoCreated: false, firstMetAt: now, currentLocationId: locationId,
    intimacyProfile: {
      orientation: "switch",
      roleIdentity: { power: 40, action: 55, sensation: 85, service: 75, flexibility: 70 },
      kinks: { "foot worship": 3, massage: 3, "sensation play": 3, "body worship": 3, service: 2, pampering: 2, aftercare: 3 },
      aftercareNeed: 60, trustThreshold: 30,
    },
  });

  await ctx.db.insert("relationships", {
    campaignId, characterId, npcId: isabelleId,
    affinity: 20, trust: 20, attraction: 30, tension: 25, intimacy: 5,
    history: ["Isabelle welcomed you with a barefoot curtsy"], flags: {},
  });
  await ctx.db.insert("relationships", {
    campaignId, characterId, npcId: marcelId,
    affinity: 15, trust: 25, attraction: 20, tension: 15, intimacy: 0,
    history: ["Marcel offered you a warm towel and a knowing smile"], flags: {},
  });

  // Items: boots (allure), ring (seduction), necklace, book of sensual arts, cloak
  const items = resolveItems([
    "boots_green_03", // Heels of Confidence (allure)
    "ring_green_03",  // Ring of Seduction
    "neck_green_01",  // whatever necklace exists
    "book_green_01",  // Tome of Sensual Arts
    "cloak_green_01", // Cloak of Elvenkind
    "hands_green_03", // Grip Wraps — for massage
  ]);
  await ctx.db.patch(characterId, {
    inventory: [...character.inventory, ...items] as typeof character.inventory,
  });

  const sessionId = await ctx.db.insert("gameSessions", {
    campaignId, status: "active", mode: "exploration", locationId, startedAt: now, lastActionAt: now,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "system",
    contentEn: "You have entered The Silken Step — a private spa suite reserved just for you tonight.",
    contentFr: "Vous êtes entré dans Le Pas de Soie — une suite de spa privée réservée rien que pour vous ce soir.",
    createdAt: now,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "narration", actorType: "dm",
    contentEn: "Warm marble greets your bare feet as you step inside. The air is fragrant with jasmine and vanilla oil. Golden light bathes the room in a soft glow. Plush lounges and silk-draped ottomans invite you to sit. On a gilded tray, you see aromatic massage oils, warm towels, and a crystal dish of ankle bracelets and toe rings. Two people await you — both barefoot, both smiling.",
    contentFr: "Le marbre chaud accueille vos pieds nus lorsque vous entrez. L'air est parfumé de jasmin et d'huile de vanille. Une lumière dorée baigne la pièce d'une douce lueur. Des chaises longues moelleuses et des poufs drapés de soie vous invitent à vous asseoir. Sur un plateau doré, vous apercevez des huiles de massage aromatiques, des serviettes chaudes et un plat en cristal de bracelets de cheville et de bagues d'orteil. Deux personnes vous attendent — pieds nus toutes les deux, souriantes.",
    createdAt: now + 1,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "dialogue", actorType: "npc", actorId: isabelleId, actorName: "Isabelle",
    contentEn: "There you are! Come, sit down. Marcel has warmed the oils already. I've been dying to try those ankle bracelets... unless you'd rather put them on me yourself?",
    contentFr: "Te voilà ! Viens, assieds-toi. Marcel a déjà réchauffé les huiles. Je meurs d'envie d'essayer ces bracelets de cheville... à moins que tu préfères me les mettre toi-même ?",
    createdAt: now + 2,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "dialogue", actorType: "npc", actorId: marcelId, actorName: "Marcel",
    contentEn: "Welcome. Make yourself comfortable — shoes off, of course. I'll start whenever you're ready. Feet first... the rest follows naturally.",
    contentFr: "Bienvenue. Mettez-vous à l'aise — chaussures enlevées, bien sûr. Je commence quand vous êtes prêt(e). Les pieds d'abord... le reste suit naturellement.",
    createdAt: now + 3,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "system",
    contentEn: "You find items on the gilded tray: Heels of Confidence, a Ring of Seduction, and more. They have been added to your inventory.",
    contentFr: "Vous trouvez des objets sur le plateau doré : des Talons de Confiance, un Anneau de Séduction, et plus encore. Ils ont été ajoutés à votre inventaire.",
    createdAt: now + 4,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "system",
    contentEn: "Quick actions: [Sit on the lounge] [Offer to massage Isabelle's feet] [Let Marcel begin] [Examine the oils] [Put an ankle bracelet on Isabelle] [Remove your shoes]",
    contentFr: "Actions rapides : [S'asseoir sur la chaise longue] [Proposer de masser les pieds d'Isabelle] [Laisser Marcel commencer] [Examiner les huiles] [Mettre un bracelet de cheville à Isabelle] [Enlever vos chaussures]",
    createdAt: now + 5,
  });

  return { locationId, sessionId };
}

// ─── Scenario: Servant Already Serving ──────────────────────────

async function seedServantServing(ctx: MutationCtx, campaignId: Id<"campaigns">, characterId: Id<"characters">, character: { inventory: any[] }) {
  const now = Date.now();

  const locationId = await ctx.db.insert("locations", {
    campaignId,
    name: "Your Private Chambers",
    nameFr: "Vos Appartements Privés",
    description:
      "Your personal quarters — spacious, warm, and richly appointed. A large canopy bed dominates the room, its curtains half-drawn. A velvet chaise longue sits near the fireplace, where embers glow low. The floor is covered in thick rugs. A side table holds wine, fruit, and oil. Your servant kneels at your feet, already attending to you — bare-chested, collar gleaming, hands working devotedly at the task you gave him.",
    descriptionFr:
      "Vos appartements personnels — spacieux, chaleureux et richement meublés. Un grand lit à baldaquin domine la pièce, ses rideaux à demi tirés. Une chaise longue en velours se trouve près de la cheminée, où les braises rougeoient doucement. Le sol est couvert d'épais tapis. Une table d'appoint porte du vin, des fruits et de l'huile. Votre serviteur est agenouillé à vos pieds, déjà en train de vous servir — torse nu, collier brillant, les mains travaillant dévotement à la tâche que vous lui avez confiée.",
    connectedTo: [],
    isDiscovered: true,
    properties: { type: "bedroom", lighting: "firelight", mood: "intimate", privacy: "private" },
  });

  const etienneId = await ctx.db.insert("npcs", {
    campaignId,
    name: "Élise",
    pronouns: "she/her",
    description:
      "A beautiful young woman with olive skin, long dark hair cascading over bare shoulders, and deep brown eyes that stay lowered unless given permission to look up. She wears only a sheer silk slip and a polished leather collar with your initials engraved on the clasp. Her body is graceful and well-kept — she takes pride in presenting herself for you. She is currently kneeling, massaging your feet with warm oil, occasionally pressing her lips to your ankle.",
    descriptionFr:
      "Une belle jeune femme à la peau olivâtre, aux longs cheveux sombres cascadant sur ses épaules nues, et aux yeux bruns profonds qui restent baissés sauf permission de regarder. Elle ne porte qu'une combinaison de soie transparente et un collier de cuir poli gravé de vos initiales sur le fermoir. Son corps est gracieux et soigné — elle est fière de se présenter pour vous. Elle est actuellement agenouillée, massant vos pieds avec de l'huile chaude, pressant occasionnellement ses lèvres contre votre cheville.",
    personality:
      "Utterly devoted and already deep in service headspace. Élise lives to anticipate your needs. She speaks softly, moves gracefully, and radiates quiet adoration. She has been yours for months and knows your preferences intimately — where you like to be touched, how firm, when to be silent and when to whisper praise. She is happiest when serving and craves your approval.",
    level: 4, hp: 26, maxHp: 26, ac: 11,
    abilities: { strength: 10, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 13, charisma: 17 },
    isAlive: true, conditions: [], memories: [
      "Has served you faithfully for several months",
      "Knows your preferred foot massage pressure and technique",
      "Was recently praised for her devotion — still glowing from it",
      "Loves when you run your fingers through her hair",
    ], autoCreated: false, firstMetAt: now - 86400000 * 90, currentLocationId: locationId,
    intimacyProfile: {
      orientation: "submissive",
      roleIdentity: { power: 10, action: 20, sensation: 75, service: 95, flexibility: 25 },
      kinks: {
        service: 3, "foot worship": 3, "body worship": 3, collaring: 3, massage: 3,
        pampering: 3, "power exchange": 3, praise: 3, "sensation play": 2, aftercare: 3,
      },
      aftercareNeed: 80, trustThreshold: 20,
    },
  });

  // Established relationship — high trust, deep bond
  await ctx.db.insert("relationships", {
    campaignId, characterId, npcId: etienneId,
    affinity: 75, trust: 85, attraction: 70, tension: 40, intimacy: 65,
    history: [
      "Étienne entered your service three months ago",
      "He earned his collar after proving his devotion",
      "You established a daily service ritual together",
      "He worships your feet every evening without needing to be asked",
    ],
    flags: { collared: true, established_dynamic: true },
    dynamic: {
      type: "ongoing",
      protocolLevel: 3,
      roles: { character: "dominant", npc: "submissive" },
    },
  });

  // Items — things a master/mistress would have at hand
  const items = resolveItems([
    "ring_blue_03",   // Ring of Binding
    "neck_blue_02",   // Collar of Devotion
    "boots_green_03", // Heels of Confidence
    "main_white_06",  // Riding Crop
    "off_green_02",   // Restraint Kit
    "book_green_01",  // Tome of Sensual Arts
  ]);
  await ctx.db.patch(characterId, {
    inventory: [...character.inventory, ...items] as typeof character.inventory,
  });

  const sessionId = await ctx.db.insert("gameSessions", {
    campaignId, status: "active", mode: "exploration", locationId, startedAt: now, lastActionAt: now,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "system",
    contentEn: "You are in your private chambers. Étienne is already serving you.",
    contentFr: "Vous êtes dans vos appartements privés. Étienne est déjà en train de vous servir.",
    createdAt: now,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "narration", actorType: "dm",
    contentEn: "The fire crackles softly as Étienne kneels before you, warm oil glistening on his hands. He works your feet with practiced devotion — thumbs pressing into the arch, fingers tracing each toe, lips brushing your ankle between strokes. His collar catches the firelight. He has not spoken — he knows you prefer silence during this ritual, unless you invite him to speak. The wine on the side table is already poured. The evening is yours to command.",
    contentFr: "Le feu crépite doucement tandis qu'Étienne s'agenouille devant vous, l'huile chaude brillant sur ses mains. Il masse vos pieds avec une dévotion exercée — les pouces pressant la voûte plantaire, les doigts traçant chaque orteil, les lèvres effleurant votre cheville entre les caresses. Son collier capte la lueur du feu. Il n'a pas parlé — il sait que vous préférez le silence pendant ce rituel, à moins que vous ne l'invitiez à parler. Le vin sur la table d'appoint est déjà versé. La soirée est vôtre à commander.",
    createdAt: now + 1,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "narration", actorType: "dm",
    contentEn: "Étienne glances up briefly — a flicker of adoration in his dark eyes — then lowers his gaze again, pressing a slow kiss to the top of your foot before continuing his work.",
    contentFr: "Étienne lève brièvement les yeux — une lueur d'adoration dans ses yeux sombres — puis baisse de nouveau le regard, déposant un lent baiser sur le dessus de votre pied avant de reprendre son travail.",
    createdAt: now + 2,
  });

  await ctx.db.insert("gameLog", {
    campaignId, sessionId, type: "system",
    contentEn: "Quick actions: [Run your fingers through his hair] [Tell him to speak] [Guide his mouth higher] [Take the wine] [Give him a new order] [Praise his work] [Use the riding crop]",
    contentFr: "Actions rapides : [Passer vos doigts dans ses cheveux] [Lui dire de parler] [Guider sa bouche plus haut] [Prendre le vin] [Lui donner un nouvel ordre] [Louer son travail] [Utiliser la cravache]",
    createdAt: now + 3,
  });

  return { locationId, sessionId };
}

// ─── Main mutation ─────────────────────────────────────────────

export const seedTestScenario = mutation({
  args: {
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    scenario: v.optional(v.union(
      v.literal("bdsm-dungeon"),
      v.literal("foot-fetish-spa"),
      v.literal("servant-serving"),
    )),
  },
  handler: async (ctx, args) => {
    const { campaignId, characterId } = args;
    const scenario = args.scenario ?? "bdsm-dungeon";

    const character = await ctx.db.get(characterId);
    if (!character) throw new Error("Character not found");

    // Clean up existing seeded data for re-playability
    await cleanCampaignSeedData(ctx, campaignId, characterId);

    // Re-read character after cleanup (inventory was reset)
    const freshCharacter = await ctx.db.get(characterId);
    if (!freshCharacter) throw new Error("Character not found after cleanup");

    switch (scenario) {
      case "bdsm-dungeon":
        return await seedBdsmDungeon(ctx, campaignId, characterId, freshCharacter);
      case "foot-fetish-spa":
        return await seedFootFetishSpa(ctx, campaignId, characterId, freshCharacter);
      case "servant-serving":
        return await seedServantServing(ctx, campaignId, characterId, freshCharacter);
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  },
});
