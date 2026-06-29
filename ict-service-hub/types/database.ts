// types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'requester' | 'ict_staff' | 'ict_admin' | 'super_admin'
export type TicketStatus = 'pending' | 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'cancelled'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ServiceCategory = 'systems_software' | 'network_infrastructure' | 'live_streaming' | 'photography' | 'videography'
export type NotificationType = 'ticket_created' | 'ticket_assigned' | 'ticket_updated' | 'ticket_resolved' | 'ticket_closed' | 'comment_added' | 'status_changed'
export type AuditAction = 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'ticket_deleted' | 'status_changed' | 'comment_added' | 'user_role_changed' | 'user_suspended' | 'login_attempt' | 'spam_flagged'

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string | null
  role: UserRole
  department: string | null
  parish_office: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  is_suspended: boolean
  suspension_reason: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_number: string
  requester_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  assigned_to: string | null
  title: string
  description: string
  category: ServiceCategory
  status: TicketStatus
  priority: TicketPriority
  event_name: string | null
  event_date: string | null
  event_location: string | null
  event_notes: string | null
  external_archive_link: string | null
  archive_description: string | null
  resolution_notes: string | null
  resolved_at: string | null
  closed_at: string | null
  ip_address: string | null
  is_spam_flagged: boolean
  spam_reason: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  ticket_id: string
  author_id: string | null
  guest_name: string | null
  body: string
  is_internal: boolean
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  ticket_id: string | null
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: AuditAction
  resource: string | null
  resource_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface UsageSnapshot {
  id: string
  snapshot_date: string
  total_tickets: number
  total_users: number
  total_comments: number
  total_notifs: number
  db_size_bytes: number
  created_at: string
}

// ── Supabase Database type map ──────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          email: string
          full_name: string
          display_name?: string | null
          role?: UserRole
          department?: string | null
          parish_office?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          is_suspended?: boolean
          suspension_reason?: string | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string
          display_name?: string | null
          role?: UserRole
          department?: string | null
          parish_office?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          is_suspended?: boolean
          suspension_reason?: string | null
          last_seen_at?: string | null
          updated_at?: string
        }
      }
      tickets: {
        Row: Ticket
        Insert: {
          id?: string
          ticket_number?: string
          requester_id: string
          assigned_to?: string | null
          title: string
          description: string
          category: ServiceCategory
          status?: TicketStatus
          priority?: TicketPriority
          event_name?: string | null
          event_date?: string | null
          event_location?: string | null
          event_notes?: string | null
          external_archive_link?: string | null
          archive_description?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          ip_address?: string | null
          is_spam_flagged?: boolean
          spam_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          title?: string
          description?: string
          category?: ServiceCategory
          status?: TicketStatus
          priority?: TicketPriority
          event_name?: string | null
          event_date?: string | null
          event_location?: string | null
          event_notes?: string | null
          external_archive_link?: string | null
          archive_description?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          closed_at?: string | null
          is_spam_flagged?: boolean
          spam_reason?: string | null
          updated_at?: string
        }
      }
      comments: {
        Row: Comment
        Insert: {
          id?: string
          ticket_id: string
          author_id?: string | null
          guest_name?: string | null
          body: string
          is_internal?: boolean
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          guest_name?: string | null
          body?: string
          is_internal?: boolean
          is_edited?: boolean
          updated_at?: string
        }
      }
      notifications: {
        Row: Notification
        Insert: {
          id?: string
          user_id: string
          ticket_id?: string | null
          type: NotificationType
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      audit_logs: {
        Row: AuditLog
        Insert: {
          id?: string
          actor_id?: string | null
          actor_email?: string | null
          action: AuditAction
          resource?: string | null
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }
      usage_snapshots: {
        Row: UsageSnapshot
        Insert: {
          id?: string
          snapshot_date?: string
          total_tickets?: number
          total_users?: number
          total_comments?: number
          total_notifs?: number
          db_size_bytes?: number
          created_at?: string
        }
        Update: {
          total_tickets?: number
          total_users?: number
          total_comments?: number
          total_notifs?: number
          db_size_bytes?: number
        }
      }
      ticket_status_history: {
        Row: {
          id: string
          ticket_id: string
          changed_by: string
          old_status: TicketStatus | null
          new_status: TicketStatus
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          changed_by: string
          old_status?: TicketStatus | null
          new_status: TicketStatus
          note?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: {
      is_ict_staff_or_above: { Args: Record<never, never>; Returns: boolean }
      is_ict_admin_or_above: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── UI label maps ───────────────────────────────────────────────────────────

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  systems_software:       'Systems & Software',
  network_infrastructure: 'Network Infrastructure',
  live_streaming:         'Live-Streaming Operations',
  photography:            'Photography',
  videography:            'Videography',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  pending:     'Pending',
  open:        'Open',
  in_progress: 'In Progress',
  on_hold:     'On Hold',
  resolved:    'Resolved',
  closed:      'Closed',
  cancelled:   'Cancelled',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low:    'Low',
  medium: 'Medium',
  high:   'High',
  urgent: 'Urgent',
}
