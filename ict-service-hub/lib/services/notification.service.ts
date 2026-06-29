import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { NotificationType } from '@/types/database'

export const NotificationService = {
  async sendNotification(params: {
    userId: string
    ticketId?: string
    type: NotificationType
    title: string
    message: string
  }) {
    try {
      const adminClient = createSupabaseAdminClient()
      await (adminClient.from('notifications') as any).insert({
        user_id: params.userId,
        ticket_id: params.ticketId || null,
        type: params.type,
        title: params.title,
        message: params.message,
      })
    } catch (err) {
      console.error('[NotificationService] Failed to send notification:', err)
    }
  }
}
