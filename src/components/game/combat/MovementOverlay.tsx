"use client";

interface Position {
  x: number;
  y: number;
}

interface MovementOverlayProps {
  validMoves: Position[];
  attackRange: Position[];
  cellSize: number;
  onMoveClick: (position: Position) => void;
}

export function MovementOverlay({
  validMoves,
  attackRange,
  cellSize,
  onMoveClick,
}: MovementOverlayProps) {
  return (
    <g>
      {/* Valid movement cells */}
      {validMoves.map((pos) => (
        <rect
          key={`move-${pos.x}-${pos.y}`}
          x={pos.x * cellSize + 2}
          y={pos.y * cellSize + 2}
          width={cellSize - 4}
          height={cellSize - 4}
          rx={4}
          fill="var(--accent-blue)"
          fillOpacity={0.3}
          stroke="var(--accent-blue)"
          strokeWidth={1}
          strokeOpacity={0.5}
          className="cursor-pointer hover:fill-opacity-50 transition-all"
          onClick={() => onMoveClick(pos)}
          style={{ pointerEvents: "all" }}
        />
      ))}

      {/* Attack range cells */}
      {attackRange.map((pos) => (
        <rect
          key={`attack-${pos.x}-${pos.y}`}
          x={pos.x * cellSize + 2}
          y={pos.y * cellSize + 2}
          width={cellSize - 4}
          height={cellSize - 4}
          rx={4}
          fill="var(--accent-red)"
          fillOpacity={0.2}
          stroke="var(--accent-red)"
          strokeWidth={1}
          strokeOpacity={0.4}
          strokeDasharray="4 2"
          style={{ pointerEvents: "none" }}
        />
      ))}
    </g>
  );
}

// Helper function to calculate valid moves based on movement remaining
export function calculateValidMoves(
  currentPosition: Position,
  movementRemaining: number,
  gridWidth: number,
  gridHeight: number,
  occupiedCells: Position[],
  impassableCells: Position[]
): Position[] {
  const validMoves: Position[] = [];
  const cellsPerMovement = Math.floor(movementRemaining / 5); // 5ft per cell

  // Simple flood fill for valid movement
  const visited = new Set<string>();
  const queue: Array<{ pos: Position; remaining: number }> = [
    { pos: currentPosition, remaining: cellsPerMovement },
  ];

  visited.add(`${currentPosition.x},${currentPosition.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { pos, remaining } = current;

    if (remaining <= 0) continue;

    // Check adjacent cells (4-directional)
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const newPos = { x: pos.x + dir.x, y: pos.y + dir.y };
      const key = `${newPos.x},${newPos.y}`;

      // Skip if already visited
      if (visited.has(key)) continue;

      // Skip if out of bounds
      if (
        newPos.x < 0 ||
        newPos.x >= gridWidth ||
        newPos.y < 0 ||
        newPos.y >= gridHeight
      )
        continue;

      // Skip if impassable
      if (impassableCells.some((c) => c.x === newPos.x && c.y === newPos.y))
        continue;

      visited.add(key);

      // Check if occupied (can move through but not end on ally, cannot move through enemy)
      const isOccupied = occupiedCells.some(
        (c) => c.x === newPos.x && c.y === newPos.y
      );

      if (!isOccupied) {
        validMoves.push(newPos);
      }

      // Continue exploring from this cell
      queue.push({ pos: newPos, remaining: remaining - 1 });
    }
  }

  return validMoves;
}

// Helper function to calculate attack range
export function calculateAttackRange(
  position: Position,
  range: number, // in feet
  gridWidth: number,
  gridHeight: number
): Position[] {
  const rangeCells: Position[] = [];
  const cellRange = Math.floor(range / 5);

  for (let dx = -cellRange; dx <= cellRange; dx++) {
    for (let dy = -cellRange; dy <= cellRange; dy++) {
      if (dx === 0 && dy === 0) continue;

      const newX = position.x + dx;
      const newY = position.y + dy;

      // Skip if out of bounds
      if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight)
        continue;

      // Check Manhattan distance for melee or Euclidean for ranged
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance <= cellRange) {
        rangeCells.push({ x: newX, y: newY });
      }
    }
  }

  return rangeCells;
}
