// app/api/admin/users/suspend/route.ts
import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileData as Pick<Profile, 'role'> | null
  if (!profile || !['ict_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, suspend } = await req.json() as { userId: string; suspend: boolean }

  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ is_suspended: suspend, suspension_reason: suspend ? 'Suspended by admin' : null })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('audit_logs').insert({
    actor_id:    user.id,
    actor_email: user.email,
    action:      'user_suspended' as const,
    resource:    'user',
    resource_id: userId,
    new_values:  { is_suspended: suspend },
  })

  return NextResponse.json({ success: true })
}
