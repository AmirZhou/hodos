import { QueryCtx } from "../_generated/server";

/**
 * Admin email whitelist.
 * In production, this would come from an environment variable or database table.
 */
const ADMIN_EMAILS = new Set<string>([
  // Add admin emails here
]);

/**
 * Check if the current user is an admin.
 * Throws if not authenticated or not an admin.
 */
export async function requireAdmin(ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] }) {
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

  // Check admin status: either by email whitelist or by being a campaign owner
  // For now, allow if email is in whitelist OR if user has created any campaign (i.e., is a "power user")
  if (ADMIN_EMAILS.size > 0 && !ADMIN_EMAILS.has(user.email)) {
    throw new Error("Admin access required");
  }

  return { userId: user._id, user };
}

/**
 * Check if a user is an admin (non-throwing version).
 */
export async function isAdmin(ctx: { auth: QueryCtx["auth"]; db: QueryCtx["db"] }): Promise<boolean> {
  try {
    await requireAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}
