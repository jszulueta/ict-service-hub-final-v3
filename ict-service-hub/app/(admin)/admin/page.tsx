// app/(admin)/admin/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, CategoryBadge, StatsCard } from '@/components/ui'
import { AdminUsageMonitor } from '@/components/admin/UsageMonitor'
import type { Profile, Ticket } from '@/types/database'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null

  if (!profile || !['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const [ticketsRes, usersRes, pendingRes, urgentRes, recentRes, spamRes, unassignedRes] =
    await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'requester'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('priority', 'urgent').not('status', 'in', '("resolved","closed","cancelled")'),
      supabase.from('tickets').select('id, ticket_number, title, category, status, priority, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('is_spam_flagged', true),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).is('assigned_to', null).not('status', 'in', '("resolved","closed","cancelled")'),
    ])

  const stats = {
    totalTickets:   ticketsRes.count    || 0,
    totalUsers:     usersRes.count      || 0,
    pendingTickets: pendingRes.count    || 0,
    urgentTickets:  urgentRes.count     || 0,
    spamFlagged:    spamRes.count       || 0,
    unassigned:     unassignedRes.count || 0,
  }

  const recentTickets = (recentRes.data || []) as Ticket[]

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Admin Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-amber-400 font-bold tracking-widest uppercase">Diocese of Kalookan</div>
                <div className="text-white font-bold text-lg leading-none">ICT Service Hub</div>
              </div>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 text-xs font-bold border border-amber-600/30">
                Admin Portal
              </span>
            </div>
            <nav className="flex items-center gap-1">
              {[
                { href: '/admin',         label: 'Dashboard', active: true },
                { href: '/admin/tickets', label: 'Tickets'               },
                { href: '/admin/users',   label: 'Users'                 },
                { href: '/admin/audit',   label: 'Audit Logs'            },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${item.active ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                  {item.label}
                </Link>
              ))}
              <div className="ml-4 pl-4 border-l border-white/10 flex items-center gap-2">
                <span className="text-slate-300 text-sm hidden md:block">{profile.full_name}</span>
                <Link href="/api/auth/signout" className="text-slate-400 hover:text-white text-sm">Sign Out</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of ICT service requests and team workload.</p>
        </div>

        {/* Urgent alert */}
        {stats.urgentTickets > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-4">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold text-red-800">{stats.urgentTickets} Urgent Ticket{stats.urgentTickets > 1 ? 's' : ''} Require Immediate Attention</p>
              <Link href="/admin/tickets?priority=urgent" className="text-red-600 text-sm underline">View urgent tickets →</Link>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard label="Total Tickets"  value={stats.totalTickets}   icon="🎟️" color="navy"  />
          <StatsCard label="Pending"        value={stats.pendingTickets} icon="⏳"  color="gold"  />
          <StatsCard label="Unassigned"     value={stats.unassigned}     icon="📥"  color="gold"  />
          <StatsCard label="Urgent"         value={stats.urgentTickets}  icon="🚨"  color="red"   />
          <StatsCard label="Requesters"     value={stats.totalUsers}     icon="👥"  color="green" />
          <StatsCard label="Spam Flagged"   value={stats.spamFlagged}    icon="🚫"  color="red"   />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { href: '/admin/tickets?status=pending', label: 'Pending Review', icon: '⏳', count: stats.pendingTickets },
            { href: '/admin/tickets?assigned=none',  label: 'Unassigned',     icon: '📥', count: stats.unassigned    },
            { href: '/admin/users',                  label: 'Manage Users',   icon: '👥', count: stats.totalUsers    },
            { href: '/admin/spam',                   label: 'Spam Reports',   icon: '🚫', count: stats.spamFlagged   },
          ].map((a) => (
            <Link key={a.href} href={a.href}
              className="group flex flex-col gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xl">{a.icon}</span>
                <span className="text-lg font-bold text-slate-900">{a.count}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent tickets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Recent Tickets</h2>
            <Link href="/admin/tickets" className="text-sm text-amber-600 hover:text-amber-700 font-semibold">View All →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Ticket #', 'Subject', 'Category', 'Status', 'Priority', 'Date'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No tickets yet.</td></tr>
                ) : recentTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-mono text-xs font-bold text-slate-900 hover:text-amber-600">{ticket.ticket_number}</Link>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <Link href={`/admin/tickets/${ticket.id}`} className="text-slate-900 hover:text-amber-600 font-medium truncate block">{ticket.title}</Link>
                    </td>
                    <td className="px-4 py-3"><CategoryBadge category={ticket.category} /></td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage monitor */}
        <div className="max-w-lg">
          <AdminUsageMonitor />
        </div>
      </main>
    </div>
  )
}
