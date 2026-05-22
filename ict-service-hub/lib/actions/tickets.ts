// lib/actions/tickets.ts
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { createTicketSchema, updateTicketSchema, createCommentSchema } from '@/lib/validations/schemas'
import type { CreateTicketInput, UpdateTicketInput, CreateCommentInput } from '@/lib/validations/schemas'
import type { Profile, Ticket } from '@/types/database'
import { sendTicketNotification } from '@/lib/email/resend'

type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized: No active session.')

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, is_suspended')
    .eq('id', session.user.id)
    .single()

  const profile = data as Pick<Profile, 'id' | 'email' | 'full_name' | 'role' | 'is_active' | 'is_suspended'> | null

  if (!profile || !profile.is_active || profile.is_suspended) {
    throw new Error('Unauthorized: Account is inactive or suspended.')
  }

  return { session, profile, supabase }
}

async function getAdminUser() {
  const { session, profile, supabase } = await getAuthenticatedUser()
  if (!['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
    throw new Error('Forbidden: Insufficient permissions.')
  }
  return { session, profile, supabase }
}

async function getClientIP(): Promise<string> {
  const hdrs = await headers()
  return hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1'
}

async function checkTicketSpam(userId: string, ip: string): Promise<{ spam: boolean; reason?: string }> {
  const adminClient = createSupabaseAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await adminClient
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .gte('created_at', oneHourAgo)

  if ((count || 0) >= 5) return { spam: true, reason: 'Too many tickets submitted in the past hour.' }

  const { count: ipCount } = await adminClient
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)

  if ((ipCount || 0) >= 8) return { spam: true, reason: 'Too many submissions from this IP address.' }

  return { spam: false }
}

// ── createTicket ────────────────────────────────────────────────────────────

export async function createTicket(
  rawInput: CreateTicketInput
): Promise<ActionResult<{ ticketId: string; ticketNumber: string }>> {
  try {
    const { session, profile, supabase } = await getAuthenticatedUser()
    const ip = await getClientIP()

    const parsed = createTicketSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }

    const spamCheck = await checkTicketSpam(session.user.id, ip)
    if (spamCheck.spam) {
      const adminClient = createSupabaseAdminClient()
      await adminClient.from('audit_logs').insert({
        actor_id: session.user.id,
        actor_email: session.user.email,
        action: 'spam_flagged' as const,
        resource: 'ticket',
        new_values: { reason: spamCheck.reason, ip },
        ip_address: ip,
      })
      return { success: false, error: spamCheck.reason || 'Submission limit reached. Please try again later.' }
    }

    const { data: ticketData, error } = await supabase
      .from('tickets')
      .insert({
        requester_id: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        event_name:     parsed.data.event_name     || null,
        event_date:     parsed.data.event_date     || null,
        event_location: parsed.data.event_location || null,
        event_notes:    parsed.data.event_notes    || null,
        external_archive_link: parsed.data.external_archive_link || null,
        archive_description:   parsed.data.archive_description   || null,
        ip_address: ip,
        status: 'pending' as const,
      })
      .select('id, ticket_number')
      .single()

    const ticket = ticketData as Pick<Ticket, 'id' | 'ticket_number'> | null
    if (error || !ticket) return { success: false, error: 'Failed to submit ticket. Please try again.' }

    await supabase.from('notifications').insert({
      user_id:   session.user.id,
      ticket_id: ticket.id,
      type:      'ticket_created' as const,
      title:     'Ticket Submitted',
      message:   `Your request "${parsed.data.title}" has been submitted (${ticket.ticket_number}).`,
    })

    const adminClient = createSupabaseAdminClient()
    await adminClient.from('audit_logs').insert({
      actor_id:    session.user.id,
      actor_email: session.user.email,
      action:      'ticket_created' as const,
      resource:    'ticket',
      resource_id: ticket.id,
      new_values:  { ticket_number: ticket.ticket_number, category: parsed.data.category },
      ip_address:  ip,
    })

    sendTicketNotification({
      type:           'ticket_created',
      recipientEmail: session.user.email!,
      recipientName:  profile.full_name,
      ticketNumber:   ticket.ticket_number!,
      ticketTitle:    parsed.data.title,
      category:       parsed.data.category,
    }).catch(console.error)

    revalidatePath('/tickets')
    return { success: true, data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number! } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error.'
    return { success: false, error: msg }
  }
}

// ── updateTicket ────────────────────────────────────────────────────────────

export async function updateTicket(
  ticketId: string,
  rawInput: UpdateTicketInput
): Promise<ActionResult> {
  try {
    const { session } = await getAdminUser()
    const ip = await getClientIP()

    const parsed = updateTicketSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }

    const supabase = await createSupabaseServerClient()
    const adminClient = createSupabaseAdminClient()

    const { data: existingData } = await supabase
      .from('tickets')
      .select('id, status, assigned_to, requester_id, ticket_number, resolved_at, closed_at')
      .eq('id', ticketId)
      .single()

    const existing = existingData as Pick<Ticket, 'id' | 'status' | 'assigned_to' | 'requester_id' | 'ticket_number' | 'resolved_at' | 'closed_at'> | null
    if (!existing) return { success: false, error: 'Ticket not found.' }

    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.status === 'resolved' && !existing.resolved_at) updateData.resolved_at = new Date().toISOString()
    if (parsed.data.status === 'closed'   && !existing.closed_at)   updateData.closed_at   = new Date().toISOString()

    const { error } = await supabase.from('tickets').update(updateData).eq('id', ticketId)
    if (error) return { success: false, error: 'Failed to update ticket.' }

    // Notify requester on status change
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        pending:     'Pending',
        open:        'Open',
        in_progress: 'In Progress',
        on_hold:     'On Hold',
        resolved:    'Resolved',
        closed:      'Closed',
      }
      const statusLabel = statusLabels[parsed.data.status] ?? parsed.data.status

      const notifType =
        parsed.data.status === 'resolved' ? 'ticket_resolved' :
        parsed.data.status === 'closed'   ? 'ticket_closed'   :
        parsed.data.status === 'open'     ? 'ticket_reopened' :
        'ticket_updated'

      await adminClient.from('notifications').insert({
        user_id:   existing.requester_id,
        ticket_id: ticketId,
        type:      notifType,
        title:     'Ticket Status Updated',
        message:   `Your ticket ${existing.ticket_number} status has been updated to "${statusLabel}".`,
      })
    }

    // Notify requester on first assignment
    if (
      parsed.data.assigned_to !== undefined &&
      parsed.data.assigned_to !== existing.assigned_to &&
      parsed.data.assigned_to !== null
    ) {
      await adminClient.from('notifications').insert({
        user_id:   existing.requester_id,
        ticket_id: ticketId,
        type:      'ticket_assigned',
        title:     'Ticket Assigned',
        message:   `Your ticket ${existing.ticket_number} has been assigned to a technician and is being reviewed.`,
      })
    }

    await adminClient.from('audit_logs').insert({
      actor_id:    session.user.id,
      actor_email: session.user.email,
      action:      parsed.data.status !== existing.status ? 'status_changed' as const : 'ticket_updated' as const,
      resource:    'ticket',
      resource_id: ticketId,
      old_values:  { status: existing.status, assigned_to: existing.assigned_to },
      new_values:  parsed.data as Record<string, unknown>,
      ip_address:  ip,
    })

    revalidatePath('/admin/tickets')
    revalidatePath(`/admin/tickets/${ticketId}`)
    return { success: true, message: 'Ticket updated successfully.' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error.' }
  }
}

// ── updateArchiveLink ────────────────────────────────────────────────────────

export async function updateArchiveLink(
  ticketId: string,
  link: string,
  description: string
): Promise<ActionResult> {
  try {
    const { session, profile, supabase } = await getAuthenticatedUser()

    const { data: ticketData } = await supabase
      .from('tickets')
      .select('requester_id')
      .eq('id', ticketId)
      .single()

    const ticket = ticketData as Pick<Ticket, 'requester_id'> | null
    const isOwner = ticket?.requester_id === session.user.id
    const isStaff = ['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)

    if (!isOwner && !isStaff) return { success: false, error: 'You do not have permission to update this ticket.' }

    const { error } = await supabase
      .from('tickets')
      .update({ external_archive_link: link || null, archive_description: description || null })
      .eq('id', ticketId)

    if (error) return { success: false, error: 'Failed to update archive link.' }

    revalidatePath(`/tickets/${ticketId}`)
    return { success: true, message: 'Archive link updated.' }
  } catch (err) {
    return { success: false, error: 'Unexpected error.' }
  }
}

// ── addComment ────────────────────────────────────────────────────────────────

export async function addComment(
  rawInput: CreateCommentInput
): Promise<ActionResult<{ commentId: string }>> {
  try {
    const { session, profile, supabase } = await getAuthenticatedUser()

    const parsed = createCommentSchema.safeParse(rawInput)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message || 'Validation failed.' }

    if (parsed.data.is_internal && !['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
      return { success: false, error: 'Only ICT staff can post internal notes.' }
    }

    // Fetch the ticket so we can notify the requester
    const { data: ticketData } = await supabase
      .from('tickets')
      .select('requester_id, ticket_number')
      .eq('id', parsed.data.ticket_id)
      .single()

    const ticketForComment = ticketData as Pick<Ticket, 'requester_id' | 'ticket_number'> | null

    const { data: commentData, error } = await supabase
      .from('comments')
      .insert({
        ticket_id:   parsed.data.ticket_id,
        author_id:   session.user.id,
        body:        parsed.data.body,
        is_internal: parsed.data.is_internal,
      })
      .select('id')
      .single()

    const comment = commentData as { id: string } | null
    if (error || !comment) return { success: false, error: 'Failed to post comment.' }

    // Notify the requester when ICT staff posts a public (non-internal) comment
    const isStaff = ['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)
    const isPublicStaffComment = isStaff && !parsed.data.is_internal
    const commentAuthorIsRequester = ticketForComment?.requester_id === session.user.id

    if (isPublicStaffComment && ticketForComment && !commentAuthorIsRequester) {
      const adminClient = createSupabaseAdminClient()
      await adminClient.from('notifications').insert({
        user_id:   ticketForComment.requester_id,
        ticket_id: parsed.data.ticket_id,
        type:      'comment_added',
        title:     'New Comment on Your Ticket',
        message:   `The ICT team added a comment on ticket ${ticketForComment.ticket_number}.`,
      })
    }

    revalidatePath(`/tickets/${parsed.data.ticket_id}`)
    revalidatePath(`/admin/tickets/${parsed.data.ticket_id}`)
    return { success: true, data: { commentId: comment.id } }
  } catch (err) {
    return { success: false, error: 'Unexpected error.' }
  }
}

// ── recordUsageSnapshot ───────────────────────────────────────────────────────

export async function recordUsageSnapshot(): Promise<ActionResult> {
  try {
    await getAdminUser()
    const adminClient = createSupabaseAdminClient()

    const [tickets, users, comments, notifs] = await Promise.all([
      adminClient.from('tickets').select('id', { count: 'exact', head: true }),
      adminClient.from('profiles').select('id', { count: 'exact', head: true }),
      adminClient.from('comments').select('id', { count: 'exact', head: true }),
      adminClient.from('notifications').select('id', { count: 'exact', head: true }),
    ])

    await adminClient.from('usage_snapshots').upsert({
      snapshot_date: new Date().toISOString().split('T')[0],
      total_tickets: tickets.count || 0,
      total_users:   users.count   || 0,
      total_comments: comments.count || 0,
      total_notifs:  notifs.count   || 0,
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to record usage snapshot.' }
  }
}