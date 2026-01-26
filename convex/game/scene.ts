import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ============ VALIDATORS ============

const participantInput = v.object({
  entityId: v.string(),
  entityType: v.union(v.literal("character"), v.literal("npc")),
  role: v.union(
    v.literal("dominant"),
    v.literal("submissive"),
    v.literal("switch"),
    v.literal("observer")
  ),
});

const consentInput = v.object({
  consentGiven: v.boolean(),
  limits: v.array(v.string()),
  activities: v.array(v.string()),
});

const sceneActionType = v.union(
  v.literal("tease"),
  v.literal("restrain"),
  v.literal("sensation"),
  v.literal("impact"),
  v.literal("verbal"),
  v.literal("service"),
  v.literal("worship"),
  v.literal("edge"),
  v.literal("deny"),
  v.literal("reward"),
  v.literal("aftercare"),
  v.literal("check_in"),
  v.literal("other")
);

// ============ QUERIES ============

export const getSceneState = query({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      return null;
    }

    // Enrich participants with entity details
    const enrichedParticipants = await Promise.all(
      session.scene.participants.map(async (participant) => {
        if (participant.entityType === "character") {
          const character = await ctx.db.get(
            participant.entityId as Id<"characters">
          );
          return {
            ...participant,
            entity: character
              ? {
                  name: character.name,
                  portrait: character.portrait,
                  intimacyProfile: character.intimacyProfile,
                }
              : null,
          };
        } else {
          const npc = await ctx.db.get(participant.entityId as Id<"npcs">);
          return {
            ...participant,
            entity: npc
              ? {
                  name: npc.name,
                  portrait: npc.portrait,
                  intimacyProfile: npc.intimacyProfile,
                }
              : null,
          };
        }
      })
    );

    return {
      ...session.scene,
      participants: enrichedParticipants,
      sessionId: args.sessionId,
    };
  },
});

export const getAvailableSceneActions = query({
  args: {
    sessionId: v.id("gameSessions"),
    participantIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      return null;
    }

    const scene = session.scene;
    const participant = scene.participants[args.participantIndex];
    if (!participant) {
      return null;
    }

    const intensity = scene.intensity;
    const role = participant.role;
    const negotiatedActivities = scene.negotiatedActivities;

    // Actions available based on role and intensity level
    const actions: Array<{
      type: string;
      label: string;
      intensityRange: [number, number];
      forRoles: string[];
    }> = [
      { type: "check_in", label: "Check In", intensityRange: [0, 100], forRoles: ["dominant", "submissive", "switch", "observer"] },
      { type: "tease", label: "Tease", intensityRange: [0, 40], forRoles: ["dominant", "switch"] },
      { type: "verbal", label: "Verbal Play", intensityRange: [0, 70], forRoles: ["dominant", "switch"] },
      { type: "restrain", label: "Restrain", intensityRange: [20, 80], forRoles: ["dominant", "switch"] },
      { type: "sensation", label: "Sensation Play", intensityRange: [10, 70], forRoles: ["dominant", "switch"] },
      { type: "impact", label: "Impact Play", intensityRange: [30, 90], forRoles: ["dominant", "switch"] },
      { type: "service", label: "Provide Service", intensityRange: [0, 60], forRoles: ["submissive", "switch"] },
      { type: "worship", label: "Worship", intensityRange: [10, 70], forRoles: ["submissive", "switch"] },
      { type: "edge", label: "Edge", intensityRange: [40, 90], forRoles: ["dominant", "switch"] },
      { type: "deny", label: "Deny", intensityRange: [50, 95], forRoles: ["dominant", "switch"] },
      { type: "reward", label: "Reward", intensityRange: [20, 100], forRoles: ["dominant", "switch"] },
      { type: "aftercare", label: "Begin Aftercare", intensityRange: [0, 100], forRoles: ["dominant", "submissive", "switch"] },
    ];

    // Filter by role and intensity
    const available = actions.filter((action) => {
      const roleMatch = action.forRoles.includes(role);
      const intensityMatch = intensity >= action.intensityRange[0] && intensity <= action.intensityRange[1];
      const negotiated = action.type === "check_in" || action.type === "aftercare" || negotiatedActivities.includes(action.type);
      return roleMatch && intensityMatch && negotiated;
    });

    return {
      actions: available,
      currentIntensity: intensity,
      role,
      canIncreaseIntensity: intensity < 100,
      canDecreaseIntensity: intensity > 0,
    };
  },
});

// ============ MUTATIONS ============

export const proposeScene = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    proposerId: v.string(),
    participants: v.array(participantInput),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.scene) {
      throw new Error("A scene is already in progress");
    }

    const now = Date.now();

    // Create participant states - proposer has consent, others need to give it
    const participantStates = args.participants.map((p) => ({
      entityId: p.entityId,
      entityType: p.entityType,
      role: p.role,
      consentGiven: p.entityId === args.proposerId, // Proposer auto-consents
      limits: [] as string[],
      currentComfort: 100, // Start at full comfort
    }));

    await ctx.db.patch(args.sessionId, {
      mode: "scene",
      scene: {
        participants: participantStates,
        phase: "negotiation",
        intensity: 0,
        peakIntensity: 0,
        mood: "anticipation",
        currentActorIndex: 0,
        negotiatedActivities: [],
        usedSafeword: false,
        startedAt: now,
        lastActionAt: now,
      },
      lastActionAt: now,
    });

    return { phase: "negotiation", participantCount: participantStates.length };
  },
});

export const negotiateScene = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    participantIndex: v.number(),
    consent: consentInput,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    if (session.scene.phase !== "negotiation") {
      throw new Error("Not in negotiation phase");
    }

    const participants = [...session.scene.participants];
    const participant = participants[args.participantIndex];
    if (!participant) {
      throw new Error("Invalid participant index");
    }

    // Update participant's consent and limits
    participants[args.participantIndex] = {
      ...participant,
      consentGiven: args.consent.consentGiven,
      limits: args.consent.limits,
    };

    // Merge negotiated activities
    const existingActivities = session.scene.negotiatedActivities;
    const newActivities = [...new Set([...existingActivities, ...args.consent.activities])];

    // Check if all participants have given consent
    const allConsented = participants.every((p) => p.consentGiven);

    // If anyone explicitly declined, end the scene
    if (!args.consent.consentGiven) {
      await ctx.db.patch(args.sessionId, {
        mode: "exploration",
        scene: undefined,
        lastActionAt: Date.now(),
      });
      return { phase: "ended", reason: "consent_declined" };
    }

    const now = Date.now();

    if (allConsented) {
      // All consented - start the scene
      await ctx.db.patch(args.sessionId, {
        scene: {
          ...session.scene,
          participants,
          phase: "active",
          negotiatedActivities: newActivities,
          lastActionAt: now,
        },
        lastActionAt: now,
      });
      return { phase: "active", activities: newActivities };
    }

    // Still waiting for others
    await ctx.db.patch(args.sessionId, {
      scene: {
        ...session.scene,
        participants,
        negotiatedActivities: newActivities,
        lastActionAt: now,
      },
      lastActionAt: now,
    });

    const consented = participants.filter((p) => p.consentGiven).length;
    return { phase: "negotiation", consented, total: participants.length };
  },
});

export const performSceneAction = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    actorIndex: v.number(),
    actionType: sceneActionType,
    targetIndex: v.optional(v.number()),
    description: v.optional(v.string()),
    intensityDelta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    if (session.scene.phase !== "active") {
      throw new Error("Scene not active");
    }

    const scene = session.scene;
    const participants = [...scene.participants];
    const actor = participants[args.actorIndex];

    if (!actor) {
      throw new Error("Invalid actor");
    }

    // Calculate intensity change based on action
    let intensityChange = args.intensityDelta ?? 0;
    if (intensityChange === 0) {
      // Default intensity changes based on action type
      const intensityMap: Record<string, number> = {
        tease: 5,
        verbal: 3,
        restrain: 8,
        sensation: 7,
        impact: 10,
        service: 4,
        worship: 6,
        edge: 12,
        deny: 8,
        reward: -5,
        check_in: -2,
        aftercare: -15,
        other: 0,
      };
      intensityChange = intensityMap[args.actionType] ?? 0;
    }

    const newIntensity = Math.max(0, Math.min(100, scene.intensity + intensityChange));
    const newPeakIntensity = Math.max(scene.peakIntensity, newIntensity);

    // Update target's comfort if applicable
    if (args.targetIndex !== undefined) {
      const target = participants[args.targetIndex];
      if (target) {
        // Higher intensity actions can reduce comfort
        const comfortDelta = intensityChange > 5 ? -Math.floor(intensityChange / 2) : 0;
        participants[args.targetIndex] = {
          ...target,
          currentComfort: Math.max(0, Math.min(100, target.currentComfort + comfortDelta)),
        };
      }
    }

    // Update mood based on intensity level
    let mood = scene.mood;
    if (newIntensity < 20) mood = "anticipation";
    else if (newIntensity < 40) mood = "warming";
    else if (newIntensity < 60) mood = "building";
    else if (newIntensity < 80) mood = "intense";
    else mood = "peak";

    // Move to next actor
    const nextActorIndex = (args.actorIndex + 1) % participants.length;

    const now = Date.now();

    await ctx.db.patch(args.sessionId, {
      scene: {
        ...scene,
        participants,
        intensity: newIntensity,
        peakIntensity: newPeakIntensity,
        mood,
        currentActorIndex: nextActorIndex,
        lastActionAt: now,
      },
      lastActionAt: now,
    });

    // Check if aftercare was initiated
    if (args.actionType === "aftercare") {
      await ctx.db.patch(args.sessionId, {
        scene: {
          ...scene,
          participants,
          intensity: newIntensity,
          peakIntensity: newPeakIntensity,
          mood: "aftercare",
          phase: "aftercare",
          currentActorIndex: nextActorIndex,
          lastActionAt: now,
        },
        lastActionAt: now,
      });
      return { actionType: args.actionType, phase: "aftercare", intensity: newIntensity };
    }

    return { actionType: args.actionType, intensity: newIntensity, mood, nextActor: nextActorIndex };
  },
});

export const adjustIntensity = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    delta: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    const scene = session.scene;
    const newIntensity = Math.max(0, Math.min(100, scene.intensity + args.delta));
    const newPeakIntensity = Math.max(scene.peakIntensity, newIntensity);

    await ctx.db.patch(args.sessionId, {
      scene: {
        ...scene,
        intensity: newIntensity,
        peakIntensity: newPeakIntensity,
        lastActionAt: Date.now(),
      },
      lastActionAt: Date.now(),
    });

    return { intensity: newIntensity };
  },
});

export const useSafeword = mutation({
  args: {
    sessionId: v.id("gameSessions"),
    participantIndex: v.number(),
    level: v.union(v.literal("yellow"), v.literal("red")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    const participants = [...session.scene.participants];
    const participant = participants[args.participantIndex];

    if (!participant) {
      throw new Error("Invalid participant");
    }

    // Record who used the safeword
    participants[args.participantIndex] = {
      ...participant,
      safewordUsed: args.level,
    };

    if (args.level === "red") {
      // RED = full stop, end scene immediately, go to aftercare
      await ctx.db.patch(args.sessionId, {
        scene: {
          ...session.scene,
          participants,
          phase: "aftercare",
          mood: "care",
          usedSafeword: true,
          lastActionAt: Date.now(),
        },
        lastActionAt: Date.now(),
      });
      return { ended: false, phase: "aftercare", reason: "safeword_red" };
    } else {
      // YELLOW = pause, check in, reduce intensity
      const reducedIntensity = Math.max(0, session.scene.intensity - 20);
      await ctx.db.patch(args.sessionId, {
        scene: {
          ...session.scene,
          participants,
          intensity: reducedIntensity,
          mood: "checking_in",
          usedSafeword: true,
          lastActionAt: Date.now(),
        },
        lastActionAt: Date.now(),
      });
      return { ended: false, paused: true, intensity: reducedIntensity };
    }
  },
});

export const startAftercare = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    await ctx.db.patch(args.sessionId, {
      scene: {
        ...session.scene,
        phase: "aftercare",
        mood: "care",
        lastActionAt: Date.now(),
      },
      lastActionAt: Date.now(),
    });

    return { phase: "aftercare" };
  },
});

export const completeAftercare = mutation({
  args: {
    sessionId: v.id("gameSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) {
      throw new Error("No active scene");
    }

    const scene = session.scene;

    // Apply relationship bonuses based on scene intensity and whether safeword was used
    const relationshipBonus = scene.usedSafeword
      ? Math.floor(scene.peakIntensity / 10) // Smaller bonus if safeword used, but still positive for respecting boundaries
      : Math.floor(scene.peakIntensity / 5);

    // Find character-NPC pairs and update relationships
    const characters = scene.participants.filter((p) => p.entityType === "character");
    const npcs = scene.participants.filter((p) => p.entityType === "npc");

    for (const character of characters) {
      for (const npc of npcs) {
        const relationship = await ctx.db
          .query("relationships")
          .withIndex("by_character_and_npc", (q) =>
            q
              .eq("characterId", character.entityId as Id<"characters">)
              .eq("npcId", npc.entityId as Id<"npcs">)
          )
          .first();

        if (relationship) {
          await ctx.db.patch(relationship._id, {
            trust: Math.min(100, relationship.trust + relationshipBonus),
            intimacy: Math.min(100, relationship.intimacy + relationshipBonus * 2),
            // If safeword was used and respected, extra trust bonus
            ...(scene.usedSafeword ? { trust: Math.min(100, relationship.trust + relationshipBonus + 10) } : {}),
          });
        }
      }
    }

    // End the scene
    await ctx.db.patch(args.sessionId, {
      mode: "exploration",
      scene: undefined,
      lastActionAt: Date.now(),
    });

    return {
      completed: true,
      relationshipBonus,
      peakIntensity: scene.peakIntensity,
      safewordUsed: scene.usedSafeword,
    };
  },
});

// ============ ACTIONS (AI) ============

export const _getSceneStateInternal = query({
  args: { sessionId: v.id("gameSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.scene) return null;

    const enrichedParticipants = await Promise.all(
      session.scene.participants.map(async (participant) => {
        if (participant.entityType === "npc") {
          const npc = await ctx.db.get(participant.entityId as Id<"npcs">);
          return {
            ...participant,
            entity: npc ? { name: npc.name, intimacyProfile: npc.intimacyProfile } : null,
          };
        }
        return { ...participant, entity: null };
      })
    );
    return { ...session.scene, participants: enrichedParticipants };
  },
});

interface SceneParticipantWithEntity {
  entityId: string;
  entityType: "character" | "npc";
  role: "dominant" | "submissive" | "switch" | "observer";
  currentComfort: number;
  entity: { name: string; intimacyProfile?: unknown } | null;
  index: number;
}

export const executeNpcSceneAction = action({
  args: {
    sessionId: v.id("gameSessions"),
    npcIndex: v.number(),
  },
  handler: async (ctx, args): Promise<{ action: string; intensity?: number; targetIndex?: number }> => {
    const sceneState = await ctx.runQuery(api.game.scene._getSceneStateInternal, {
      sessionId: args.sessionId,
    });

    if (!sceneState) {
      throw new Error("No active scene");
    }

    const npc = sceneState.participants[args.npcIndex];
    if (!npc || npc.entityType !== "npc") {
      throw new Error("Invalid NPC index");
    }

    const intensity = sceneState.intensity;
    const role = npc.role;

    // Simple NPC AI based on role and intensity
    let actionType: string;
    let targetIndex: number | undefined;

    // Find a target (character participant)
    const characters: SceneParticipantWithEntity[] = sceneState.participants
      .map((p: typeof sceneState.participants[0], i: number) => ({ ...p, index: i }))
      .filter((p: SceneParticipantWithEntity) => p.entityType === "character");

    if (characters.length > 0) {
      targetIndex = characters[0].index;
    }

    // Choose action based on role and intensity
    if (role === "dominant" || role === "switch") {
      if (intensity < 30) {
        actionType = "tease";
      } else if (intensity < 50) {
        actionType = "verbal";
      } else if (intensity < 70) {
        actionType = Math.random() > 0.5 ? "sensation" : "restrain";
      } else if (intensity < 90) {
        actionType = Math.random() > 0.5 ? "edge" : "deny";
      } else {
        actionType = "reward";
      }
    } else if (role === "submissive") {
      if (intensity < 40) {
        actionType = "service";
      } else {
        actionType = "worship";
      }
    } else {
      actionType = "check_in";
    }

    await ctx.runMutation(api.game.scene.performSceneAction, {
      sessionId: args.sessionId,
      actorIndex: args.npcIndex,
      actionType: actionType as "tease" | "restrain" | "sensation" | "impact" | "verbal" | "service" | "worship" | "edge" | "deny" | "reward" | "aftercare" | "check_in" | "other",
      targetIndex,
    });

    return { action: actionType, intensity: sceneState.intensity, targetIndex };
  },
});
