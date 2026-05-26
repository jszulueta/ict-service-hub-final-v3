// app/(user)/tickets/new/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TicketSubmitForm } from '@/components/tickets/TicketSubmitForm'
import { PageHeader } from '@/components/ui'
import { Profile } from '@/types/database'
import Navbar from '@/components/ui/navbar'

export const metadata = { title: 'New Service Request' }

export default async function NewTicketPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
    
  const profile = profileData as Profile | null
      if (!profile) redirect('/auth/login')

  const { data: notifsData, count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-liturgical-white">
      <Navbar profile={profile} unreadCount={unreadCount ?? 0} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="New Service Request"
          subtitle="Submit a request to the ICT or Media team"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'My Tickets', href: '/tickets' },
            { label: 'New Request' },
          ]}
        />
        <TicketSubmitForm />
      </main>
    </div>
  )
}
