'use client'
// app/auth/signup/page.tsx

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/lib/validations/schemas'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button, Field, Input, Alert } from '@/components/ui'
import Link from 'next/link'
import { hashPassword } from '@/lib/utility/crypto'

export default function SignupPage() {
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setServerError(null)
    const supabase = createSupabaseBrowserClient()
    const hashedPassword = await hashPassword(data.password)

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: hashedPassword,
      options: {
        data: {
          full_name: data.full_name,
          department: data.department,
          parish_office: data.parish_office,
          phone: data.phone
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('[Signup error]', error.message, error.status, error)

      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setServerError('This email is already registered. Please sign in or reset your password.')
      } else if (error.message.includes('Password should be')) {
        setServerError('Password must be at least 6 characters.')
      } else if (error.message.includes('Unable to validate email')) {
        setServerError('Please enter a valid email address.')
      } else if (error.message.includes('Email rate limit exceeded') || error.status === 429) {
        setServerError('Too many signup attempts. Please wait a few minutes and try again.')
      } else if (error.status === 0 || error.message.includes('fetch')) {
        setServerError('Cannot connect to the server. Check your internet connection and that NEXT_PUBLIC_SUPABASE_URL is set correctly in .env.local.')
      } else {
        setServerError(`Signup failed: ${error.message}`)
      }
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-liturgical-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white rounded-card border border-green-200 shadow-card p-10">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="font-display text-2xl font-bold text-navy-950 mb-2">Account Created!</h2>
          <p className="text-slate-600 mb-6">
            Your account has been successfully created! You may now proceed to logging in your account.
          </p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 bg-navy-950 text-white px-6 py-3 rounded-btn font-semibold hover:bg-navy-800 transition-colors">
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-liturgical-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <p className="text-gold-600 font-bold text-xs tracking-widest uppercase mb-1">Diocese of Kalookan</p>
          <h1 className="font-display text-3xl font-bold text-navy-950">Create an Account</h1>
          <p className="text-slate-500 mt-2">Register to submit ICT and media service requests</p>
        </div>

        <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-8">
          {serverError && (
            <div className="mb-5">
              <Alert variant="error" onDismiss={() => setServerError(null)}>{serverError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Field label="Full Name" htmlFor="full_name" error={errors.full_name?.message} required>
              <Input id="full_name" placeholder="e.g. Juan dela Cruz" error={!!errors.full_name} {...register('full_name')} />
            </Field>

            <Field label="Email Address" htmlFor="email" error={errors.email?.message} required>
              <Input id="email" type="email" placeholder="you@dioceseofkalookan.org" error={!!errors.email} {...register('email')} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department" htmlFor="department" error={errors.department?.message}>
                <Input id="department" placeholder="e.g. Finance Office" error={!!errors.department} {...register('department')} />
              </Field>
              <Field label="Parish / Office" htmlFor="parish_office" error={errors.parish_office?.message}>
                <Input id="parish_office" placeholder="e.g. Cathedral Parish" error={!!errors.parish_office} {...register('parish_office')} />
              </Field>
            </div>

            <Field label="Phone Number" htmlFor="phone" error={errors.phone?.message}
              hint="Optional — for urgent follow-ups">
              <Input id="phone" type="tel" placeholder="e.g. 09XX-XXX-XXXX" error={!!errors.phone} {...register('phone')} />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password?.message}
              hint="At least 6 characters, one uppercase letter, one number" required>
              <Input id="password" type="password" autoComplete="new-password" placeholder="Create a strong password" error={!!errors.password} {...register('password')} />
            </Field>

            <Field label="Confirm Password" htmlFor="confirm_password" error={errors.confirm_password?.message} required>
              <Input id="confirm_password" type="password" autoComplete="new-password" placeholder="Repeat your password" error={!!errors.confirm_password} {...register('confirm_password')} />
            </Field>

            <Button type="submit" variant="gold" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? 'Creating Account…' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-600 hover:text-gold-700 font-semibold">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
