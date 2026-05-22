// app/(user)/tickets/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, EmptyState, PageHeader } from '@/components/ui'
import { SERVICE_CATEGORY_LABELS } from '@/types/database'
import type { Ticket } from '@/types/database'

export const metadata = { title: 'My Tickets' }

export default async function TicketsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, category, status, priority, created_at, updated_at, event_date')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })

  const myTickets = (tickets || []) as Ticket[]

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
            <Link href="/tickets" className="px-3 py-2 text-sm font-semibold text-navy-950 bg-navy-50 rounded">My Tickets</Link>
            <Link href="/tickets/new" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">New Request</Link>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title="My Service Requests"
          subtitle={`${myTickets.length} total ticket${myTickets.length !== 1 ? 's' : ''}`}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Tickets' }]}
          action={
            <Link href="/tickets/new" className="inline-flex items-center gap-2 bg-navy-950 text-white px-5 py-2.5 rounded-btn font-semibold text-sm hover:bg-navy-800 transition-colors">
              ➕ New Request
            </Link>
          }
        />

        <div className="bg-white rounded-card border border-liturgical-muted shadow-card">
          {myTickets.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No requests yet"
              description="Submit your first service request to get started."
              action={
                <Link href="/tickets/new" className="inline-flex items-center gap-2 bg-navy-950 text-white px-6 py-3 rounded-btn font-semibold hover:bg-navy-800 transition-colors">
                  Submit Request
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-liturgical-muted">
              {myTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-start gap-4 px-6 py-5 hover:bg-liturgical-cream transition-colors group"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-navy-50 border border-navy-200 flex items-center justify-center text-xl" aria-hidden="true">
                    {{ systems_software:'💻', network_infrastructure:'🌐', live_streaming:'📡', photography:'📷', videography:'🎬' }[ticket.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="font-semibold text-navy-950 group-hover:text-gold-600 transition-colors truncate">{ticket.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {SERVICE_CATEGORY_LABELS[ticket.category]} · {new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-slate-300 group-hover:text-gold-600 transition-colors text-xl" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
