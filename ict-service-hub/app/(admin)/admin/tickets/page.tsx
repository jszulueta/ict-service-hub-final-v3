// app/(admin)/admin/tickets/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui'
import type { Profile, Ticket, TicketStatus, TicketPriority, ServiceCategory } from '@/types/database'
import { SERVICE_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/types/database'

export const metadata = { title: 'All Tickets' }

const ADMIN_NAV = [
  { href: '/admin',         label: 'Dashboard' },
  { href: '/admin/tickets', label: 'Tickets'   },
  { href: '/admin/users',   label: 'Users'     },
  { href: '/admin/audit',   label: 'Audit Logs'},
  { href: '/admin/spam',    label: 'Spam'      },
]

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; category?: string; assigned?: string; q?: string }
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null
  if (!profile || !['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Build query with filters
  let query = supabase
    .from('tickets')
    .select('id, ticket_number, title, category, status, priority, created_at, assigned_to, requester_id')
    .order('created_at', { ascending: false })

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)
  if (searchParams.category) query = query.eq('category', searchParams.category)
  if (searchParams.assigned === 'none') query = query.is('assigned_to', null)
  if (searchParams.q) query = query.ilike('title', `%${searchParams.q}%`)

  const { data: ticketsData } = await query.limit(100)
  const tickets = (ticketsData || []) as Ticket[]

  // Fetch all staff for display
  const { data: staffData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['ict_staff', 'ict_admin', 'super_admin'])
  const staff = (staffData || []) as Pick<Profile, 'id' | 'full_name'>[]
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.full_name]))

  // Fetch requesters for display
  const requesterIds = [...new Set(tickets.map((t) => t.requester_id))]
  let requesterMap: Record<string, string> = {}
  if (requesterIds.length > 0) {
    const { data: reqData } = await supabase
      .from('profiles').select('id, full_name').in('id', requesterIds)
    requesterMap = Object.fromEntries((reqData || []).map((r: Pick<Profile, 'id' | 'full_name'>) => [r.id, r.full_name]))
  }

  const activeFilters = [
    searchParams.status, searchParams.priority,
    searchParams.category, searchParams.assigned, searchParams.q,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-bold tracking-widest uppercase">Diocese of Kalookan</div>
            <div className="text-white font-bold text-lg leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${item.href === '/admin/tickets' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                {item.label}
              </Link>
            ))}
            <div className="ml-4 pl-4 border-l border-white/10">
              <Link href="/api/auth/signout" className="text-slate-400 hover:text-white text-sm">Sign Out</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">All Tickets</h1>
            <p className="text-slate-500 mt-1">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}{activeFilters > 0 ? ` (${activeFilters} filter${activeFilters > 1 ? 's' : ''} active)` : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search title..."
              className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <select name="status" defaultValue={searchParams.status || ''} className="h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">All Statuses</option>
              {(Object.entries(TICKET_STATUS_LABELS) as [TicketStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="priority" defaultValue={searchParams.priority || ''} className="h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">All Priorities</option>
              {(Object.entries(TICKET_PRIORITY_LABELS) as [TicketPriority, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="category" defaultValue={searchParams.category || ''} className="h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="">All Categories</option>
              {(Object.entries(SERVICE_CATEGORY_LABELS) as [ServiceCategory, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 h-10 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">Filter</button>
              {activeFilters > 0 && (
                <Link href="/admin/tickets" className="h-10 px-3 flex items-center bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors">✕</Link>
              )}
            </div>
          </div>
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Ticket #', 'Title', 'Category', 'Requester', 'Assigned To', 'Status', 'Priority', 'Date', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-400">No tickets found.</td></tr>
                ) : tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-slate-700">{ticket.ticket_number}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:text-amber-600 transition-colors truncate block">{ticket.title}</Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><CategoryBadge category={ticket.category} /></td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{requesterMap[ticket.requester_id] || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {ticket.assigned_to
                        ? <span className="text-slate-700">{staffMap[ticket.assigned_to] || '—'}</span>
                        : <span className="text-slate-400 italic text-xs">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/admin/tickets/${ticket.id}`} className="text-xs font-semibold text-amber-600 hover:text-amber-700">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
