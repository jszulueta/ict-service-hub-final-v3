'use server'

import { revalidatePath } from 'next/cache'
import { createTicketSchema, updateTicketSchema, createCommentSchema } from '@/lib/validations/schemas'
import type { CreateTicketInput, UpdateTicketInput, CreateCommentInput } from '@/lib/validations/schemas'
import { TicketService } from '@/lib/services/ticket.service'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/services/notification.service'

type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

export async function createTicket(
  rawInput: CreateTicketInput
): Promise<ActionResult<{ ticketId: string; ticketNumber: string }>> {
  try {
    const { user } = await TicketService.getAuthenticatedUser()
    const ip = await TicketService.getClientIP()

    const parsed = createTicketSchema.safeParse(rawInput)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }
    }

    const result = await TicketService.create(parsed.data, user, ip)
    
    if (result.success) {
      revalidatePath('/tickets')
    }

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error.'
    console.error('[createTicket] Caught error:', msg)
    return { success: false, error: msg }
  }
}

export async function updateTicket(
  ticketId: string,
  rawInput: UpdateTicketInput
): Promise<ActionResult> {
  try {
    const { user } = await TicketService.getAdminUser()
    const ip = await TicketService.getClientIP()

    const parsed = updateTicketSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }

    const result = await TicketService.update(ticketId, parsed.data, user, ip)

    if (result.success) {
      revalidatePath('/admin/tickets')
      revalidatePath(`/admin/tickets/${ticketId}`)
    }

    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' }
  }
}

export async function updateArchiveLink(
  ticketId: string,
  link: string,
  description: string
): Promise<ActionResult> {
  try {
    const { user, profile, supabase } = await TicketService.getAuthenticatedUser()

    // @ts-ignore
    const { data: ticketData } = await (supabase.from('tickets') as any)
      .select('requester_id')
      .eq('id', ticketId)
      .single()

    const ticket = ticketData as any
    const isOwner = ticket?.requester_id === user.id
    const isStaff = ['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)

    if (!isOwner && !isStaff) return { success: false, error: 'You do not have permission to update this ticket.' }

    // @ts-ignore
    const { error } = await (supabase.from('tickets') as any)
      .update({ external_archive_link: link || null, archive_description: description || null } )
      .eq('id', ticketId)

    if (error) return { success: false, error: 'Failed to update archive link.' }

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true, message: 'Archive link updated.' }
  } catch {
    return { success: false, error: 'Unexpected error.' }
  }
}

export async function addComment(
  rawInput: CreateCommentInput
): Promise<ActionResult<{ commentId: string }>> {
  try {
    const { user, profile, supabase } = await TicketService.getAuthenticatedUser()

    const parsed = createCommentSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }

    if (parsed.data.is_internal && !['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Only ICT staff can post internal notes.' }
    }

    // @ts-ignore
    const { data: ticketData } = await (supabase.from('tickets') as any)
      .select('requester_id, ticket_number')
      .eq('id', parsed.data.ticket_id)
      .single()

    const ticketForComment = ticketData as any

    // @ts-ignore
    const { data: commentData, error } = await (supabase.from('comments') as any)
      .insert({
        ticket_id:   parsed.data.ticket_id,
        author_id:   user.id,
        body:        parsed.data.body,
        is_internal: parsed.data.is_internal ?? false,
      })
      .select('id')
      .single()

    const comment = commentData as { id: string } | null
    if (error || !comment) return { success: false, error: 'Failed to post comment.' }

    const isStaff = ['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)
    const isPublicStaffComment = isStaff && !parsed.data.is_internal
    const commentAuthorIsRequester = ticketForComment?.requester_id === user.id

    if (isPublicStaffComment && ticketForComment && !commentAuthorIsRequester) {
      await NotificationService.sendNotification({
        userId:   ticketForComment.requester_id,
        ticketId: parsed.data.ticket_id,
        type:      'comment_added',
        title:     'New Comment on Your Ticket',
        message:   `The ICT team added a comment on ticket ${ticketForComment.ticket_number}.`,
      })
    }

    revalidatePath(`/tickets/${parsed.data.ticket_id}`)
    revalidatePath(`/admin/tickets/${parsed.data.ticket_id}`)
    return { success: true, data: { commentId: comment.id } }
  } catch {
    return { success: false, error: 'Unexpected error.' }
  }
}

export async function recordUsageSnapshot(): Promise<ActionResult> {
  try {
    await TicketService.getAdminUser()
    const adminClient = createSupabaseAdminClient()

    const [tickets, users, comments, notifs] = await Promise.all([
      // @ts-ignore
      adminClient.from('tickets').select('id', { count: 'exact', head: true }),
      // @ts-ignore
      adminClient.from('profiles').select('id', { count: 'exact', head: true }),
      // @ts-ignore
      adminClient.from('comments').select('id', { count: 'exact', head: true }),
      // @ts-ignore
      adminClient.from('notifications').select('id', { count: 'exact', head: true }),
    ])

    // @ts-ignore
    await (adminClient.from('usage_snapshots') as any).upsert({
      snapshot_date:  new Date().toISOString().split('T')[0],
      total_tickets:  tickets.count  || 0,
      total_users:    users.count    || 0,
      total_comments: comments.count || 0,
      total_notifs:   notifs.count   || 0,
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to record usage snapshot.' }
  }
}
