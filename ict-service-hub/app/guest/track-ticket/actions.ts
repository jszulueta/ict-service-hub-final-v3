'use server'

import { createClient } from '@supabase/supabase-js'

export async function addGuestComment(ticketNumber: string, body: string) {
  // Use the service role key to securely insert the comment, bypassing RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key is missing')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Get the ticket details to verify it exists and is a guest ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, guest_name')
    .eq('ticket_number', ticketNumber)
    .is('requester_id', null)
    .single()

  if (ticketError || !ticket) {
    throw new Error('Invalid ticket or not a guest ticket.')
  }

  // 2. Insert the comment
  const { error: commentError } = await supabase
    .from('comments')
    .insert([
      {
        ticket_id: ticket.id,
        body: body,
        guest_name: ticket.guest_name || 'Guest',
        is_internal: false
      }
    ])

  if (commentError) {
    throw new Error(commentError.message)
  }

  return { success: true }
}
