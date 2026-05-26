// app/(admin)/admin/audit/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile, AuditLog } from '@/types/database'
import Navbar from '@/components/ui/navbar'

export const metadata = { title: 'Audit Logs' }

const ACTION_COLORS: Record<string, string> = {
  ticket_created:   'bg-green-100 text-green-700',
  ticket_updated:   'bg-blue-100 text-blue-700',
  ticket_assigned:  'bg-purple-100 text-purple-700',
  status_changed:   'bg-amber-100 text-amber-700',
  comment_added:    'bg-slate-100 text-slate-600',
  user_role_changed:'bg-orange-100 text-orange-700',
  user_suspended:   'bg-red-100 text-red-700',
  spam_flagged:     'bg-red-100 text-red-700',
  ticket_deleted:   'bg-red-100 text-red-700',
  login_attempt:    'bg-slate-100 text-slate-500',
}

export default async function AuditLogsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null
  if (!profile) redirect('/auth/login')
  else if (!['ict_admin', 'super_admin'].includes(profile.role)) redirect('/admin')

  const { data: logsData } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const logs = (logsData || []) as AuditLog[]

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 mt-1">Last {logs.length} system events — showing admins and staff actions only</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Time', 'Actor', 'Action', 'Resource', 'Details'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-slate-400">No audit logs yet.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                      {log.actor_email || <span className="text-slate-400 italic">System</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {log.resource && <span className="capitalize">{log.resource}</span>}
                      {log.resource_id && <span className="text-slate-400 ml-1 font-mono">{log.resource_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                      {log.new_values ? (
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {JSON.stringify(log.new_values).slice(0, 80)}
                        </code>
                      ) : '—'}
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
