import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Log a significant action to the audit log.
 * Fire-and-forget — never throws, so it won't break the parent mutation.
 */
export async function logAudit(
  ctx: { db: MutationCtx["db"] },
  userId: Id<"users">,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await ctx.db.insert("auditLog", {
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      createdAt: Date.now(),
    });
  } catch {
    // Audit logging should never break the parent mutation
    console.error("Audit log insert failed");
  }
}
