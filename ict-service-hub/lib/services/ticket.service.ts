import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { AuditService } from './audit.service'
import { NotificationService } from './notification.service'
import type { CreateTicketInput, UpdateTicketInput, CreateCommentInput } from '@/lib/validations/schemas'
import type { Profile, Ticket, NotificationType } from '@/types/database'
import { headers } from 'next/headers'

type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

export const TicketService = {
  async getAuthenticatedUser() {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized: No active session.')

    const { data } = await supabase.from('profiles')
      .select('id, email, full_name, role, is_active, is_suspended')
      .eq('id', user.id)
      .single()

    const profile = data as Pick<Profile, 'id' | 'email' | 'full_name' | 'role' | 'is_active' | 'is_suspended'> | null

    if (!profile || !profile.is_active || profile.is_suspended) {
      throw new Error('Unauthorized: Account is inactive or suspended.')
    }

    return { user, profile, supabase }
  },

  async getAdminUser() {
    const { user, profile, supabase } = await this.getAuthenticatedUser()
    if (!['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
      throw new Error('Forbidden: Insufficient permissions.')
    }
    return { user, profile, supabase }
  },

  async getClientIP(): Promise<string> {
    const hdrs = await headers()
    return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
  },

  async create(parsedData: CreateTicketInput, user: any, ip: string): Promise<ActionResult<{ ticketId: string; ticketNumber: string }>> {
    const supabase = await createSupabaseServerClient()
    
    const { data: ticketData, error: insertError } = await (supabase.from('tickets') as any)
      .insert({
        requester_id:          user.id,
        title:                 parsedData.title,
        description:           parsedData.description,
        category:              parsedData.category,
        priority:              parsedData.priority,
        event_name:            parsedData.event_name     || null,
        event_date:            parsedData.event_date     || null,
        event_location:        parsedData.event_location || null,
        event_notes:           parsedData.event_notes    || null,
        external_archive_link: parsedData.external_archive_link || null,
        archive_description:   parsedData.archive_description   || null,
        ip_address:            ip,
        status:                'pending',
      })
      .select('id, ticket_number')
      .single()

    if (insertError) {
      return { success: false, error: `Database error: ${insertError.message}` }
    }

    const ticket = ticketData as Pick<Ticket, 'id' | 'ticket_number'>

    await NotificationService.sendNotification({
      userId: user.id,
      ticketId: ticket.id,
      type: 'ticket_created',
      title: 'Ticket Submitted',
      message: `Your request "${parsedData.title}" has been submitted (${ticket.ticket_number}).`
    })

    await AuditService.logAction({
      actorId: user.id,
      actorEmail: user.email,
      action: 'ticket_created',
      resource: 'ticket',
      resourceId: ticket.id,
      newValues: { ticket_number: ticket.ticket_number, category: parsedData.category },
      ipAddress: ip
    })

    return { success: true, data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number } }
  },

  async update(ticketId: string, parsedData: UpdateTicketInput, user: any, ip: string): Promise<ActionResult> {
    const supabase = await createSupabaseServerClient()

    const { data: existingData } = await (supabase.from('tickets') as any)
      .select('id, status, assigned_to, requester_id, ticket_number, resolved_at, closed_at')
      .eq('id', ticketId)
      .single()

    const existing = existingData as Pick<Ticket, 'id' | 'status' | 'assigned_to' | 'requester_id' | 'ticket_number' | 'resolved_at' | 'closed_at'> | null
    if (!existing) return { success: false, error: 'Ticket not found.' }

    const updateData: Partial<Ticket> = Object.fromEntries(
      Object.entries(parsedData).filter(([, v]) => v !== undefined)
    )
    if (parsedData.status === 'resolved' && !existing.resolved_at) updateData.resolved_at = new Date().toISOString()
    if (parsedData.status === 'closed'   && !existing.closed_at)   updateData.closed_at   = new Date().toISOString()

    // Use regular client if not an admin, we shouldn't use admin client to bypass RLS entirely unless we need to.
    // Actually, staff updating any ticket relies on staff policy, so we should just use the regular supabase client since it has RLS for staff!
    const { error } = await (supabase.from('tickets') as any).update(updateData).eq('id', ticketId)
    if (error) {
      return { success: false, error: 'Failed to update ticket.' }
    }

    if (parsedData.status && parsedData.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        pending:     'Pending',
        open:        'Open',
        in_progress: 'In Progress',
        on_hold:     'On Hold',
        resolved:    'Resolved',
        closed:      'Closed',
      }
      const statusLabel = statusLabels[parsedData.status] ?? parsedData.status

      const notifType: NotificationType =
        parsedData.status === 'resolved' ? 'ticket_resolved' :
        parsedData.status === 'closed'   ? 'ticket_closed'   :
        parsedData.status === 'open'     ? 'status_changed'  : 
        'ticket_updated'

      await NotificationService.sendNotification({
        userId: existing.requester_id,
        ticketId: ticketId,
        type: notifType,
        title: 'Ticket Status Updated',
        message: `Your ticket ${existing.ticket_number} status has been updated to "${statusLabel}".`
      })
    }

    if (parsedData.assigned_to !== undefined && parsedData.assigned_to !== existing.assigned_to && parsedData.assigned_to !== null) {
      await NotificationService.sendNotification({
        userId: existing.requester_id,
        ticketId: ticketId,
        type: 'ticket_assigned',
        title: 'Ticket Assigned',
        message: `Your ticket ${existing.ticket_number} has been assigned to a technician and is being reviewed.`
      })
    }

    await AuditService.logAction({
      actorId: user.id,
      actorEmail: user.email,
      action: parsedData.status !== existing.status ? 'status_changed' : 'ticket_updated',
      resource: 'ticket',
      resourceId: ticketId,
      oldValues: { status: existing.status, assigned_to: existing.assigned_to },
      newValues: parsedData,
      ipAddress: ip
    })

    return { success: true, message: 'Ticket updated successfully.' }
  }
}
