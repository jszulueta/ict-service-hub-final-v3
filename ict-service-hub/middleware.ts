// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Route configuration ──────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/auth/suspended',
  '/auth/verify',
]

const ADMIN_ROLES = ['ict_staff', 'ict_admin', 'super_admin']

// ── In-memory rate limiter ───────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getRateLimitKey(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  return `rl:${ip}`
}

function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

function pruneRateLimitStore() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key)
  }
}

// ── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (Math.random() < 0.01) pruneRateLimitStore()

  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1' ||
    request.headers.has('next-router-prefetch')

  const isRSC = request.headers.has('rsc')
  const isDataRequest = pathname.startsWith('/_next/data') || request.headers.has('x-nextjs-data')
  const isInternal = isPrefetch || isRSC || isDataRequest

  if (!isInternal) {
    const isAuthRoute = pathname.startsWith('/auth')
    const rateLimitKey = getRateLimitKey(request)
    const limit = isAuthRoute ? 60 : 300

    const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, limit)

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please wait before trying again.',
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        }
      )
    }
  }

  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isPrefetch) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  const copyCookies = (targetResponse: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((c) => {
      targetResponse.cookies.set(c.name, c.value, {
        domain: c.domain,
        path: c.path,
        maxAge: c.maxAge,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })
    })
  }

  if (!user) {
    if (isPublic) return supabaseResponse

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirectTo', pathname)

    const redirectRes = NextResponse.redirect(loginUrl)
    copyCookies(redirectRes)
    return redirectRes
  }

  // If user is authenticated, we must also fetch their profile to check if they are active/suspended
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, is_suspended')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active || profile.is_suspended) {
    const suspendedUrl = request.nextUrl.clone()
    suspendedUrl.pathname = '/auth/suspended'
    const redirectRes = NextResponse.redirect(suspendedUrl)
    copyCookies(redirectRes)
    return redirectRes
  }

  const userRole = profile.role as string

  // Admin/User routing logic
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  if (isAdminRoute && !ADMIN_ROLES.includes(userRole)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    const redirectRes = NextResponse.redirect(redirectUrl)
    copyCookies(redirectRes)
    return redirectRes
  }

  if (pathname === '/dashboard' && ADMIN_ROLES.includes(userRole)) {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin'
    const redirectRes = NextResponse.redirect(adminUrl)
    copyCookies(redirectRes)
    return redirectRes
  }

  supabaseResponse.headers.set('x-user-id', user.id)
  supabaseResponse.headers.set('x-user-role', userRole)
  supabaseResponse.headers.set('x-user-email', user.email || '')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|robots\\.txt|sitemap\\.xml).*)',
  ],
}