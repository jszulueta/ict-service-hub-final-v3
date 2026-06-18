'use server'

import { createClient } from '@supabase/supabase-js'
import { type CreateGuestTicketInput } from '@/lib/validations/schemas'

export async function submitGuestTicket(formData: CreateGuestTicketInput) {
  // Use the service role key to securely insert the ticket, bypassing RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key is missing')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('tickets')
    .insert([
      {
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        title: formData.title,
        category: formData.category,
        description: formData.description,
        priority: formData.priority,
        event_name: formData.event_name,
        event_date: formData.event_date || null,
        event_location: formData.event_location,
        event_notes: formData.event_notes,
        external_archive_link: formData.external_archive_link,
        archive_description: formData.archive_description,
      }
    ])
    .select('ticket_number')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return { ticket_number: data.ticket_number }
}
