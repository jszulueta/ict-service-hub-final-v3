// app/auth/suspended/page.tsx
'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SuspendedPage() {
  const [signingOut, setSigningOut] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function signOutSuspendedUser() {
      try {
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Error signing out suspended user:', err)
      } finally {
        if (!cancelled) setSigningOut(false)
      }
    }

    signOutSuspendedUser()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-liturgical-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center bg-white rounded-card border border-red-200 shadow-card p-10">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="font-display text-2xl font-bold text-navy-950 mb-2">Account Suspended</h1>
        <p className="text-slate-600 mb-6">
          Your account has been suspended or deactivated. Please contact the ICT Department to resolve this.
        </p>
        <div className="text-sm text-slate-500 mb-6 space-y-1">
          <p>📧 <a href="mailto:ict@dioceseofkalookan.org" className="text-gold-600 hover:underline">ict@dioceseofkalookan.org</a></p>
        </div>
        {signingOut ? (
          <p className="text-xs text-slate-400 mb-4">Signing you out…</p>
        ) : (
          <Link href="/auth/login" className="text-sm text-navy-950 hover:text-gold-600 underline">
            Back to Sign In
          </Link>
        )}
      </div>
    </div>
  )
}
