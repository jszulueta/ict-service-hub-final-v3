// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RateLimitService } from '@/lib/services/rate-limit.service'

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
  '/guest',
]

const ADMIN_ROLES = ['ict_staff', 'ict_admin', 'super_admin']

// ── middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  try {
    const { pathname, searchParams } = request.nextUrl

    const isPrefetch =
      request.headers.get('purpose') === 'prefetch' ||
      request.headers.get('x-middleware-prefetch') === '1' ||
      request.headers.has('next-router-prefetch')

    const isRSC = request.headers.has('rsc')
    const isDataRequest = pathname.startsWith('/_next/data') || request.headers.has('x-nextjs-data')
    const isInternal = isPrefetch || isRSC || isDataRequest

    if (!isInternal) {
      const isAuthRoute = pathname.startsWith('/auth')
      const limit = isAuthRoute ? 60 : 300

      const rateLimitResult = await RateLimitService.checkRateLimit(request, isAuthRoute)

      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests. Please wait before trying again.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(rateLimitResult.reset / 1000)),
            },
          }
        )
      }
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
    const isAuthPage = pathname.startsWith('/auth') && pathname !== '/auth/callback'

    if (isPrefetch) {
      return supabaseResponse
    }

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user

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

    // ── Handle Unauthenticated Users ──────────────────────────────────────────
    if (!user) {
      if (isPublic) return supabaseResponse

      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      if (!isAuthPage) {
        loginUrl.searchParams.set('redirectTo', pathname)
      }

      const redirectRes = NextResponse.redirect(loginUrl)
      copyCookies(redirectRes)
      return redirectRes
    }

    // ── Handle Authenticated Users ────────────────────────────────────────────
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, is_suspended')
      .eq('id', user.id)
      .single()

    // 1. Handle Inactive/Suspended Accounts
    if (!profile || !profile.is_active || profile.is_suspended) {
      if (pathname === '/auth/suspended') return supabaseResponse
      
      const suspendedUrl = request.nextUrl.clone()
      suspendedUrl.pathname = '/auth/suspended'
      const redirectRes = NextResponse.redirect(suspendedUrl)
      copyCookies(redirectRes)
      return redirectRes
    }

    const userRole = profile.role as string

    // 2. Redirect away from Login/Signup if already authenticated
    if (isAuthPage && pathname !== '/auth/suspended') {
      const redirectTo = searchParams.get('redirectTo')
      const redirectUrl = request.nextUrl.clone()
      
      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
        redirectUrl.pathname = redirectTo
        redirectUrl.searchParams.delete('redirectTo')
      } else {
        redirectUrl.pathname = ADMIN_ROLES.includes(userRole) ? '/admin' : '/dashboard'
      }
      
      const redirectRes = NextResponse.redirect(redirectUrl)
      copyCookies(redirectRes)
      return redirectRes
    }

    // 3. RBAC Enforcement
    const isAdminRoute = pathname.startsWith('/admin')
    if (isAdminRoute && !ADMIN_ROLES.includes(userRole)) {
      const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url))
      copyCookies(redirectRes)
      return redirectRes
    }

    // 4. Redirect Admin from User Dashboard to Admin Portal
    if (pathname === '/dashboard' && ADMIN_ROLES.includes(userRole)) {
      const redirectRes = NextResponse.redirect(new URL('/admin', request.url))
      copyCookies(redirectRes)
      return redirectRes
    }

    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-role', userRole)
    supabaseResponse.headers.set('x-user-email', user.email || '')

    return supabaseResponse
  } catch (err) {
    console.error('middleware Critical Error:', err)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|icons|fonts|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|robots\\.txt|sitemap\\.xml).*)',
  ],
}
