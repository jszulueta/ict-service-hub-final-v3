'use client'
// app/auth/login/page.tsx

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/schemas'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button, Field, Input, Alert } from '@/components/ui'
import Link from 'next/link'
import { hashPassword } from '@/lib/utility/crypto'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    const supabase = createSupabaseBrowserClient()
    const hashedPassword = await hashPassword(data.password)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: hashedPassword,
    })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setServerError('Please confirm your email address before logging in. Check your inbox.')
      } else if (error.message.includes('Invalid login')) {
        setServerError('Incorrect email or password. Please try again.')
      } else {
        setServerError('Unable to sign in. Please try again.')
      }
      return
    }

    router.refresh()
    router.push(redirectTo)
  }

  return (
    <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-8">
      {serverError && (
        <div className="mb-5">
          <Alert variant="error" onDismiss={() => setServerError(null)}>{serverError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Email Address" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@dioceseofkalookan.org"
            error={!!errors.email}
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={!!errors.password}
            {...register('password')}
          />
        </Field>

        <div className="flex justify-end">
          <Link href="/auth/forgot-password" prefetch={false} className="text-sm text-gold-600 hover:text-gold-700 font-medium">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" prefetch={false} className="text-gold-600 hover:text-gold-700 font-semibold">
          Sign up here
        </Link>
      </p>
    </div>
  )
}

// 2. Wrap the form in a Suspense boundary in the default export
export default function LoginPage() {
  return (
    <div className="flex flex-grow items-center justify-center px-4">
      <div className="w-full max-w-md pt-24 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-gold-600 font-bold text-xs tracking-widest uppercase mb-1">Diocese of Kalookan</p>
          <h1 className="font-display text-3xl font-bold text-navy-950">ICT Service Hub</h1>
          <p className="text-slate-500 mt-2">Sign in to access the portal</p>
        </div>

        {/* The Suspense Boundary */}
        <Suspense fallback={
          <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-8 flex justify-center text-slate-400 text-sm">
            Loading form...
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 mt-6">
          For ICT support, contact ict@dioceseofkalookan.org
        </p>
      </div>
    </div>
  )
}