import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id, Doc } from "../_generated/dataModel";

/**
 * Resolve the current Clerk identity to a Convex user.
 * Throws "Not authenticated" if no valid JWT is present.
 */
export async function requireAuth(ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("Not authenticated — user record not found");
  }

  return { userId: user._id, user };
}

/**
 * Verify the caller owns the given character.
 * Returns the authenticated userId and the character document.
 */
export async function requireCharacterOwner(
  ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] },
  characterId: Id<"characters">,
) {
  const { userId, user } = await requireAuth(ctx);

  const character = await ctx.db.get(characterId);
  if (!character) {
    throw new Error("Character not found");
  }
  if (character.userId !== userId) {
    throw new Error("You do not own this character");
  }

  return { userId, user, character };
}

/**
 * Verify the caller is a member of the given campaign.
 * Optionally restrict to a specific role (e.g. "owner").
 */
export async function requireCampaignMember(
  ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] },
  campaignId: Id<"campaigns">,
  requiredRole?: "owner" | "player",
) {
  const { userId, user } = await requireAuth(ctx);

  const membership = await ctx.db
    .query("campaignMembers")
    .withIndex("by_campaign_and_user", (q) =>
      q.eq("campaignId", campaignId).eq("userId", userId),
    )
    .first();

  if (!membership) {
    throw new Error("You are not a member of this campaign");
  }

  if (requiredRole && membership.role !== requiredRole) {
    throw new Error(`This action requires the "${requiredRole}" role`);
  }

  return { userId, user, membership, role: membership.role as "owner" | "player" };
}
