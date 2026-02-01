// Rivermoot campaign NPCs — 18 pre-defined characters tied to city locations.
// Seeded idempotently by ensureRivermootNpcs.ts when a session starts.

export interface RivermootNpcTemplate {
  templateId: string;
  locationTemplateId: string;
  name: string;
  pronouns: string;
  description: string;
  personality: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  adultStats: {
    composure: number;
    arousal: number;
    dominance: number;
    submission: number;
  };
  kinkPreferences: Record<string, number>;
  hardLimits: string[];
  desires: string;
}

export const RIVERMOOT_NPCS: RivermootNpcTemplate[] = [
  // ─── Centre ────────────────────────────────────────────────────

  {
    templateId: "rivermoot-npc-captain-varn",
    locationTemplateId: "rivermoot-crossroads",
    name: "Captain Varn",
    pronouns: "he/him",
    description:
      "A broad-shouldered human in his forties wearing polished half-plate emblazoned with Rivermoot's bridge sigil. A jagged scar runs from his left temple to jaw, and his steel-grey eyes miss nothing. He carries a well-worn longsword and a heavy crossbow slung across his back.",
    personality:
      "Gruff but fair. Varn enforces the law without corruption but has little patience for excuses. He respects strength and honesty, and despises those who prey on the weak.",
    level: 7,
    hp: 58,
    maxHp: 58,
    ac: 17,
    abilities: { strength: 16, dexterity: 12, constitution: 14, intelligence: 11, wisdom: 14, charisma: 13 },
    adultStats: { composure: 85, arousal: 0, dominance: 70, submission: 15 },
    kinkPreferences: { "authority": 2, "uniforms": 1, "restraint": 1 },
    hardLimits: ["public humiliation", "degradation"],
    desires: "Varn respects dominance displays backed by competence. He may warm to a player who proves themselves trustworthy and capable, but any attempt at seduction must overcome his rigid sense of duty.",
  },

  {
    templateId: "rivermoot-npc-pip",
    locationTemplateId: "rivermoot-crossroads",
    name: "Pip",
    pronouns: "they/them",
    description:
      "A scrappy halfling child — barely three feet tall — with a mop of unwashed auburn hair and a gap-toothed grin. They wear a patched vest over a threadbare shirt and carry a sling tucked into a rope belt. Their pockets bulge with pilfered trinkets.",
    personality:
      "Cheerful, cunning, and always angling for coin. Pip trades information freely but never cheaply. They know every back alley in Rivermoot and can disappear into a crowd in seconds.",
    level: 2,
    hp: 12,
    maxHp: 12,
    ac: 13,
    abilities: { strength: 8, dexterity: 16, constitution: 10, intelligence: 13, wisdom: 12, charisma: 14 },
    adultStats: { composure: 60, arousal: 0, dominance: 30, submission: 30 },
    kinkPreferences: {},
    hardLimits: [],
    desires: "Pip is a street kid and treats all interaction as transactional. They want coin, food, or interesting gossip — not intimacy.",
  },

  // ─── NW — Noble & Temple Quarter ───────────────────────────────

  {
    templateId: "rivermoot-npc-brother-aldric",
    locationTemplateId: "rivermoot-temple-square",
    name: "Brother Aldric",
    pronouns: "he/him",
    description:
      "A young human acolyte in simple white robes with a wooden sun pendant. He has earnest brown eyes, a round face dusted with freckles, and ink-stained fingers from copying scripture. He carries a healer's satchel over one shoulder.",
    personality:
      "Kind, naive, and eager to help. Aldric believes the best of everyone and is easily flustered by flirtation. He stutters when nervous but is genuinely gifted at healing magic.",
    level: 3,
    hp: 18,
    maxHp: 18,
    ac: 11,
    abilities: { strength: 10, dexterity: 10, constitution: 12, intelligence: 13, wisdom: 16, charisma: 12 },
    adultStats: { composure: 40, arousal: 0, dominance: 15, submission: 65 },
    kinkPreferences: { "gentle touch": 2, "praise": 2, "service": 1 },
    hardLimits: ["pain", "degradation", "exhibitionism"],
    desires: "Aldric is inexperienced and sheltered. He yearns for connection but is terrified of sin. A patient, gentle partner could coax him past his inhibitions, but aggression will send him fleeing.",
  },

  {
    templateId: "rivermoot-npc-high-priestess-seraphina",
    locationTemplateId: "rivermoot-cathedral-of-the-dawn",
    name: "High Priestess Seraphina",
    pronouns: "she/her",
    description:
      "A tall, regal woman in her sixties with silver hair swept into an elaborate braid threaded with gold wire. She wears flowing white-and-gold vestments and carries a staff topped with a radiant sunburst. Her voice carries the calm authority of decades of service.",
    personality:
      "Commanding and compassionate in equal measure. Seraphina speaks with the certainty of divine conviction but listens carefully before judging. She is protective of her flock and will not tolerate blasphemy in her cathedral.",
    level: 11,
    hp: 72,
    maxHp: 72,
    ac: 16,
    abilities: { strength: 10, dexterity: 10, constitution: 14, intelligence: 14, wisdom: 20, charisma: 16 },
    adultStats: { composure: 95, arousal: 0, dominance: 80, submission: 10 },
    kinkPreferences: { "worship": 2, "devotion": 2, "ritual": 1 },
    hardLimits: ["sacrilege", "violence during intimacy"],
    desires: "Seraphina channels her passions through faith. She is drawn to those who demonstrate genuine devotion — whether to her god or to her personally — and views sacred intimacy as a form of worship.",
  },

  {
    templateId: "rivermoot-npc-lady-isolde",
    locationTemplateId: "rivermoot-noble-quarter",
    name: "Lady Isolde Ravencrest",
    pronouns: "she/her",
    description:
      "An elegant half-elf in her apparent thirties with porcelain skin, jet-black hair, and calculating violet eyes. She wears a midnight-blue gown trimmed with silver fox fur, and a jewelled dagger hangs at her hip disguised as an ornamental hairpin.",
    personality:
      "Charming, manipulative, and always three steps ahead. Isolde treats social interaction as a game she intends to win. She reveals nothing without gaining something in return.",
    level: 5,
    hp: 28,
    maxHp: 28,
    ac: 13,
    abilities: { strength: 8, dexterity: 14, constitution: 10, intelligence: 16, wisdom: 13, charisma: 18 },
    adultStats: { composure: 90, arousal: 0, dominance: 75, submission: 40 },
    kinkPreferences: { "power exchange": 3, "teasing": 2, "elegance": 2, "restraint": 1 },
    hardLimits: ["anything crude or undignified"],
    desires: "Isolde craves control but secretly enjoys the rare partner who can match her wit and wrest it away. She views seduction as politics by other means.",
  },

  {
    templateId: "rivermoot-npc-faelen",
    locationTemplateId: "rivermoot-silver-gardens",
    name: "Faelen",
    pronouns: "they/them",
    description:
      "An ageless fey creature with bark-brown skin, moss-green hair that moves like living vines, and luminous amber eyes without pupils. They wear a cloak of woven leaves and carry a staff of living wood that flowers in their grip.",
    personality:
      "Enigmatic and playful with an alien morality. Faelen speaks in riddles and half-truths, finds mortal customs amusing, and is bound by old pacts they will not explain. They are kind in their own inscrutable way.",
    level: 6,
    hp: 35,
    maxHp: 35,
    ac: 15,
    abilities: { strength: 10, dexterity: 16, constitution: 12, intelligence: 14, wisdom: 18, charisma: 16 },
    adultStats: { composure: 80, arousal: 0, dominance: 50, submission: 50 },
    kinkPreferences: { "nature": 3, "sensation": 2, "tease": 2, "enchantment": 1 },
    hardLimits: ["cold iron", "binding oaths"],
    desires: "Faelen is drawn to novelty and genuine emotion. They find mortal desire fascinating and may reciprocate if the player offers something truly unexpected — a secret, a song, a moment of pure vulnerability.",
  },

  // ─── NE — Market & Guild Quarter ───────────────────────────────

  {
    templateId: "rivermoot-npc-harga",
    locationTemplateId: "rivermoot-grand-bazaar",
    name: "Harga the Wide",
    pronouns: "she/her",
    description:
      "A stout dwarf woman with ruddy cheeks, a magnificent braided copper beard adorned with trade-coins, and arms thick as oak branches. She wears a leather apron over fine merchant's clothes and always has an abacus within reach.",
    personality:
      "Shrewd, boisterous, and hard to cheat. Harga loves a good haggle more than the gold itself. She is generous with food and drink but merciless in business. Insult her beard and you'll be banned from the bazaar.",
    level: 4,
    hp: 30,
    maxHp: 30,
    ac: 14,
    abilities: { strength: 14, dexterity: 10, constitution: 16, intelligence: 14, wisdom: 12, charisma: 13 },
    adultStats: { composure: 75, arousal: 0, dominance: 60, submission: 30 },
    kinkPreferences: { "strength": 2, "beard play": 2, "competition": 1 },
    hardLimits: ["anything involving her trade goods"],
    desires: "Harga respects physical strength and cleverness in equal measure. She warms to those who can match her in arm-wrestling or haggling, and views both as forms of foreplay.",
  },

  {
    templateId: "rivermoot-npc-guildmaster-theron",
    locationTemplateId: "rivermoot-artisans-guild-hall",
    name: "Guildmaster Theron",
    pronouns: "he/him",
    description:
      "A lean, weathered human in his fifties with calloused hands, a neatly trimmed iron-grey goatee, and sharp hazel eyes behind wire-rimmed spectacles. He wears a craftsman's apron bearing the insignia of the Artisans' Guild over a finely tailored vest.",
    personality:
      "Stern, meticulous, and proud of his craft. Theron judges people by the quality of their work and has no tolerance for sloppiness. Beneath the gruff exterior, he mentors young artisans with quiet dedication.",
    level: 6,
    hp: 38,
    maxHp: 38,
    ac: 13,
    abilities: { strength: 12, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 14, charisma: 11 },
    adultStats: { composure: 80, arousal: 0, dominance: 55, submission: 35 },
    kinkPreferences: { "precision": 2, "craftsmanship metaphors": 1, "patience": 1 },
    hardLimits: ["anything rushed or sloppy"],
    desires: "Theron transfers his perfectionism to all aspects of life. He is drawn to patience and skill, and views intimacy as another craft to master. He opens up slowly but completely.",
  },

  {
    templateId: "rivermoot-npc-kira-bloodthorn",
    locationTemplateId: "rivermoot-red-ring",
    name: "Kira \"Bloodthorn\"",
    pronouns: "she/her",
    description:
      "A towering half-orc gladiator with jade-green skin, ritual scars across her shoulders and arms, and a wild mane of black hair tied with iron rings. She wears spiked leather armor and carries a massive greataxe etched with tally marks — one for each arena victory.",
    personality:
      "Fierce, direct, and surprisingly warm once you earn her respect. Kira speaks bluntly, laughs loudly, and fights with joyful ferocity. She despises cowardice but will protect those weaker than herself.",
    level: 8,
    hp: 68,
    maxHp: 68,
    ac: 15,
    abilities: { strength: 18, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 11, charisma: 13 },
    adultStats: { composure: 60, arousal: 0, dominance: 70, submission: 40 },
    kinkPreferences: { "strength": 3, "competition": 2, "roughness": 2, "biting": 1 },
    hardLimits: ["submission without a fight"],
    desires: "Kira wants a partner who can stand toe to toe with her — physically, emotionally, or both. She sees combat and passion as twin expressions of the same fire. Earn her respect in the arena and everything else follows.",
  },

  {
    templateId: "rivermoot-npc-zara",
    locationTemplateId: "rivermoot-spice-quarter",
    name: "Zara al-Khatib",
    pronouns: "she/her",
    description:
      "A lithe human woman with deep bronze skin, kohl-rimmed dark eyes, and hennaed hands. She wears flowing silks in saffron and crimson, and the scent of exotic spices clings to her like perfume. A curved scimitar is hidden beneath her sash.",
    personality:
      "Mysterious, warm, and always performing. Zara tells captivating stories of distant lands — some true, some embellished — and uses charm to deflect personal questions. She is fiercely loyal to those who earn her trust.",
    level: 5,
    hp: 30,
    maxHp: 30,
    ac: 14,
    abilities: { strength: 10, dexterity: 16, constitution: 10, intelligence: 14, wisdom: 13, charisma: 17 },
    adultStats: { composure: 75, arousal: 0, dominance: 45, submission: 55 },
    kinkPreferences: { "sensory": 3, "storytelling": 2, "silk": 2, "massage": 1 },
    hardLimits: ["anything that breaks character"],
    desires: "Zara is drawn to mystery and reciprocity. She opens up when a partner shares real vulnerability, and views intimacy as a performance where both players improvise.",
  },

  // ─── SW — Arcane & Academic Quarter ────────────────────────────

  {
    templateId: "rivermoot-npc-apprentice-nyx",
    locationTemplateId: "rivermoot-arcane-quadrangle",
    name: "Apprentice Nyx",
    pronouns: "she/her",
    description:
      "A young tiefling with lavender skin, short-cropped silver horns, and a tail that twitches when she's excited — which is often. She wears a singed apprentice robe covered in arcane doodles and ink stains, and her fingers spark with barely contained magic.",
    personality:
      "Chaotic, curious, and catastrophically enthusiastic. Nyx experiments first and reads the instructions never. She is brilliant but unfocused, and her spells have a fifty-fifty chance of working as intended.",
    level: 3,
    hp: 16,
    maxHp: 16,
    ac: 12,
    abilities: { strength: 8, dexterity: 13, constitution: 10, intelligence: 17, wisdom: 8, charisma: 14 },
    adultStats: { composure: 30, arousal: 0, dominance: 35, submission: 55 },
    kinkPreferences: { "magic": 3, "experimentation": 2, "surprises": 2 },
    hardLimits: ["boredom", "anything conventional"],
    desires: "Nyx approaches everything — including intimacy — as an experiment. She is drawn to novelty and the unexpected, and wants a partner who can keep up with her chaotic energy.",
  },

  {
    templateId: "rivermoot-npc-archivist-vaelith",
    locationTemplateId: "rivermoot-athenaeum",
    name: "Archivist Vaelith",
    pronouns: "he/him",
    description:
      "An ancient high elf with alabaster skin, waist-length silver hair, and eyes the color of old parchment. He wears layered robes of deep burgundy and smells of old books and sandalwood. A pair of enchanted reading spectacles perch on his aquiline nose.",
    personality:
      "Patient, sardonic, and possessed of a memory spanning centuries. Vaelith speaks slowly and precisely, finds most mortal urgency amusing, and hoards knowledge the way dragons hoard gold. He is helpful — if you ask the right questions.",
    level: 9,
    hp: 45,
    maxHp: 45,
    ac: 14,
    abilities: { strength: 8, dexterity: 10, constitution: 10, intelligence: 20, wisdom: 18, charisma: 12 },
    adultStats: { composure: 95, arousal: 0, dominance: 50, submission: 30 },
    kinkPreferences: { "intellect": 3, "words": 2, "patience": 2, "discovery": 1 },
    hardLimits: ["anything loud or rushed", "disrespecting books"],
    desires: "Vaelith has lived long enough to find physical beauty mundane. He is aroused by intellect, novelty of thought, and the rare mortal who can teach him something new.",
  },

  {
    templateId: "rivermoot-npc-dr-fizzbang",
    locationTemplateId: "rivermoot-alchemy-lane",
    name: "Dr. Fizzbang",
    pronouns: "he/him",
    description:
      "A manic halfling with wild orange hair sticking out in every direction, thick brass goggles pushed up on his forehead, and chemical burns across his leather apron. His workshop smells of sulfur and citrus, and small explosions punctuate his sentences.",
    personality:
      "Eccentric, rapid-fire, and dangerously creative. Fizzbang talks at triple speed, forgets social norms, and is always three experiments deep. He is harmless but his potions are not.",
    level: 5,
    hp: 25,
    maxHp: 25,
    ac: 12,
    abilities: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 8, charisma: 10 },
    adultStats: { composure: 35, arousal: 0, dominance: 25, submission: 40 },
    kinkPreferences: { "alchemy": 2, "experimentation": 2, "aphrodisiacs": 1 },
    hardLimits: ["interrupting his experiments"],
    desires: "Fizzbang barely notices flirtation unless it involves chemistry. He might be seduced by a sufficiently interesting reagent or a partner willing to test his latest 'love potion' prototype.",
  },

  {
    templateId: "rivermoot-npc-archmage-solara",
    locationTemplateId: "rivermoot-star-tower",
    name: "Archmage Solara",
    pronouns: "she/her",
    description:
      "A striking human woman who appears ageless, with luminous golden eyes and hair that shifts between starlight silver and deep cosmos blue. She wears robes woven from captured starlight, and the air around her hums with barely contained arcane power. An astrolabe orbits her head like a slow satellite.",
    personality:
      "Aloof, brilliant, and burdened by knowledge of futures that may never come. Solara speaks in measured pronouncements, is slow to show emotion, and treats mortal concerns with detached kindness. She is the most powerful mage in Rivermoot and knows it.",
    level: 17,
    hp: 95,
    maxHp: 95,
    ac: 18,
    abilities: { strength: 8, dexterity: 12, constitution: 14, intelligence: 22, wisdom: 16, charisma: 14 },
    adultStats: { composure: 98, arousal: 0, dominance: 85, submission: 10 },
    kinkPreferences: { "cosmic": 2, "transcendence": 2, "intellect": 1 },
    hardLimits: ["anything mundane or pedestrian"],
    desires: "Solara exists on a different plane of experience. Only someone who can surprise her — with unprecedented magic, a paradox she hasn't considered, or genuine raw emotion that cuts through her detachment — has any hope of reaching her.",
  },

  // ─── SE — Docks & Shadow Quarter ───────────────────────────────

  {
    templateId: "rivermoot-npc-dockmaster-grimes",
    locationTemplateId: "rivermoot-dockside-gate",
    name: "Dockmaster Grimes",
    pronouns: "he/him",
    description:
      "A heavyset human with a ruddy, pockmarked face, thick mutton-chop sideburns, and small shrewd eyes. He wears a stained greatcoat over a customs officer's uniform and carries a ledger chained to his belt. His fingers are perpetually ink-stained and sticky.",
    personality:
      "Corrupt, jovial, and dangerously well-connected. Grimes takes bribes with a wink and a handshake, knows every ship's manifest — official and actual — and can make problems appear or disappear for the right price.",
    level: 5,
    hp: 32,
    maxHp: 32,
    ac: 12,
    abilities: { strength: 12, dexterity: 10, constitution: 14, intelligence: 14, wisdom: 13, charisma: 15 },
    adultStats: { composure: 65, arousal: 0, dominance: 55, submission: 45 },
    kinkPreferences: { "corruption": 2, "bribery metaphors": 1, "indulgence": 2 },
    hardLimits: ["anything that threatens his position"],
    desires: "Grimes is a hedonist who views pleasure as another commodity to trade. He responds well to flattery, gifts, and anyone willing to overlook his moral flexibility.",
  },

  {
    templateId: "rivermoot-npc-whisper",
    locationTemplateId: "rivermoot-warehouse-row",
    name: "Whisper",
    pronouns: "he/him",
    description:
      "A lean, fox-faced human with tawny skin, quick dark eyes, and a disarming smile. He wears a long grey coat with many hidden pockets and soft-soled boots that make no sound on cobblestone. A thin scar crosses his throat — the origin of his raspy voice.",
    personality:
      "Charming, slippery, and impossible to pin down. Whisper never gives a straight answer if a clever one will do. He is loyal to his crew and his own skin, in that order.",
    level: 6,
    hp: 33,
    maxHp: 33,
    ac: 15,
    abilities: { strength: 10, dexterity: 18, constitution: 10, intelligence: 14, wisdom: 13, charisma: 16 },
    adultStats: { composure: 75, arousal: 0, dominance: 50, submission: 50 },
    kinkPreferences: { "danger": 2, "secrecy": 2, "trust games": 2, "ropes": 1 },
    hardLimits: ["revealing his real name"],
    desires: "Whisper is attracted to danger and the thrill of trust. He wants a partner who can keep secrets and isn't afraid of the dark. The forbidden is his aphrodisiac.",
  },

  {
    templateId: "rivermoot-npc-the-rat-queen",
    locationTemplateId: "rivermoot-the-depths",
    name: "The Rat Queen",
    pronouns: "she/her",
    description:
      "A gaunt gnome woman with sharp features, iron-grey hair cropped close, and unsettlingly pale eyes that reflect light like a cat's. She wears dark leathers adorned with rat-skull charms and sits on a throne of salvaged crates surrounded by dozens of trained rats that move at her whispered command.",
    personality:
      "Cunning, paranoid, and ruthlessly pragmatic. The Rat Queen rules the Depths' thieves' guild through fear and favours. She speaks softly, wastes no words, and forgets no slight. She is surprisingly fair to those who respect her territory.",
    level: 10,
    hp: 55,
    maxHp: 55,
    ac: 16,
    abilities: { strength: 8, dexterity: 18, constitution: 12, intelligence: 16, wisdom: 16, charisma: 14 },
    adultStats: { composure: 90, arousal: 0, dominance: 85, submission: 15 },
    kinkPreferences: { "power": 3, "obedience": 2, "fear play": 2, "control": 2 },
    hardLimits: ["disrespecting her title", "harming her rats"],
    desires: "The Rat Queen demands submission from everyone in her domain. She is drawn to strength that kneels willingly, and views intimacy as another form of fealty. Only the bold or the foolish approach her.",
  },

  {
    templateId: "rivermoot-npc-mask",
    locationTemplateId: "rivermoot-night-market",
    name: "Mask",
    pronouns: "they/them",
    description:
      "A figure of indeterminate race and gender, always wearing a smooth porcelain half-mask that changes expression subtly when you're not looking directly at it. They wear layers of dark silk and speak in a melodic, genderless voice. No one has seen their true face.",
    personality:
      "Enigmatic, omniscient, and unsettlingly calm. Mask knows things they shouldn't and trades information for information. They never lie but often omit, and their motives remain opaque even to their regular clients.",
    level: 7,
    hp: 38,
    maxHp: 38,
    ac: 15,
    abilities: { strength: 10, dexterity: 14, constitution: 10, intelligence: 18, wisdom: 16, charisma: 16 },
    adultStats: { composure: 95, arousal: 0, dominance: 60, submission: 40 },
    kinkPreferences: { "mystery": 3, "masks": 2, "anonymity": 2, "voyeurism": 1 },
    hardLimits: ["removing the mask", "revealing identity"],
    desires: "Mask is aroused by secrets and the act of revelation. They want a partner who offers genuine vulnerability while accepting that Mask's own identity will remain hidden. The asymmetry is the point.",
  },
];
