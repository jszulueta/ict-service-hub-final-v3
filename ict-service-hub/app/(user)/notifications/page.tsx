// app/(user)/notifications/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/ui'
import type { Profile, Notification } from '@/types/database'

export const metadata = { title: 'Notifications' }

// ─── Server Actions ───────────────────────────────────────────────────────────

async function markOneAsRead(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const supabase = await createSupabaseServerClient()
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  revalidatePath('/notifications')
}

async function markAllAsRead(formData: FormData) {
  'use server'
  const userId = formData.get('userId') as string
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  revalidatePath('/notifications')
}

async function viewTicket(formData: FormData) {
  'use server'
  const ticketId = formData.get('ticketId') as string
  const userId   = formData.get('userId')   as string
  const supabase = await createSupabaseServerClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('ticket_id', ticketId)
    .eq('user_id', userId)
    .eq('is_read', false)
  redirect(`/tickets/${ticketId}`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

// Keyed to the exact `type` values inserted in lib/actions/tickets.ts:
//   createTicket  → 'ticket_created'
//   updateTicket  → 'status_changed'  (when status changes)
// addComment creates no notification — Comments tab is therefore not shown.
const TYPE_META: Record<string, { icon: string; dotColor: string; labelColor: string }> = {
  ticket_created:  { icon: '📋', dotColor: 'bg-blue-400',    labelColor: 'text-blue-700'    },
  status_changed:  { icon: '🔄', dotColor: 'bg-gold-500',    labelColor: 'text-gold-700'    },
  ticket_assigned: { icon: '👤', dotColor: 'bg-violet-400',  labelColor: 'text-violet-700'  },
  ticket_resolved: { icon: '✅', dotColor: 'bg-emerald-400', labelColor: 'text-emerald-700' },
  ticket_closed:   { icon: '🔒', dotColor: 'bg-slate-400',   labelColor: 'text-slate-600'   },
  ticket_reopened: { icon: '🔓', dotColor: 'bg-rose-400',    labelColor: 'text-rose-700'    },
}
const FALLBACK_META = { icon: '🔔', dotColor: 'bg-slate-400', labelColor: 'text-navy-950' }

function getTypeMeta(type?: string) {
  return (type && TYPE_META[type]) || FALLBACK_META
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/auth/login')

  const { data: notifsData } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  const allNotifications = (notifsData || []) as Notification[]
  const unreadCount = allNotifications.filter((n) => !n.is_read).length

  const activeTab = tab || 'all'
  const filtered = allNotifications.filter((n) => {
    if (activeTab === 'unread')   return !n.is_read
    if (activeTab === 'tickets')  return n.type !== 'comment_added'
    if (activeTab === 'comments') return n.type === 'comment_added'
    return true
  })

  const TABS = [
    { key: 'all',      label: 'All'      },
    { key: 'unread',   label: 'Unread'   },
    { key: 'tickets',  label: 'Tickets'  },
    { key: 'comments', label: 'Comments' },
  ]

  return (
    <div className="min-h-screen bg-liturgical-white">

      {/* Nav */}
      <header className="bg-white border-b border-liturgical-muted sticky top-0 z-30 shadow-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-gold-600 font-bold tracking-wide">Diocese of Kalookan</div>
            <div className="text-navy-950 font-bold text-sm leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard"   className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">Dashboard</Link>
            <Link href="/tickets"     className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">My Tickets</Link>
            <Link href="/tickets/new" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">New Request</Link>
            <div className="relative ml-1">
              <Link
                href="/notifications"
                className="px-3 py-2 text-sm font-semibold text-navy-950 bg-navy-50 rounded flex items-center gap-1.5"
              >
                🔔 Notifications
                {unreadCount > 0 && (
                  <span className="h-4 min-w-[1rem] px-1 flex items-center justify-center rounded-full bg-gold-600 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <PageHeader
          title="Notifications"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : `${allNotifications.length} notification${allNotifications.length !== 1 ? 's' : ''}`
          }
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Notifications' }]}
          action={
            unreadCount > 0 ? (
              <form action={markAllAsRead}>
                <input type="hidden" name="userId" value={session.user.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 border border-navy-200 text-navy-950 px-5 py-2.5 rounded-btn font-semibold text-sm hover:bg-liturgical-cream transition-colors"
                >
                  ✓ Mark all as read
                </button>
              </form>
            ) : null
          }
        />

        {/* Filter tabs */}
        <div className="flex gap-1 bg-navy-50 border border-navy-200 rounded-card p-1 mb-6 w-fit">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/notifications?tab=${tab.key}`}
              className={`
                px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-1.5
                ${activeTab === tab.key
                  ? 'bg-white text-navy-950 shadow-card'
                  : 'text-slate-500 hover:text-navy-950 hover:bg-liturgical-cream'}
              `}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="h-4 min-w-[1rem] px-1 flex items-center justify-center rounded-full bg-gold-600 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Notification list */}
        <div className="bg-white rounded-card border border-liturgical-muted shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              icon={activeTab === 'unread' ? '✅' : '🔔'}
              title={
                activeTab === 'unread'
                  ? 'All caught up!'
                  : allNotifications.length === 0
                  ? 'No notifications yet'
                  : 'No read notifications'
              }
              description={
                allNotifications.length === 0
                  ? 'Notifications appear here when the ICT team updates or resolves your tickets.'
                  : activeTab === 'unread'
                  ? 'You have no unread notifications.'
                  : 'No notifications have been marked as read yet.'
              }
              action={
                allNotifications.length === 0 ? (
                  <Link
                    href="/tickets"
                    className="inline-flex items-center gap-2 bg-navy-950 text-white px-6 py-3 rounded-btn font-semibold hover:bg-navy-800 transition-colors"
                  >
                    View My Tickets
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-liturgical-muted">
              {filtered.map((n) => {
                const meta = getTypeMeta(n.type)
                return (
                  <div
                    key={n.id}
                    className={`relative flex items-start gap-4 px-6 py-5 transition-colors ${
                      !n.is_read ? 'bg-navy-50/40' : 'hover:bg-liturgical-cream'
                    }`}
                  >
                    {!n.is_read && (
                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full ${meta.dotColor}`} />
                    )}

                    <div
                      className="flex-shrink-0 h-10 w-10 rounded-full bg-navy-50 border border-navy-200 flex items-center justify-center text-xl"
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm font-semibold ${meta.labelColor}`}>{n.title}</p>
                        <span className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap font-mono">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                      {n.ticket_id && (
                        <form action={viewTicket} className="inline">
                          <input type="hidden" name="ticketId" value={n.ticket_id} />
                          <input type="hidden" name="userId"   value={session.user.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 hover:text-gold-700 hover:underline mt-1.5 transition-colors"
                          >
                            View ticket →
                          </button>
                        </form>
                      )}
                    </div>

                    {!n.is_read && (
                      <form action={markOneAsRead} className="flex-shrink-0 mt-0.5">
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          title="Mark as read"
                          className="h-7 w-7 rounded-full border border-navy-200 bg-white hover:bg-navy-950 hover:border-navy-950 hover:text-white text-slate-400 flex items-center justify-center text-xs transition-colors"
                        >
                          ✓
                        </button>
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-4">
            Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

      </main>
    </div>
  )
}