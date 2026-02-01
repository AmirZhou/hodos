import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const RATE_LIMITS: Record<string, { maxCalls: number; windowMs: number }> = {
  game_action: { maxCalls: 30, windowMs: 60_000 },    // 30 per minute
  admin: { maxCalls: 5, windowMs: 60_000 },            // 5 per minute
};

/**
 * Check and increment rate limit for a user+action pair.
 * Throws if rate limit exceeded.
 *
 * Must be called from a mutation context (or via ctx.runMutation from an action).
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string
): Promise<void> {
  const config = RATE_LIMITS[action];
  if (!config) return; // Unknown action category — no limit

  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_user_action", (q) => q.eq("userId", userId).eq("action", action))
    .first();

  if (!existing) {
    // First call — create tracking record
    await ctx.db.insert("rateLimits", {
      userId,
      action,
      windowStart: now,
      count: 1,
    });
    return;
  }

  // Check if window has expired
  if (now - existing.windowStart > config.windowMs) {
    // Reset window
    await ctx.db.patch(existing._id, {
      windowStart: now,
      count: 1,
    });
    return;
  }

  // Window still active — check count
  if (existing.count >= config.maxCalls) {
    const remainingMs = config.windowMs - (now - existing.windowStart);
    const remainingSec = Math.ceil(remainingMs / 1000);
    throw new Error(
      `Rate limit exceeded for ${action}. Try again in ${remainingSec}s.`
    );
  }

  // Increment count
  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}
