import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============ QUERIES ============

export const getExplorationState = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const characterPositions = session.explorationPositions ?? {};
    const gridSize = session.currentGridSize ?? { width: 16, height: 16 };

    // Get NPC positions for the current location
    const npcPositions: Record<string, { x: number; y: number; name: string; entityId: string }> = {};
    if (session.locationId) {
      const npcs = await ctx.db
        .query("npcs")
        .withIndex("by_campaign", (q) => q.eq("campaignId", session.campaignId))
        .collect();

      for (const npc of npcs) {
        if (npc.currentLocationId === session.locationId && npc.position) {
          npcPositions[npc._id] = {
            ...npc.position,
            name: npc.name,
            entityId: npc._id,
          };
        }
      }
    }

    // Get grid cells from location
    let cells: Array<{ x: number; y: number; terrain: string; cover?: string }> = [];
    if (session.locationId) {
      const location = await ctx.db.get(session.locationId);
      if (location?.gridData) {
        cells = location.gridData.cells;
      }
    }

    return {
      gridSize,
      characterPositions,
      npcPositions,
      cells,
      movementHistory: session.movementHistory ?? [],
    };
  },
});

// ============ MUTATIONS ============

export const moveCharacter = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    characterId: v.string(),
    characterName: v.string(),
    to: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const positions = { ...(session.explorationPositions ?? {}) };
    const from = positions[args.characterId];
    if (!from) throw new Error("Character has no position");

    const gridSize = session.currentGridSize ?? { width: 16, height: 16 };

    // Validate destination is within grid
    if (args.to.x < 0 || args.to.x >= gridSize.width || args.to.y < 0 || args.to.y >= gridSize.height) {
      throw new Error("Destination out of bounds");
    }

    // Check terrain if location has grid data
    if (session.locationId) {
      const location = await ctx.db.get(session.locationId);
      if (location?.gridData) {
        const cell = location.gridData.cells.find(
          (c) => c.x === args.to.x && c.y === args.to.y
        );
        if (cell?.terrain === "impassable") {
          throw new Error("Cell is impassable");
        }
      }
    }

    // Update position
    positions[args.characterId] = args.to;

    // Create movement log entry
    const logEntryId = await ctx.db.insert("gameLog", {
      campaignId: session.campaignId,
      sessionId: args.sessionId,
      type: "movement",
      contentEn: `${args.characterName} moved from (${from.x}, ${from.y}) to (${args.to.x}, ${args.to.y})`,
      contentFr: `${args.characterName} s'est déplacé de (${from.x}, ${from.y}) à (${args.to.x}, ${args.to.y})`,
      actorType: "character",
      actorId: args.characterId,
      actorName: args.characterName,
      movementData: { from, to: args.to },
      createdAt: Date.now(),
    });

    // Push to movement history (keep last 20)
    const history = [...(session.movementHistory ?? [])];
    history.push({
      timestamp: Date.now(),
      characterId: args.characterId,
      from,
      to: args.to,
      logEntryId: logEntryId as string,
    });
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    await ctx.db.patch(args.sessionId, {
      explorationPositions: positions,
      movementHistory: history,
      lastActionAt: Date.now(),
    });

    return { from, to: args.to, logEntryId };
  },
});

export const undoMovement = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    characterId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const history = [...(session.movementHistory ?? [])];

    // Find the last movement for this character
    let lastIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].characterId === args.characterId) {
        lastIndex = i;
        break;
      }
    }
    if (lastIndex === -1) throw new Error("No movement to undo");

    const lastMove = history[lastIndex];

    // Restore old position
    const positions = { ...(session.explorationPositions ?? {}) };
    positions[args.characterId] = lastMove.from;

    // Remove the history entry
    history.splice(lastIndex, 1);

    // Delete the log entry
    try {
      await ctx.db.delete(lastMove.logEntryId as Id<"gameLog">);
    } catch {
      // Log entry may already be deleted
    }

    await ctx.db.patch(args.sessionId, {
      explorationPositions: positions,
      movementHistory: history,
      lastActionAt: Date.now(),
    });

    return { restoredPosition: lastMove.from };
  },
});

export const initializePositions = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    characterIds: v.array(v.string()),
    characterNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Get grid size from location
    let gridSize = { width: 16, height: 16 };
    if (session.locationId) {
      const location = await ctx.db.get(session.locationId);
      if (location?.gridData) {
        gridSize = { width: location.gridData.width, height: location.gridData.height };
      }
    }

    // Place characters at bottom-center spawn points
    const positions: Record<string, { x: number; y: number }> = {};
    const startY = gridSize.height - 2;
    const startX = Math.floor(gridSize.width / 2) - Math.floor(args.characterIds.length / 2);

    for (let i = 0; i < args.characterIds.length; i++) {
      positions[args.characterIds[i]] = {
        x: startX + i,
        y: startY,
      };
    }

    await ctx.db.patch(args.sessionId, {
      explorationPositions: positions,
      currentGridSize: gridSize,
      movementHistory: [],
      lastActionAt: Date.now(),
    });

    return { gridSize, positions };
  },
});
