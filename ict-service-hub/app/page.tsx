// app/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('profiles')
    .select('role, is_active, is_suspended')
    .eq('id', user.id)
    .single()

  const profile = data as Pick<Profile, 'role' | 'is_active' | 'is_suspended'> | null

  if (!profile || !profile.is_active || profile.is_suspended) {
    redirect('/auth/suspended')
  }

  if (['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  redirect('/dashboard')
}
