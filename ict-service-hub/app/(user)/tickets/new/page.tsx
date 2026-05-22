// app/(user)/tickets/new/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TicketSubmitForm } from '@/components/tickets/TicketSubmitForm'
import { PageHeader } from '@/components/ui'

export const metadata = { title: 'New Service Request' }

export default async function NewTicketPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-liturgical-white">
      {/* Nav */}
      <header className="bg-white border-b border-liturgical-muted sticky top-0 z-30 shadow-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-gold-600 font-bold tracking-wide">Diocese of Kalookan</div>
            <div className="text-navy-950 font-bold text-sm leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">Dashboard</Link>
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">My Tickets</Link>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>
        </div>
      </header>

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
