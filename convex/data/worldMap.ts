// World-level map data — the top-level graph that contains cities as nodes.
// Rivermoot is the starting city; additional cities are seeded as hidden or undiscovered.

export interface WorldMapNode {
  slug: string;
  name: string;
  description: string;
  properties: Record<string, any>;
  visibility: "visible" | "hidden";
  /** Slugs of connected city maps */
  connections: string[];
}

// ─── World Map ─────────────────────────────────────────────────

export const WORLD_MAP = {
  slug: "hodos-world",
  name: "The Convergence",
  description:
    "A vast region of river valleys, ancient forests, and scattered settlements. Trade routes thread between the major cities, and the wilderness between them hides dangers both mundane and magical.",
  properties: {
    type: "world",
    era: "Third Age of the Convergence",
  },
};

// ─── City Nodes ────────────────────────────────────────────────

const rivermoot: WorldMapNode = {
  slug: "rivermoot-city",
  name: "Rivermoot",
  description:
    "A fantasy city built at the confluence of two rivers, divided into four quadrants. The noble temples of the northwest face the bustling markets of the northeast, while the arcane towers of the southwest overlook the shadowy docks to the southeast.",
  properties: {
    type: "city",
    population: "~50,000",
    government: "City Council of Four Quartermasters",
  },
  visibility: "visible",
  connections: ["thornwatch-outpost", "velvet-sanctum"],
};

const thornwatchOutpost: WorldMapNode = {
  slug: "thornwatch-outpost",
  name: "Thornwatch Outpost",
  description:
    "A fortified ranger station at the edge of the Briarveil Forest. The Thornwatch patrol the wilderness, keeping the trade roads safe from beasts and bandits. A modest settlement has grown around the outpost, serving travelers and adventurers.",
  properties: {
    type: "outpost",
    population: "~2,000",
    government: "Ranger Captain",
  },
  visibility: "visible",
  connections: ["rivermoot-city"],
};

const velvetSanctum: WorldMapNode = {
  slug: "velvet-sanctum",
  name: "The Velvet Sanctum",
  description:
    "A secret academy hidden in the hills south of Rivermoot. Behind its enchanted walls, students study forbidden arts — both arcane and carnal. Only those who receive an invitation may find the entrance, and its location shifts with the phases of the moon.",
  properties: {
    type: "academy",
    population: "~300",
    government: "The Velvet Council",
    secret: true,
  },
  visibility: "hidden",
  connections: ["rivermoot-city"],
};

// ─── Exports ───────────────────────────────────────────────────

export const WORLD_MAP_NODES: WorldMapNode[] = [
  rivermoot,
  thornwatchOutpost,
  velvetSanctum,
];

/** The slug of the city that starts discovered */
export const WORLD_START_CITY = "rivermoot-city";
