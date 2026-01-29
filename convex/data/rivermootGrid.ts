// Rivermoot 16×16 city grid overlay.
// Each cell = 1 city block. Named locations get exactly 1 entrance tile.

type CityTerrain =
  | "road" | "building" | "water" | "wall"
  | "gate" | "plaza" | "garden" | "dock" | "bridge";

interface CityGridCell {
  x: number;
  y: number;
  terrain: CityTerrain;
  walkable: boolean;
  locationTemplateId?: string;
}

function cell(
  x: number,
  y: number,
  terrain: CityTerrain,
  walkable: boolean,
  locationTemplateId?: string,
): CityGridCell {
  const c: CityGridCell = { x, y, terrain, walkable };
  if (locationTemplateId) c.locationTemplateId = locationTemplateId;
  return c;
}

function generateCells(): CityGridCell[] {
  const cells: CityGridCell[] = [];
  // We'll build a 2D lookup, then flatten.
  const grid: (CityGridCell | null)[][] = Array.from({ length: 16 }, () =>
    Array.from({ length: 16 }, () => null),
  );

  const set = (x: number, y: number, terrain: CityTerrain, walkable: boolean, loc?: string) => {
    grid[y][x] = cell(x, y, terrain, walkable, loc);
  };

  // --- Walls (row 0, row 15, col 0, col 15) ---
  for (let i = 0; i < 16; i++) {
    set(i, 0, "wall", false);
    set(i, 15, "wall", false);
    set(0, i, "wall", false);
    set(15, i, "wall", false);
  }

  // --- Gates ---
  set(7, 0, "gate", true);
  set(8, 0, "gate", true);
  set(7, 15, "gate", true);
  set(8, 15, "gate", true);
  set(0, 7, "gate", true);
  set(0, 8, "gate", true);
  set(15, 7, "gate", true);
  set(15, 8, "gate", true);

  // --- Rivers ---
  // Vertical river: cols 7-8, rows 1-6 and 9-14
  for (let y = 1; y <= 6; y++) {
    set(7, y, "water", false);
    set(8, y, "water", false);
  }
  for (let y = 9; y <= 14; y++) {
    set(7, y, "water", false);
    set(8, y, "water", false);
  }
  // Horizontal river: rows 7-8, cols 1-6 and 9-14
  for (let x = 1; x <= 6; x++) {
    set(x, 7, "water", false);
    set(x, 8, "water", false);
  }
  for (let x = 9; x <= 14; x++) {
    set(x, 7, "water", false);
    set(x, 8, "water", false);
  }

  // --- Centre plaza (The Crossroads) ---
  set(7, 7, "plaza", true, "rivermoot-crossroads");
  set(7, 8, "plaza", true);
  set(8, 7, "plaza", true);
  set(8, 8, "plaza", true);

  // --- Bridges ---
  // NW bridge (connects NW quadrant to centre) — cols 5-6, rows 7-8
  set(5, 7, "bridge", true);
  set(5, 8, "bridge", true);
  set(6, 7, "bridge", true);
  set(6, 8, "bridge", true);
  // NE bridge — cols 9-10, rows 7-8
  set(9, 7, "bridge", true);
  set(9, 8, "bridge", true);
  set(10, 7, "bridge", true);
  set(10, 8, "bridge", true);
  // N bridge — cols 7-8, rows 5-6
  set(7, 5, "bridge", true);
  set(7, 6, "bridge", true);
  set(8, 5, "bridge", true);
  set(8, 6, "bridge", true);
  // S bridge — cols 7-8, rows 9-10
  set(7, 9, "bridge", true);
  set(7, 10, "bridge", true);
  set(8, 9, "bridge", true);
  set(8, 10, "bridge", true);

  // --- NW Quadrant (cols 1-6, rows 1-6): Noble & Temple ---
  // Location entrances
  set(2, 2, "building", true, "rivermoot-temple-square");
  set(4, 2, "building", true, "rivermoot-cathedral-of-the-dawn");
  set(2, 4, "building", true, "rivermoot-noble-quarter");
  set(4, 4, "garden", true, "rivermoot-silver-gardens");
  // Roads
  const nwRoads = [
    [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
    [1,2],[3,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
    [1,4],[3,4],[5,4],[6,4],
    [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
  ];
  for (const [x, y] of nwRoads) {
    if (!grid[y][x]) set(x, y, "road", true);
  }
  // Fill remaining NW with building
  for (let y = 1; y <= 6; y++) {
    for (let x = 1; x <= 6; x++) {
      if (!grid[y][x]) set(x, y, "building", false);
    }
  }

  // --- NE Quadrant (cols 9-14, rows 1-6): Market & Guild ---
  set(10, 2, "building", true, "rivermoot-grand-bazaar");
  set(12, 2, "building", true, "rivermoot-artisans-guild-hall");
  set(10, 4, "building", true, "rivermoot-red-ring");
  set(12, 4, "building", true, "rivermoot-spice-quarter");
  const neRoads = [
    [9,1],[10,1],[11,1],[12,1],[13,1],[14,1],
    [9,2],[11,2],[13,2],[14,2],
    [9,3],[10,3],[11,3],[12,3],[13,3],[14,3],
    [9,4],[11,4],[13,4],[14,4],
    [9,5],[10,5],[11,5],[12,5],[13,5],[14,5],
    [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  ];
  for (const [x, y] of neRoads) {
    if (!grid[y][x]) set(x, y, "road", true);
  }
  for (let y = 1; y <= 6; y++) {
    for (let x = 9; x <= 14; x++) {
      if (!grid[y][x]) set(x, y, "building", false);
    }
  }

  // --- SW Quadrant (cols 1-6, rows 9-14): Arcane & Academic ---
  set(2, 10, "building", true, "rivermoot-arcane-quadrangle");
  set(4, 10, "building", true, "rivermoot-athenaeum");
  set(2, 12, "building", true, "rivermoot-alchemy-lane");
  set(4, 12, "building", true, "rivermoot-star-tower");
  const swRoads = [
    [1,9],[2,9],[3,9],[4,9],[5,9],[6,9],
    [1,10],[3,10],[5,10],[6,10],
    [1,11],[2,11],[3,11],[4,11],[5,11],[6,11],
    [1,12],[3,12],[5,12],[6,12],
    [1,13],[2,13],[3,13],[4,13],[5,13],[6,13],
    [1,14],[2,14],[3,14],[4,14],[5,14],[6,14],
  ];
  for (const [x, y] of swRoads) {
    if (!grid[y][x]) set(x, y, "road", true);
  }
  for (let y = 9; y <= 14; y++) {
    for (let x = 1; x <= 6; x++) {
      if (!grid[y][x]) set(x, y, "building", false);
    }
  }

  // --- SE Quadrant (cols 9-14, rows 9-14): Docks & Shadow ---
  set(10, 10, "dock", true, "rivermoot-dockside-gate");
  set(12, 10, "building", true, "rivermoot-warehouse-row");
  set(10, 12, "building", true, "rivermoot-the-depths");
  set(12, 12, "building", true, "rivermoot-night-market");
  const seRoads = [
    [9,9],[10,9],[11,9],[12,9],[13,9],[14,9],
    [9,10],[11,10],[13,10],[14,10],
    [9,11],[10,11],[11,11],[12,11],[13,11],[14,11],
    [9,12],[11,12],[13,12],[14,12],
    [9,13],[10,13],[11,13],[12,13],[13,13],[14,13],
    [9,14],[10,14],[11,14],[12,14],[13,14],[14,14],
  ];
  for (const [x, y] of seRoads) {
    if (!grid[y][x]) set(x, y, "road", true);
  }
  for (let y = 9; y <= 14; y++) {
    for (let x = 9; x <= 14; x++) {
      if (!grid[y][x]) set(x, y, "dock", false);
    }
  }

  // Flatten
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (grid[y][x]) {
        cells.push(grid[y][x]!);
      } else {
        // Fallback — shouldn't happen if logic above is complete
        cells.push(cell(x, y, "road", true));
      }
    }
  }

  return cells;
}

export const RIVERMOOT_CITY_GRID = {
  width: 16,
  height: 16,
  cells: generateCells(),
  backgroundImage: "/maps/rivermoot-city.jpg",
};
