// app/(user)/tickets/[id]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, CategoryBadge, Alert, PageHeader } from '@/components/ui'
import type { Ticket, Comment, Profile } from '@/types/database'

export const metadata = { title: 'Ticket Details' }

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/auth/login')

  // Fetch ticket
  const { data: ticketData } = await supabase
    .from('tickets')
    .select(
      `
      *,
      requester:profiles!tickets_requester_id_fkey(full_name, email),
      assignee:profiles!tickets_assigned_to_fkey(full_name)
    `
    )
    .eq('id', id)
    .single()

  const ticket = ticketData as Ticket | null
  if (!ticket) notFound()

  // Fetch comments (same pattern as admin page)
  const { data: commentsData } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(full_name, role)')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  const commentList = (commentsData || []) as (Comment & {
    author: { full_name: string; role: string } | null
  })[]

  const t = ticket as Ticket & {
    requester: { full_name: string; email: string }
    assignee: { full_name: string } | null
  }

  const { data: notifsData, count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', session.user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-liturgical-white">
      <header className="bg-white border-b border-liturgical-muted sticky top-0 z-30 shadow-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-gold-600 font-bold tracking-wide">
              Diocese of Kalookan
            </div>
            <div className="text-navy-950 font-bold text-sm leading-none">
              ICT Service Hub
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">Dashboard</Link>
            <Link href="/tickets/new" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">New Request</Link>
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">My Tickets</Link>
            <div className="relative ml-2">
              <Link href="/notifications" className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" aria-label="Notifications">
                <span className="text-xl">🔔</span>
                {(unreadCount || 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold">
                    {(unreadCount || 0) > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title={t.ticket_number}
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'My Tickets', href: '/tickets' },
            { label: t.ticket_number },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-6">
              <h2 className="font-bold text-xl text-navy-950 mb-2">{t.title}</h2>

              <div className="flex flex-wrap gap-2 mb-4">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <CategoryBadge category={t.category} />
              </div>

              <p className="text-slate-700 whitespace-pre-wrap">{t.description}</p>
            </div>

            {/* COMMENTS */}
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold text-navy-950">Updates & Comments</h3>
              </div>

              <div className="divide-y divide-liturgical-muted">
                {commentList.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-slate-400 text-center">
                    No updates yet.
                  </p>
                ) : (
                  commentList.map((c) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* ✅ SAFE NULL HANDLING */}
                        <span className="text-sm font-semibold text-navy-950">
                          {c.author?.full_name ?? 'Unknown user'}
                        </span>

                        {['ict_staff', 'ict_admin', 'super_admin'].includes(
                          c.author?.role ?? ''
                        ) && (
                          <span className="text-xs bg-navy-50 text-navy-700 px-1.5 py-0.5 rounded border">
                            ICT Team
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {c.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-5">
              <h3 className="text-sm font-semibold uppercase mb-3 text-navy-950">
                Ticket Info
              </h3>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400 text-xs">Status</dt>
                  <dd><StatusBadge status={t.status} /></dd>
                </div>

                <div>
                  <dt className="text-slate-400 text-xs">Priority</dt>
                  <dd><PriorityBadge priority={t.priority} /></dd>
                </div>

                <div>
                  <dt className="text-slate-400 text-xs">Assigned To</dt>
                  <dd className="text-slate-700">
                    {t.assignee?.full_name ?? (
                      <span className="italic text-slate-400">Pending assignment</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/tickets"
              className="text-sm text-slate-500 hover:text-navy-950 block text-center"
            >
              ← Back to Tickets
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}