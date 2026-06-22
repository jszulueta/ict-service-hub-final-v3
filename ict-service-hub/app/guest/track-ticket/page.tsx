"use client"

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Search, Loader2, Package, Clock, CheckCircle2, AlertCircle, Calendar, MessageSquare, Send } from 'lucide-react'
import { addGuestComment } from './actions'

type TicketStatus = 'pending' | 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'cancelled'

interface TicketData {
  id: string
  ticket_number: string
  title: string
  description: string
  category: string
  status: TicketStatus
  priority: string
  guest_name: string
  created_at: string
  resolution_notes?: string
}

interface TicketHistory {
  old_status: string | null
  new_status: string
  created_at: string
}

interface TicketComment {
  id: string
  body: string
  created_at: string
  guest_name: string | null
  author: {
    full_name: string
    role: string
  } | null
}

export default function GuestTrackTicket() {
  const [ticketNumber, setTicketNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [ticketResult, setTicketResult] = useState<{ ticket: TicketData, history: TicketHistory[], comments: TicketComment[] } | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!ticketNumber.trim()) return

    setIsSearching(true)
    setError(null)
    setTicketResult(null)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Call the RPC function we defined in the SQL schema
      const { data, error: rpcError } = await supabase.rpc('get_guest_ticket', {
        p_ticket_number: ticketNumber.trim().toUpperCase()
      })

      if (rpcError) {
        throw new Error('Failed to retrieve ticket. Please check your tracking number and try again.')
      }

      if (!data) {
        setError('No ticket found with that tracking number. Note: Only guest tickets can be tracked here.')
      } else {
        setTicketResult(data as any)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!commentBody.trim() || !ticketResult) return

    setIsCommenting(true)
    setCommentError(null)

    try {
      await addGuestComment(ticketResult.ticket.ticket_number, commentBody)
      setCommentBody('')
      
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data } = await supabase.rpc('get_guest_ticket', {
        p_ticket_number: ticketResult.ticket.ticket_number
      })
      if (data) {
        setTicketResult(data as any)
      }
    } catch (err: any) {
      console.error(err)
      setCommentError(err.message || 'Failed to add comment.')
    } finally {
      setIsCommenting(false)
    }
  }

  const getStatusBadge = (status: TicketStatus) => {
    const statusConfig = {
      pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending' },
      open: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Open' },
      in_progress: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'In Progress' },
      on_hold: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'On Hold' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Resolved' },
      closed: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Closed' },
      cancelled: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Cancelled' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl animate-fade-in">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-display font-bold text-slate-900 mb-3">Track Your Ticket</h1>
        <p className="text-slate-600">Enter your tracking number (e.g. TKT-24-00001) to check the real-time status of your request.</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Package className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
            placeholder="TKT-YY-XXXXX"
            className="w-full pl-12 pr-32 py-4 rounded-xl border-slate-300 focus:border-brand-500 focus:ring-brand-500 shadow-sm text-lg font-mono uppercase bg-white"
          />
          <button
            type="submit"
            disabled={isSearching || !ticketNumber}
            className="absolute right-2 top-2 bottom-2 bg-brand-600 text-white px-6 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Track</span>
          </button>
        </form>
        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {ticketResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Ticket Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-2xl font-bold text-brand-700 font-mono mb-1">{ticketResult.ticket.ticket_number}</h2>
                  <p className="text-slate-500 text-sm flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> 
                    Requested on {new Date(ticketResult.ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  {getStatusBadge(ticketResult.ticket.status)}
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</h3>
                  <p className="text-lg font-medium text-slate-900">{ticketResult.ticket.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{ticketResult.ticket.description}</p>
                </div>
                
                {ticketResult.ticket.resolution_notes && (
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-5 mt-6">
                    <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4" /> Resolution Notes
                    </h3>
                    <p className="text-green-900">{ticketResult.ticket.resolution_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 mt-8">
              <h3 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
                Discussion
              </h3>
              
              <div className="space-y-6 mb-6">
                {ticketResult.comments && ticketResult.comments.length > 0 ? (
                  ticketResult.comments.map((comment) => (
                    <div key={comment.id} className={`flex flex-col ${comment.author ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${comment.author ? 'bg-slate-50 border border-slate-200 rounded-tl-sm' : 'bg-brand-50 border border-brand-100 rounded-tr-sm'}`}>
                        <div className={`flex items-center gap-2 mb-1 ${comment.author ? '' : 'justify-end'}`}>
                          <span className="font-semibold text-sm text-slate-900">
                            {comment.author ? comment.author.full_name : (comment.guest_name || 'Guest')}
                          </span>
                          {comment.author && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                              Staff
                            </span>
                          )}
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-slate-700 whitespace-pre-wrap text-sm ${comment.author ? '' : 'text-right'}`}>{comment.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No comments yet. Send a message to start a discussion.</p>
                )}
              </div>

              {/* Comment Form */}
              <form onSubmit={handleAddComment} className="relative">
                {commentError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    {commentError}
                  </div>
                )}
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Type a message to the support team..."
                  className="w-full min-h-[100px] rounded-xl border-slate-300 focus:border-brand-500 focus:ring-brand-500 shadow-sm resize-y p-4 pr-16 bg-slate-50"
                  disabled={isCommenting}
                  required
                />
                <button
                  type="submit"
                  disabled={isCommenting || !commentBody.trim()}
                  className="absolute bottom-4 right-4 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 sticky top-24">
              <h3 className="text-lg font-bold text-brand-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" />
                Status History
              </h3>
              
              <div className="space-y-4">
                {ticketResult.history && ticketResult.history.length > 0 ? (
                  ticketResult.history.map((hist, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                      <div className="font-semibold text-slate-900 capitalize text-sm">{hist.new_status.replace('_', ' ')}</div>
                      <div className="text-xs text-slate-500">{new Date(hist.created_at).toLocaleDateString()}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No status changes yet.</p>
                )}
                
                {/* Initial Creation Event */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="font-semibold text-slate-900 text-sm">Ticket Created</div>
                  <div className="text-xs text-slate-500">{new Date(ticketResult.ticket.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
