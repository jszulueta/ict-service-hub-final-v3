// app/(admin)/admin/tickets/[id]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, CategoryBadge, Alert } from '@/components/ui'
import type { Profile, Ticket, Comment, TicketStatus, TicketPriority } from '@/types/database'
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/types/database'
import { AdminTicketActions } from '@/components/admin/TicketActions'

export const metadata = { title: 'Ticket Detail' }

const ADMIN_NAV = [
  { href: '/admin',         label: 'Dashboard' },
  { href: '/admin/tickets', label: 'Tickets'   },
  { href: '/admin/users',   label: 'Users'     },
  { href: '/admin/audit',   label: 'Audit Logs'},
  { href: '/admin/spam',    label: 'Spam'      },
]

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileData } = await supabase
    .from('profiles').select('id, role, full_name').eq('id', user.id).single()
  const currentUser = profileData as Pick<Profile, 'id' | 'role' | 'full_name'> | null
  if (!currentUser || !['ict_staff', 'ict_admin', 'super_admin'].includes(currentUser.role)) redirect('/dashboard')

  const { data: ticketData } = await supabase
    .from('tickets').select('*').eq('id', id).single()
  const ticket = ticketData as Ticket | null
  if (!ticket) notFound()

  // Requester info
  const { data: requesterData } = await supabase
    .from('profiles').select('full_name, email, department, parish_office').eq('id', ticket.requester_id).single()
  const requester = requesterData as Pick<Profile, 'full_name' | 'email' | 'department' | 'parish_office'> | null

  // All staff for assignment dropdown
  const { data: staffData } = await supabase
    .from('profiles').select('id, full_name, role').in('role', ['ict_staff', 'ict_admin', 'super_admin'])
  const staff = (staffData || []) as Pick<Profile, 'id' | 'full_name' | 'role'>[]

  // Comments (all including internal)
  const { data: commentsData } = await supabase
    .from('comments').select('*, author:profiles!comments_author_id_fkey(full_name, role)')
    .eq('ticket_id', id).order('created_at', { ascending: true })
  const comments = (commentsData || []) as (Comment & { author: { full_name: string; role: string } })[]

  // Status history
  const { data: historyData } = await supabase
    .from('ticket_status_history').select('*').eq('ticket_id', id).order('created_at', { ascending: true })

  const assignee = ticket.assigned_to ? staff.find((s) => s.id === ticket.assigned_to) : null

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-400 font-bold tracking-widest uppercase">Diocese of Kalookan</div>
            <div className="text-white font-bold text-lg leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-1">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${item.href === '/admin/tickets' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
                {item.label}
              </Link>
            ))}
            <div className="ml-4 pl-4 border-l border-white/10">
              <Link href="/api/auth/signout" className="text-slate-400 hover:text-white text-sm">Sign Out</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-slate-900">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/tickets" className="hover:text-slate-900">Tickets</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 font-medium">{ticket.ticket_number}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Ticket header */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-mono text-sm font-bold text-slate-400">{ticket.ticket_number}</span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <CategoryBadge category={ticket.category} />
                {ticket.is_spam_flagged && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">🚫 Spam Flagged</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-4">{ticket.title}</h1>
              <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </div>

            {/* Event details */}
            {ticket.event_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-amber-900 mb-3">📅 Event Details</h3>
                <dl className="space-y-2 text-sm">
                  {ticket.event_name     && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Event:</dt><dd className="font-medium text-slate-800">{ticket.event_name}</dd></div>}
                  {ticket.event_date     && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Date:</dt><dd className="text-slate-800">{new Date(ticket.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>}
                  {ticket.event_location && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Venue:</dt><dd className="text-slate-800">{ticket.event_location}</dd></div>}
                  {ticket.event_notes   && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Notes:</dt><dd className="text-slate-800">{ticket.event_notes}</dd></div>}
                </dl>
              </div>
            )}

            {/* Archive link */}
            {ticket.external_archive_link && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-2">📎 Reference Files</h3>
                {ticket.archive_description && <p className="text-sm text-slate-500 mb-2">{ticket.archive_description}</p>}
                <a href={ticket.external_archive_link} target="_blank" rel="noopener noreferrer"
                  className="text-amber-600 hover:text-amber-700 underline text-sm break-all">{ticket.external_archive_link}</a>
              </div>
            )}

            {/* Resolution notes */}
            {ticket.resolution_notes && (
              <Alert variant="success" title="Resolution Notes">{ticket.resolution_notes}</Alert>
            )}

            {/* Admin actions (update status, assign, add comment) */}
            <AdminTicketActions
              ticketId={ticket.id}
              currentStatus={ticket.status}
              currentPriority={ticket.priority}
              currentAssignedTo={ticket.assigned_to}
              staff={staff}
              currentUserId={currentUser.id}
            />

            {/* Comments */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Comments & Internal Notes</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {comments.length === 0 ? (
                  <p className="px-6 py-8 text-center text-slate-400 text-sm">No comments yet.</p>
                ) : comments.map((c) => (
                  <div key={c.id} className={`px-6 py-4 ${c.is_internal ? 'bg-yellow-50' : ''}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">{c.author.full_name}</span>
                      {['ict_staff','ict_admin','super_admin'].includes(c.author.role) && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">ICT Team</span>
                      )}
                      {c.is_internal && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-bold">Internal Note</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Ticket info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Ticket Info</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Status</dt>
                  <dd><StatusBadge status={ticket.status} /></dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Priority</dt>
                  <dd><PriorityBadge priority={ticket.priority} /></dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Assigned To</dt>
                  <dd className="text-slate-700">{assignee?.full_name || <span className="text-slate-400 italic">Unassigned</span>}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Submitted</dt>
                  <dd className="text-slate-700">{new Date(ticket.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
                </div>
                {ticket.resolved_at && (
                  <div>
                    <dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Resolved</dt>
                    <dd className="text-slate-700">{new Date(ticket.resolved_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Requester info */}
            {requester && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Requester</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-slate-400 text-xs">Name</dt><dd className="font-medium text-slate-800">{requester.full_name}</dd></div>
                  <div><dt className="text-slate-400 text-xs">Email</dt><dd className="text-slate-700 break-all">{requester.email}</dd></div>
                  {requester.department    && <div><dt className="text-slate-400 text-xs">Department</dt><dd className="text-slate-700">{requester.department}</dd></div>}
                  {requester.parish_office && <div><dt className="text-slate-400 text-xs">Parish/Office</dt><dd className="text-slate-700">{requester.parish_office}</dd></div>}
                </dl>
              </div>
            )}

            {/* Status history */}
            {historyData && historyData.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Status History</h3>
                <div className="space-y-3">
                  {historyData.map((h: { id: string; old_status: string | null; new_status: string; created_at: string }) => (
                    <div key={h.id} className="flex items-start gap-2 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-slate-500">{h.old_status ? `${h.old_status} →` : 'Created as'} </span>
                        <span className="font-semibold text-slate-800">{h.new_status}</span>
                        <div className="text-slate-400">{new Date(h.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/admin/tickets" className="block text-center text-sm text-slate-500 hover:text-slate-900 py-2">← Back to All Tickets</Link>
          </div>
        </div>
      </main>
    </div>
  )
}