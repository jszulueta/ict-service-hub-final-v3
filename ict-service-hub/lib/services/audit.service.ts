import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { AuditAction } from '@/types/database'

export const AuditService = {
  async logAction(params: {
    actorId?: string | null
    actorEmail?: string | null
    action: AuditAction
    resource?: string
    resourceId?: string
    oldValues?: any
    newValues?: any
    ipAddress?: string
  }) {
    try {
      const adminClient = createSupabaseAdminClient()
      await (adminClient.from('audit_logs') as any).insert({
        actor_id: params.actorId || null,
        actor_email: params.actorEmail || null,
        action: params.action,
        resource: params.resource || null,
        resource_id: params.resourceId || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
        ip_address: params.ipAddress || null,
      })
    } catch (err) {
      console.error('[AuditService] Failed to log action:', err)
    }
  }
}
