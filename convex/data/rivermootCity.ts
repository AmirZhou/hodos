// Rivermoot — a fantasy city at the confluence of two rivers, divided into quadrants.
// Inspired by Calgary's NW/NE/SW/SE quadrant system.
// Used by seedMap.ts to create the default shared map.

export interface RivermootLocation {
  templateId: string;
  name: string;
  description: string;
  properties: Record<string, any>;
  /** templateIds of connected locations (resolved to real IDs during seeding) */
  connections: string[];
  /** templateId of parent location, if any */
  parentTemplateId?: string;
}

// ─── Centre ────────────────────────────────────────────────────

const crossroads: RivermootLocation = {
  templateId: "rivermoot-crossroads",
  name: "The Crossroads",
  description:
    "The beating heart of Rivermoot, where the four great bridges converge at a raised stone plaza above the river junction. Merchant carts rumble across cobblestones, street performers juggle flame, and the city watch keeps a wary eye from the central watchtower. Four arched gateways mark the entrances to each quadrant.",
  properties: { district: "centre", type: "plaza", lighting: "bright" },
  connections: [
    "rivermoot-temple-square",
    "rivermoot-grand-bazaar",
    "rivermoot-arcane-quadrangle",
    "rivermoot-dockside-gate",
  ],
};

// ─── NW — Noble & Temple Quarter ───────────────────────────────

const templeSquare: RivermootLocation = {
  templateId: "rivermoot-temple-square",
  name: "Temple Square",
  description:
    "A broad flagstone plaza ringed by shrines to a dozen gods. Incense smoke drifts between marble columns, and soft chanting echoes off the surrounding buildings. Pilgrims kneel at offering bowls while acolytes sweep petals from the steps.",
  properties: { district: "nw", type: "plaza", lighting: "bright" },
  connections: [
    "rivermoot-crossroads",
    "rivermoot-cathedral-of-the-dawn",
    "rivermoot-noble-quarter",
  ],
};

const cathedralOfTheDawn: RivermootLocation = {
  templateId: "rivermoot-cathedral-of-the-dawn",
  name: "Cathedral of the Dawn",
  description:
    "A soaring edifice of white stone and stained glass that catches the first light each morning. The interior is vast — vaulted ceilings painted with celestial murals, rows of carved pews, and a golden altar where the High Priestess leads the dawn rites. Healing is offered freely to those in need.",
  properties: { district: "nw", type: "temple", lighting: "bright" },
  connections: ["rivermoot-temple-square", "rivermoot-silver-gardens"],
};

const nobleQuarter: RivermootLocation = {
  templateId: "rivermoot-noble-quarter",
  name: "Noble Quarter",
  description:
    "Tree-lined avenues of elegant townhouses with wrought-iron balconies and manicured gardens. Livered servants hurry between estates, and the clatter of carriage wheels on flagstone is constant. The air smells of jasmine and old money.",
  properties: { district: "nw", type: "residential", lighting: "bright" },
  connections: ["rivermoot-temple-square", "rivermoot-silver-gardens"],
};

const silverGardens: RivermootLocation = {
  templateId: "rivermoot-silver-gardens",
  name: "Silver Gardens",
  description:
    "A walled garden of silver-leafed trees and luminescent flowers that glow faintly at dusk. Winding paths lead past reflecting pools and ivy-covered pavilions. Nobles meet here for private conversations, and it is said the garden was planted by fey hands long ago.",
  properties: { district: "nw", type: "garden", lighting: "dim" },
  connections: [
    "rivermoot-cathedral-of-the-dawn",
    "rivermoot-noble-quarter",
  ],
};

// ─── NE — Market & Guild Quarter ───────────────────────────────

const grandBazaar: RivermootLocation = {
  templateId: "rivermoot-grand-bazaar",
  name: "Grand Bazaar",
  description:
    "A sprawling covered market of canvas awnings and timber stalls stretching across several city blocks. The noise is deafening — haggling merchants, clucking livestock, hammering smiths. You can buy anything here, from mundane turnips to suspiciously glowing potions.",
  properties: { district: "ne", type: "market", lighting: "bright" },
  connections: [
    "rivermoot-crossroads",
    "rivermoot-artisans-guild-hall",
    "rivermoot-spice-quarter",
  ],
};

const artisansGuildHall: RivermootLocation = {
  templateId: "rivermoot-artisans-guild-hall",
  name: "Artisans' Guild Hall",
  description:
    "A sturdy stone building adorned with carved tools and trade symbols above every window. Inside, master craftspeople train apprentices in woodwork, metalsmithing, leathercraft, and a dozen other trades. The guild's reputation ensures fair prices and quality work across the city.",
  properties: { district: "ne", type: "guild", lighting: "normal" },
  connections: ["rivermoot-grand-bazaar", "rivermoot-red-ring"],
};

const redRing: RivermootLocation = {
  templateId: "rivermoot-red-ring",
  name: "The Red Ring",
  description:
    "An open-air arena of red sandstone tiers surrounding a sandy fighting pit. Crowds roar as gladiators, monsters, and brave adventurers clash for coin and glory. Betting stalls line the outer ring, and a tunnel beneath the stands leads to the combatant holding cells.",
  properties: { district: "ne", type: "arena", lighting: "bright" },
  connections: ["rivermoot-artisans-guild-hall", "rivermoot-spice-quarter"],
  // The arena has a tactical grid
};

const spiceQuarter: RivermootLocation = {
  templateId: "rivermoot-spice-quarter",
  name: "Spice Quarter",
  description:
    "Narrow, winding streets heavy with the aroma of cinnamon, saffron, and cardamom. Foreign merchants display exotic wares — silks, spices, carved idols, and strange instruments. Tea houses and hookah lounges nestle between the stalls, and every alley promises a new discovery.",
  properties: { district: "ne", type: "market", lighting: "normal" },
  connections: ["rivermoot-grand-bazaar", "rivermoot-red-ring"],
};

// ─── SW — Arcane & Academic Quarter ────────────────────────────

const arcaneQuadrangle: RivermootLocation = {
  templateId: "rivermoot-arcane-quadrangle",
  name: "Arcane Quadrangle",
  description:
    "A cobbled courtyard surrounded by tall, ivy-covered towers connected by covered walkways. Magelight lanterns float at every corner, and the air crackles faintly with residual enchantment. Robed scholars debate in clusters while familiars — cats, ravens, tiny elementals — wander freely.",
  properties: { district: "sw", type: "academic", lighting: "magelight" },
  connections: [
    "rivermoot-crossroads",
    "rivermoot-athenaeum",
    "rivermoot-alchemy-lane",
  ],
};

const athenaeum: RivermootLocation = {
  templateId: "rivermoot-athenaeum",
  name: "The Athenaeum",
  description:
    "Rivermoot's great library — a labyrinth of towering bookshelves, spiraling staircases, and reading alcoves lit by enchanted candles that never drip wax. The collection spans mundane history to forbidden arcana. The head librarian, an ancient elf, remembers every book by scent.",
  properties: { district: "sw", type: "library", lighting: "candlelight" },
  connections: ["rivermoot-arcane-quadrangle", "rivermoot-star-tower"],
};

const alchemyLane: RivermootLocation = {
  templateId: "rivermoot-alchemy-lane",
  name: "Alchemy Lane",
  description:
    "A crooked street of apothecaries and alchemist workshops. Colored smoke puffs from chimneys in unlikely hues. Glass jars of pickled creatures line windowsills, and the gutter runs with strange iridescent runoff. Explosions are common but rarely fatal.",
  properties: { district: "sw", type: "commercial", lighting: "normal" },
  connections: ["rivermoot-arcane-quadrangle", "rivermoot-star-tower"],
};

const starTower: RivermootLocation = {
  templateId: "rivermoot-star-tower",
  name: "Star Tower",
  description:
    "The tallest structure in Rivermoot — a slender obsidian spire that pierces the clouds. Its peak houses an astrolabe of immense power used to chart planar alignments. Only the Archmage may ascend to the observatory, but the tower's base offers a public hall where divination services are sold.",
  properties: { district: "sw", type: "tower", lighting: "dim" },
  connections: ["rivermoot-athenaeum", "rivermoot-alchemy-lane"],
};

// ─── SE — Docks & Shadow Quarter ───────────────────────────────

const docksideGate: RivermootLocation = {
  templateId: "rivermoot-dockside-gate",
  name: "Dockside Gate",
  description:
    "A heavy iron portcullis marks the transition from the respectable city into the docklands. Beyond it, salt air and the creak of ship timbers replace the city's usual sounds. Longshoremen haul crates while customs officers argue with merchants over tariffs.",
  properties: { district: "se", type: "gate", lighting: "normal" },
  connections: [
    "rivermoot-crossroads",
    "rivermoot-warehouse-row",
    "rivermoot-night-market",
  ],
};

const warehouseRow: RivermootLocation = {
  templateId: "rivermoot-warehouse-row",
  name: "Warehouse Row",
  description:
    "A long line of cavernous stone warehouses backing onto the river wharves. Legitimate trade goods are stored here — but everyone knows certain warehouses have false walls and hidden basements. Rats are plentiful, and so are the people who prey on the unwary after dark.",
  properties: { district: "se", type: "warehouse", lighting: "dim" },
  connections: ["rivermoot-dockside-gate", "rivermoot-the-depths"],
};

const theDepths: RivermootLocation = {
  templateId: "rivermoot-the-depths",
  name: "The Depths",
  description:
    "A network of tunnels, cellars, and forgotten cisterns beneath the docklands. The air is damp and stale. Smugglers, thieves' guilds, and stranger things make their home here. Flickering torchlight reveals carved symbols of an older city that existed before Rivermoot was built above it.",
  properties: { district: "se", type: "underground", lighting: "dark" },
  connections: ["rivermoot-warehouse-row", "rivermoot-night-market"],
};

const nightMarket: RivermootLocation = {
  templateId: "rivermoot-night-market",
  name: "Night Market",
  description:
    "A market that appears only after sunset — lanterns strung between buildings, stalls draped in dark silk. Here you can buy poisons, forged documents, stolen goods, and information. The vendors wear masks, the prices are negotiable, and questions about sourcing are discouraged.",
  properties: { district: "se", type: "market", lighting: "lantern" },
  connections: ["rivermoot-dockside-gate", "rivermoot-the-depths"],
};

// ─── Exports ───────────────────────────────────────────────────

export const RIVERMOOT_MAP = {
  slug: "rivermoot-city",
  name: "Rivermoot",
  description:
    "A fantasy city built at the confluence of two rivers, divided into four quadrants. The noble temples of the northwest face the bustling markets of the northeast, while the arcane towers of the southwest overlook the shadowy docks to the southeast. At the centre, The Crossroads connects them all.",
  properties: {
    type: "city",
    rivers: ["Silverrun", "Ironflow"],
    population: "~50,000",
    government: "City Council of Four Quartermasters",
  },
};

export const RIVERMOOT_LOCATIONS: RivermootLocation[] = [
  // Centre
  crossroads,
  // NW — Noble & Temple
  templeSquare,
  cathedralOfTheDawn,
  nobleQuarter,
  silverGardens,
  // NE — Market & Guild
  grandBazaar,
  artisansGuildHall,
  redRing,
  spiceQuarter,
  // SW — Arcane & Academic
  arcaneQuadrangle,
  athenaeum,
  alchemyLane,
  starTower,
  // SE — Docks & Shadow
  docksideGate,
  warehouseRow,
  theDepths,
  nightMarket,
];

/** The starting location for new campaigns */
export const RIVERMOOT_START_LOCATION = "rivermoot-crossroads";
