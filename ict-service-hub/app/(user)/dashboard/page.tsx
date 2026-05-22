// app/(user)/dashboard/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, EmptyState } from '@/components/ui'
import type { Ticket, Profile, Notification } from '@/types/database'
import { SERVICE_CATEGORY_LABELS } from '@/types/database'

export const metadata = { title: 'My Dashboard' }

export default async function UserDashboardPage() {
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

  const { data: ticketsData } = await supabase
    .from('tickets')
    .select('id, ticket_number, title, category, status, priority, created_at, updated_at')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: notifsData, count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const myTickets   = (ticketsData   || []) as Ticket[]
  const notifications = (notifsData  || []) as Notification[]

  const activeCount = myTickets.filter((t) =>
    ['pending', 'open', 'in_progress', 'on_hold'].includes(t.status)
  ).length

  const resolvedCount = myTickets.filter((t) => t.status === 'resolved').length
  const closedCount   = myTickets.filter((t) => t.status === 'closed').length

  const categoryIcons: Record<string, string> = {
    systems_software: '💻', network_infrastructure: '🌐',
    live_streaming: '📡', photography: '📷', videography: '🎬',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-amber-400 font-bold text-sm">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-amber-600 font-bold tracking-wide">Diocese of Kalookan</div>
              <div className="text-slate-900 font-bold text-sm leading-none">ICT Service Hub</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded">Dashboard</Link>
            <Link href="/tickets/new" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors">New Request</Link>
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors">My Tickets</Link>
            <div className="relative ml-2">
              <Link href="/notifications" className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" aria-label="Notifications">
                <span className="text-xl">🔔</span>
                {(unreadCount || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    {(unreadCount || 0) > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Good day, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1">
            {profile.parish_office || profile.department || 'ICT Service Portal'} · Diocese of Kalookan
          </p>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <span className="text-lg mt-0.5">📬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-900">{n.title}</p>
                  <p className="text-sm text-blue-700">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Requests', value: myTickets.length, icon: '📋', color: 'bg-slate-50 border-slate-200' },
            { label: 'Active',         value: activeCount,       icon: '🔄', color: 'bg-blue-50 border-blue-200'  },
            { label: 'Resolved',       value: resolvedCount,     icon: '✅', color: 'bg-green-50 border-green-200'},
            { label: 'Closed',         value: closedCount,       icon: '🔒', color: 'bg-slate-50 border-slate-200'},
          ].map((card) => (
            <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-2xl font-bold text-slate-900">{card.value}</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mb-6">
          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-3 bg-slate-900 hover:bg-slate-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors shadow-md"
          >
            <span>➕</span> Submit a New Service Request
          </Link>
        </div>

        {/* Tickets list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">My Service Requests</h2>
            <Link href="/tickets" className="text-sm text-amber-600 hover:text-amber-700 font-semibold">View All →</Link>
          </div>

          {myTickets.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No service requests yet"
              description="Submit your first request to get ICT support or media services."
              action={
                <Link href="/tickets/new" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-colors">
                  Submit Request
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {myTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl">
                    {categoryIcons[ticket.category] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors truncate">{ticket.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {SERVICE_CATEGORY_LABELS[ticket.category]} · {new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-slate-300 group-hover:text-amber-600 transition-colors text-xl">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-2">ℹ️ Need urgent help?</h3>
          <p className="text-amber-800 mb-3">Contact the ICT Department directly for critical issues:</p>
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <span className="text-amber-800">📧 <a href="mailto:ict@dioceseofkalookan.org" className="underline">ict@dioceseofkalookan.org</a></span>
          </div>
        </div>
      </main>
    </div>
  )
}
