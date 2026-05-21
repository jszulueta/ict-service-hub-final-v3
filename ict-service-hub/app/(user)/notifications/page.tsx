// app/(user)/notifications/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Notification } from '@/types/database'

export const metadata = { title: 'Notifications' }

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

const TYPE_META: Record<string, { icon: string; dotColor: string; labelColor: string }> = {
  ticket_created:  { icon: '📋', dotColor: 'bg-blue-500',    labelColor: 'text-blue-700'    },
  ticket_updated:  { icon: '🔄', dotColor: 'bg-amber-500',   labelColor: 'text-amber-700'   },
  ticket_assigned: { icon: '👤', dotColor: 'bg-violet-500',  labelColor: 'text-violet-700'  },
  ticket_resolved: { icon: '✅', dotColor: 'bg-emerald-500', labelColor: 'text-emerald-700' },
  ticket_closed:   { icon: '🔒', dotColor: 'bg-slate-400',   labelColor: 'text-slate-600'   },
  ticket_reopened: { icon: '🔓', dotColor: 'bg-rose-500',    labelColor: 'text-rose-700'    },
  comment_added:   { icon: '💬', dotColor: 'bg-sky-500',     labelColor: 'text-sky-700'     },
}
const FALLBACK_META = { icon: '🔔', dotColor: 'bg-slate-400', labelColor: 'text-slate-700' }

function getTypeMeta(type?: string) {
  return (type && TYPE_META[type]) || FALLBACK_META
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
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

  const activeTab = searchParams.tab || 'all'
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
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-amber-400 font-bold text-sm">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-amber-600 font-bold tracking-wide">Diocese of Kalookan</div>
              <div className="text-slate-900 font-bold text-sm leading-none">ICT Service Hub</div>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-100 rounded">Dashboard</Link>
            <Link href="/tickets/new" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors">New Request</Link>
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors">My Tickets</Link>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page heading */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'All caught up'}{' '}
              · {profile.parish_office || profile.department || 'ICT Service Portal'}
            </p>
          </div>

          {unreadCount > 0 && (
            <form action={markAllAsRead}>
              <input type="hidden" name="userId" value={session.user.id} />
              <button
                type="submit"
                className="text-sm font-semibold text-amber-600 hover:text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors border border-amber-200"
              >
                Mark all as read
              </button>
            </form>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/notifications?tab=${tab.key}`}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">
                {activeTab === 'unread' ? '✅' : '🔔'}
              </span>
              <p className="text-slate-500 text-sm font-medium">
                {activeTab === 'unread'
                  ? 'All caught up! No unread notifications.'
                  : 'No notifications to show.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((n) => {
                const meta = getTypeMeta(n.type)
                return (
                  <div
                    key={n.id}
                    className={`relative flex items-start gap-4 px-6 py-4 transition-colors ${
                      !n.is_read ? 'bg-blue-50/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    {!n.is_read && (
                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full ${meta.dotColor}`} />
                    )}

                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl">
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm font-semibold ${meta.labelColor}`}>{n.title}</p>
                        <span className="flex-shrink-0 text-xs text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                      {n.ticket_id && (
                        <Link
                          href={`/tickets/${n.ticket_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline mt-1.5 transition-colors"
                        >
                          View ticket →
                        </Link>
                      )}
                    </div>

                    {!n.is_read && (
                      <form action={markOneAsRead} className="flex-shrink-0 mt-0.5">
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          title="Mark as read"
                          className="h-7 w-7 rounded-full border border-slate-200 bg-white hover:bg-amber-600 hover:border-amber-600 hover:text-white text-slate-400 flex items-center justify-center text-xs transition-colors"
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