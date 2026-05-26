// app/(admin)/admin/spam/page.tsx
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Ticket } from '@/types/database'
import Navbar from '@/components/ui/navbar'

export const metadata = { title: 'Spam Monitoring' }

export default async function SpamPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null
  if (!profile) redirect('/auth/login')
  if (!['ict_admin', 'super_admin'].includes(profile.role)) redirect('/admin')

  const adminClient = createSupabaseAdminClient()

  // Flagged tickets
  const { data: spamData } = await adminClient
    .from('tickets')
    .select('id, ticket_number, title, category, created_at, requester_id, spam_reason, ip_address')
    .eq('is_spam_flagged', true)
    .order('created_at', { ascending: false })
  const spamTickets = (spamData || []) as Ticket[]

  // Spam audit log entries
  const { data: spamLogsData } = await adminClient
    .from('audit_logs')
    .select('*')
    .eq('action', 'spam_flagged')
    .order('created_at', { ascending: false })
    .limit(50)

  // Requester names
  const requesterIds = [...new Set(spamTickets.map((t) => t.requester_id))]
  let requesterMap: Record<string, string> = {}
  if (requesterIds.length > 0) {
    const { data: rData } = await adminClient.from('profiles').select('id, full_name, email').in('id', requesterIds)
    requesterMap = Object.fromEntries((rData || []).map((r: Pick<Profile, 'id' | 'full_name'>) => [r.id, r.full_name]))
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Spam Monitoring</h1>
          <p className="text-slate-500 mt-1">Tickets flagged by the anti-spam system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{spamTickets.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Flagged Tickets</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{spamLogsData?.length || 0}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Spam Events (last 50)</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {new Set(spamTickets.map((t) => t.ip_address)).size}
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">Unique IPs</div>
          </div>
        </div>

        {/* How rate limiting works */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-amber-900 mb-2">⚙️ How Anti-Spam Works</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Max <strong>5 tickets per user</strong> per hour</li>
            <li>• Max <strong>8 tickets per IP address</strong> per hour</li>
            <li>• Max <strong>60 requests per minute</strong> per IP (all routes)</li>
            <li>• Max <strong>15 auth requests per minute</strong> per IP (login/signup)</li>
          </ul>
        </div>

        {/* Flagged tickets table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Flagged Tickets</h2>
            <span className="text-xs text-slate-500">{spamTickets.length} tickets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Ticket #', 'Title', 'Requester', 'IP Address', 'Reason', 'Date', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {spamTickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">✅ No spam-flagged tickets.</td></tr>
                ) : spamTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{ticket.ticket_number}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[160px] truncate">{ticket.title}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{requesterMap[ticket.requester_id] || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{ticket.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-xs text-red-600">{ticket.spam_reason || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/tickets/${ticket.id}`} className="text-xs font-semibold text-amber-600 hover:text-amber-700">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spam audit events */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-900">Recent Spam Events</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {(spamLogsData || []).length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400">No spam events logged.</p>
            ) : (spamLogsData || []).map((log: AuditLog) => (
              <div key={log.id} className="px-6 py-3 flex items-center gap-4 text-sm">
                <span className="text-slate-400 text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-slate-600 truncate">{log.actor_email || 'Unknown'}</span>
                <span className="font-mono text-xs text-slate-400">{log.ip_address || '—'}</span>
                <span className="text-red-600 text-xs truncate">{(log.new_values as { reason?: string })?.reason || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// local type for audit logs in this file
interface AuditLog {
  id: string
  actor_email: string | null
  action: string
  ip_address: string | null
  new_values: Record<string, unknown> | null
  created_at: string
}
