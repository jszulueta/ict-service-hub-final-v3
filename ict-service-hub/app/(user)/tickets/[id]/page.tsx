// app/(user)/tickets/[id]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge, PriorityBadge, CategoryBadge, Alert, PageHeader } from '@/components/ui'
import type { Ticket, Comment } from '@/types/database'

export const metadata = { title: 'Ticket Details' }

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch ticket (RLS ensures user can only see their own)
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, requester:profiles!tickets_requester_id_fkey(full_name, email), assignee:profiles!tickets_assigned_to_fkey(full_name)')
    .eq('id', params.id)
    .single()

  if (!ticket) notFound()

  // Fetch non-internal comments only
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(full_name, role)')
    .eq('ticket_id', params.id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  const t = ticket as Ticket & { requester: { full_name: string }; assignee: { full_name: string } | null }
  const commentList = (comments || []) as (Comment & { author: { full_name: string; role: string } })[]

  return (
    <div className="min-h-screen bg-liturgical-white">
      <header className="bg-white border-b border-liturgical-muted sticky top-0 z-30 shadow-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <div className="text-xs text-gold-600 font-bold tracking-wide">Diocese of Kalookan</div>
            <div className="text-navy-950 font-bold text-sm leading-none">ICT Service Hub</div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">Dashboard</Link>
            <Link href="/tickets" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-navy-950 rounded hover:bg-liturgical-cream transition-colors">My Tickets</Link>
            <Link href="/api/auth/signout" className="ml-2 text-sm text-slate-400 hover:text-slate-600">Sign Out</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          title={t.ticket_number}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Tickets', href: '/tickets' }, { label: t.ticket_number }]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-6">
              <h2 className="font-display text-xl font-bold text-navy-950 mb-1">{t.title}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <CategoryBadge category={t.category} />
              </div>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{t.description}</p>
            </div>

            {/* Event details */}
            {t.event_name && (
              <div className="bg-gold-50 border border-gold-200 rounded-card p-5">
                <h3 className="font-semibold text-gold-900 mb-3 flex items-center gap-2">📅 Event Details</h3>
                <dl className="space-y-2 text-sm">
                  {t.event_name && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Event:</dt><dd className="text-slate-800 font-medium">{t.event_name}</dd></div>}
                  {t.event_date && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Date:</dt><dd className="text-slate-800">{new Date(t.event_date).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>}
                  {t.event_location && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Venue:</dt><dd className="text-slate-800">{t.event_location}</dd></div>}
                  {t.event_notes && <div className="flex gap-2"><dt className="text-slate-500 w-24 flex-shrink-0">Notes:</dt><dd className="text-slate-800">{t.event_notes}</dd></div>}
                </dl>
              </div>
            )}

            {/* Archive link */}
            {t.external_archive_link && (
              <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-5">
                <h3 className="font-semibold text-navy-950 mb-2 flex items-center gap-2">📎 Reference Files</h3>
                {t.archive_description && <p className="text-sm text-slate-500 mb-2">{t.archive_description}</p>}
                <a href={t.external_archive_link} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:text-gold-700 underline text-sm break-all">
                  {t.external_archive_link}
                </a>
              </div>
            )}

            {/* Resolution notes */}
            {t.resolution_notes && (
              <Alert variant="success" title="Resolution Notes">
                {t.resolution_notes}
              </Alert>
            )}

            {/* Comments */}
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card">
              <div className="px-6 py-4 border-b border-liturgical-muted">
                <h3 className="font-semibold text-navy-950">Updates & Comments</h3>
              </div>
              <div className="divide-y divide-liturgical-muted">
                {commentList.length === 0 ? (
                  <p className="px-6 py-8 text-center text-slate-400 text-sm">No updates yet. The ICT team will post updates here.</p>
                ) : commentList.map((c) => (
                  <div key={c.id} className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-navy-950">{c.author.full_name}</span>
                      {['ict_staff','ict_admin','super_admin'].includes(c.author.role) && (
                        <span className="text-xs bg-navy-50 text-navy-700 px-1.5 py-0.5 rounded font-medium border border-navy-200">ICT Team</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
            <div className="bg-white rounded-card border border-liturgical-muted shadow-card p-5">
              <h3 className="font-semibold text-navy-950 mb-3 text-sm uppercase tracking-wide">Ticket Info</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Status</dt><dd><StatusBadge status={t.status} /></dd></div>
                <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Priority</dt><dd><PriorityBadge priority={t.priority} /></dd></div>
                <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Assigned To</dt><dd className="text-slate-700">{t.assignee?.full_name || <span className="text-slate-400 italic">Pending assignment</span>}</dd></div>
                <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Submitted</dt><dd className="text-slate-700">{new Date(t.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>
                <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-0.5">Last Updated</dt><dd className="text-slate-700">{new Date(t.updated_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>
              </dl>
            </div>

            <Link href="/tickets" className="block text-center text-sm text-slate-500 hover:text-navy-950 transition-colors py-2">
              ← Back to My Tickets
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
