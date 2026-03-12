import "server-only"
import { supabaseServer } from "@/lib/supabase-server"

type AuditAction =
  | "tool.created"
  | "tool.submitted"
  | "tool.approved"
  | "tool.rejected"
  | "tool.forked"
  | "tool.forked.minor"
  | "tool.rated"
  | "tool.minor_update"
  | "tool.changes_requested"
  | "tool.sharing_changed"
  | "user.role_changed"
  | "review.completed"
  | "org.settings_updated"
  | "org.integrations_updated"
  | "api_key.created"
  | "api_key.revoked"

type AuditTargetType = "tool" | "user" | "review" | "org" | "api_key"

interface WriteAuditLogParams {
  orgId: string
  userId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog({
  orgId,
  userId,
  action,
  targetType,
  targetId,
  metadata = {},
}: WriteAuditLogParams): Promise<void> {
  const { error } = await supabaseServer.from("audit_logs").insert({
    org_id: orgId,
    user_id: userId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  })

  if (error) {
    // Never let audit logging failure break the main request
    console.error("Audit log write failed:", error.message)
  }
}
