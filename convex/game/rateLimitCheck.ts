import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { checkRateLimit } from "../lib/rateLimit";

/**
 * Internal mutation to check rate limits.
 * Called from actions via ctx.runMutation.
 */
export const check = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    await checkRateLimit(ctx, args.userId, args.action);
  },
});
