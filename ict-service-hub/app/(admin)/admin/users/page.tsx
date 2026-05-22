// app/(admin)/admin/users/page.tsx
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, UserRole } from '@/types/database'
import { AdminUserActions } from '@/components/admin/UserActions'

export const metadata = { title: 'User Management' }

const ADMIN_NAV = [
  { href: '/admin',         label: 'Dashboard' },
  { href: '/admin/tickets', label: 'Tickets'   },
  { href: '/admin/users',   label: 'Users'     },
  { href: '/admin/audit',   label: 'Audit Logs'},
  { href: '/admin/spam',    label: 'Spam'      },
]

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
  searchParams: { role?: string; q?: string }
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const currentUser = profileData as Pick<Profile, 'role'> | null
  if (!currentUser || !['ict_admin', 'super_admin'].includes(currentUser.role)) redirect('/admin')

  // Fetch users — use admin client to bypass RLS
  const adminClient = createSupabaseAdminClient()
  let query = adminClient.from('profiles').select('*').order('created_at', { ascending: false })
  if (searchParams.role) query = query.eq('role', searchParams.role)
  if (searchParams.q)    query = query.ilike('full_name', `%${searchParams.q}%`)

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
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-bold tracking-widest uppercase">Diocese of Kalookan</div>
            <div className="text-white font-bold text-lg leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${item.href === '/admin/users' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">{users.length} total users</p>
        </div>

        {/* Role filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { label: `All (${counts.all})`,               href: '/admin/users',                  active: !searchParams.role },
            { label: `Requesters (${counts.requester})`,  href: '/admin/users?role=requester',   active: searchParams.role === 'requester' },
            { label: `ICT Staff (${counts.ict_staff})`,   href: '/admin/users?role=ict_staff',   active: searchParams.role === 'ict_staff' },
            { label: `Admins (${counts.ict_admin})`,      href: '/admin/users?role=ict_admin',   active: searchParams.role === 'ict_admin' },
            { label: `Suspended (${counts.suspended})`,   href: '/admin/users?suspended=true',   active: searchParams.role === 'suspended' },
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
            defaultValue={searchParams.q}
            placeholder="Search by name..."
            className="h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 flex-1 max-w-xs bg-white"
          />
          <button type="submit" className="h-10 px-4 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors">Search</button>
          {searchParams.q && <Link href="/admin/users" className="h-10 px-4 flex items-center bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50">Clear</Link>}
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
                    <td className="px-4 py-3">
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
                        currentUserRole={currentUser.role}
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
