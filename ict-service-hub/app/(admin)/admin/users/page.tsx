// app/(admin)/admin/users/page.tsx
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, UserRole } from '@/types/database'
import { AdminUserActions } from '@/components/admin/UserActions'
import Navbar from '@/components/ui/navbar'

export const metadata = { title: 'User Management' }

const ROLE_BADGE: Record<UserRole, string> = {
  requester:   'bg-slate-100 text-slate-600',
  ict_staff:   'bg-blue-100 text-blue-700',
  ict_admin:   'bg-purple-100 text-purple-700',
  super_admin: 'bg-amber-100 text-amber-700',
}

const ROLE_LABELS: Record<UserRole, string> = {
  requester:   'Requester',
  ict_staff:   'ICT Staff',
  ict_admin:   'ICT Admin',
  super_admin: 'Super Admin',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>
  
}) {
  const params = await searchParams

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role' | 'full_name'> | null
  if (!profile) redirect('/auth/login')
  if (!['ict_admin', 'super_admin'].includes(profile.role)) redirect('/admin')

  // Fetch users — use admin client to bypass RLS
  const adminClient = createSupabaseAdminClient()
  let query = adminClient.from('profiles').select('*').order('created_at', { ascending: false })
  if (params.role) query = query.eq('role', params.role)
  if (params.q)    query = query.ilike('full_name', `%${params.q}%`)

  const { data: usersData } = await query
  const users = (usersData || []) as Profile[]

  const counts = {
    all:         users.length,
    requester:   users.filter((u) => u.role === 'requester').length,
    ict_staff:   users.filter((u) => u.role === 'ict_staff').length,
    ict_admin:   users.filter((u) => u.role === 'ict_admin').length,
    super_admin: users.filter((u) => u.role === 'super_admin').length,
    suspended:   users.filter((u) => u.is_suspended).length,
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">{users.length} total users</p>
        </div>

        {/* Role filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: `All (${counts.all})`,               href: '/admin/users',                  active: !params.role },
            { label: `Requesters (${counts.requester})`,  href: '/admin/users?role=requester',   active: params.role === 'requester' },
            { label: `ICT Staff (${counts.ict_staff})`,   href: '/admin/users?role=ict_staff',   active: params.role === 'ict_staff' },
            { label: `Admins (${counts.ict_admin})`,      href: '/admin/users?role=ict_admin',   active: params.role === 'ict_admin' },
            { label: `Suspended (${counts.suspended})`,   href: '/admin/users?suspended=true',   active: params.role === 'suspended' },
          ].map((tab) => (
            <Link key={tab.href} href={tab.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab.active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form method="GET" className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search by name..."
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 flex-1 max-w-xs bg-white"
          />
          <button type="submit" className="h-10 px-4 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">Search</button>
          {params.q && <Link href="/admin/users" className="h-10 px-4 flex items-center bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Clear</Link>}
        </form>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Name', 'Email', 'Department / Parish', 'Role', 'Status', 'Joined', 'Actions'].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">No users found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.is_suspended ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 whitespace-nowrap">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {[user.department, user.parish_office].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${ROLE_BADGE[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_suspended
                        ? <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Suspended</span>
                        : <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Active</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <AdminUserActions
                        userId={user.id}
                        currentRole={user.role}
                        isSuspended={user.is_suspended}
                        currentUserRole={profile.role}
                      />
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
