// app/api/admin/users/role/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types/database'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role'> | null
  if (!profile || !['ict_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await req.json() as { userId: string; role: UserRole }
  const validRoles: UserRole[] = ['requester', 'ict_staff', 'ict_admin', 'super_admin']
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  // Only super_admin can assign super_admin role
  if (role === 'super_admin' && profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('audit_logs').insert({
    actor_id:    user.id,
    actor_email: user.email,
    action:      'user_role_changed' as const,
    resource:    'user',
    resource_id: userId,
    new_values:  { role },
  })

  return NextResponse.json({ success: true })
}
