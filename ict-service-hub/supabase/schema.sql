-- ============================================================
-- ICT SERVICE HUB — Diocese of Kalookan
-- PostgreSQL Schema + RLS Policies
-- Optimized for Supabase Free Tier
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('requester', 'ict_staff', 'ict_admin', 'super_admin');

CREATE TYPE ticket_status AS ENUM (
  'pending',
  'open',
  'in_progress',
  'on_hold',
  'resolved',
  'closed',
  'cancelled'
);

CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE service_category AS ENUM (
  'systems_software',
  'network_infrastructure',
  'live_streaming',
  'photography',
  'videography'
);

CREATE TYPE notification_type AS ENUM (
  'ticket_created',
  'ticket_assigned',
  'ticket_updated',
  'ticket_resolved',
  'ticket_closed',
  'comment_added',
  'status_changed'
);

CREATE TYPE audit_action AS ENUM (
  'ticket_created',
  'ticket_updated',
  'ticket_assigned',
  'ticket_deleted',
  'status_changed',
  'comment_added',
  'user_role_changed',
  'user_suspended',
  'login_attempt',
  'spam_flagged'
);

-- ============================================================
-- PROFILES TABLE
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  display_name  TEXT,
  role          user_role NOT NULL DEFAULT 'requester',
  department    TEXT,
  parish_office TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason TEXT,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- ============================================================
-- TICKETS TABLE
-- ============================================================

CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   TEXT UNIQUE NOT NULL,
  requester_id    UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  guest_name      TEXT,
  guest_email     TEXT,
  guest_phone     TEXT,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        service_category NOT NULL,
  status          ticket_status NOT NULL DEFAULT 'pending',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  
  -- Event details (for media/streaming requests)
  event_name      TEXT,
  event_date      DATE,
  event_location  TEXT,
  event_notes     TEXT,

  -- External archive (no file storage used)
  external_archive_link TEXT,
  archive_description   TEXT,

  -- Resolution
  resolution_notes TEXT,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,

  -- Anti-spam
  ip_address      INET,
  is_spam_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  spam_reason     TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq    INT;
  year   TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YY');
  
  seq := nextval('ticket_number_seq'); 
  
  prefix := 'TKT-' || year || '-';
  RETURN prefix || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := generate_ticket_number();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

-- Indexes for performance
CREATE INDEX idx_tickets_requester_id ON tickets(requester_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_is_spam ON tickets(is_spam_flagged) WHERE is_spam_flagged = TRUE;
CREATE INDEX idx_tickets_search ON tickets USING gin(to_tsvector('english', title || ' ' || description));

-- ============================================================
-- TICKET STATUS HISTORY
-- ============================================================

CREATE TABLE ticket_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  old_status  ticket_status,
  new_status  ticket_status NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_ticket ON ticket_status_history(ticket_id);

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  guest_name  TEXT,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- admin-only notes
  is_edited   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Auto-delete old read notifications (keep DB light)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       audit_action NOT NULL,
  resource     TEXT,          -- e.g. 'ticket', 'user'
  resource_id  TEXT,          -- UUID of affected resource
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- ============================================================
-- SPAM TRACKING TABLE (lightweight)
-- ============================================================

CREATE TABLE spam_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address   INET NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attempt_type TEXT NOT NULL, -- 'ticket_flood', 'failed_auth', etc.
  count        INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spam_ip ON spam_attempts(ip_address);
CREATE INDEX idx_spam_user ON spam_attempts(user_id);

-- ============================================================
-- USAGE MONITORING TABLE (for free-tier tracking)
-- ============================================================

CREATE TABLE usage_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_tickets   INT DEFAULT 0,
  total_users     INT DEFAULT 0,
  total_comments  INT DEFAULT 0,
  total_notifs    INT DEFAULT 0,
  db_size_bytes   BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- ============================================================
-- UPDATED_AT TRIGGER (reusable)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STATUS HISTORY TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_status_history (ticket_id, changed_by, old_status, new_status)
    VALUES (
      NEW.id, 
      COALESCE(auth.uid(), NEW.assigned_to, NEW.requester_id), 
      OLD.status, 
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ticket_status_history
  AFTER UPDATE OF status ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_status_change();

-- ============================================================
-- PROFILE AUTO-CREATE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'requester'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user has admin/staff role
CREATE OR REPLACE FUNCTION is_ict_staff_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('ict_staff', 'ict_admin', 'super_admin')
    AND is_active = TRUE
    AND is_suspended = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_ict_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('ict_admin', 'super_admin')
    AND is_active = TRUE
    AND is_suspended = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- PROFILES ----
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT USING (is_ict_staff_or_above());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (is_ict_admin_or_above());

-- ---- TICKETS ----
CREATE POLICY "Users can view their own tickets"
  ON tickets FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Staff can view all tickets"
  ON tickets FOR SELECT USING (is_ict_staff_or_above());

CREATE POLICY "Users can create tickets"
  ON tickets FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_active = TRUE
      AND is_suspended = FALSE
    )
  );

CREATE POLICY "Guests can create tickets"
  ON tickets FOR INSERT WITH CHECK (
    requester_id IS NULL 
    AND guest_email IS NOT NULL
  );

CREATE POLICY "Users can update their own pending tickets"
  ON tickets FOR UPDATE USING (
    requester_id = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "Staff can update any ticket"
  ON tickets FOR UPDATE USING (is_ict_staff_or_above());

-- ---- TICKET STATUS HISTORY ----
CREATE POLICY "Users can view history of own tickets"
  ON ticket_status_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND requester_id = auth.uid())
  );

CREATE POLICY "Staff can view all status history"
  ON ticket_status_history FOR SELECT USING (is_ict_staff_or_above());

-- ---- COMMENTS ----
CREATE POLICY "Users can view non-internal comments on own tickets"
  ON comments FOR SELECT USING (
    is_internal = FALSE
    AND EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND requester_id = auth.uid())
  );

CREATE POLICY "Staff can view all comments"
  ON comments FOR SELECT USING (is_ict_staff_or_above());

CREATE POLICY "Users can add comments to own tickets"
  ON comments FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND is_internal = FALSE
    AND EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND requester_id = auth.uid())
  );

CREATE POLICY "Staff can add any comment"
  ON comments FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND is_ict_staff_or_above()
  );

-- ---- NOTIFICATIONS ----
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ---- AUDIT LOGS ----
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT USING (is_ict_admin_or_above());

-- ---- SPAM ATTEMPTS ----
CREATE POLICY "Only admins can view spam attempts"
  ON spam_attempts FOR SELECT USING (is_ict_admin_or_above());

-- ---- USAGE SNAPSHOTS ----
CREATE POLICY "Only admins can view usage snapshots"
  ON usage_snapshots FOR SELECT USING (is_ict_admin_or_above());

-- ============================================================
-- INITIAL SEED: Super Admin placeholder (replace UUID after signup)
-- Run after creating the super admin user in Supabase Auth
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'admin@dioceseofkalookan.org';
-- ============================================================

-- Create a secure function to retrieve a guest ticket by its tracking ID
CREATE OR REPLACE FUNCTION get_guest_ticket(p_ticket_number TEXT)
RETURNS JSON AS $$
DECLARE
  v_ticket RECORD;
  v_history JSON;
  v_comments JSON;
BEGIN
  -- Get the ticket details (only if it's a guest ticket)
  SELECT id, ticket_number, title, description, category, status, priority, guest_name, created_at, resolution_notes
  INTO v_ticket
  FROM tickets
  WHERE ticket_number = p_ticket_number
  AND requester_id IS NULL;

  -- If not found, return NULL
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get the ticket's status history
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'old_status', old_status,
        'new_status', new_status,
        'created_at', created_at
      ) ORDER BY created_at DESC
    ), '[]'::json
  ) INTO v_history
  FROM ticket_status_history
  WHERE ticket_id = v_ticket.id;

  -- Get the ticket's public comments
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', c.id,
        'body', c.body,
        'created_at', c.created_at,
        'guest_name', c.guest_name,
        'author', CASE WHEN p.id IS NOT NULL THEN json_build_object('full_name', p.full_name, 'role', p.role) ELSE NULL END
      ) ORDER BY c.created_at ASC
    ), '[]'::json
  ) INTO v_comments
  FROM comments c
  LEFT JOIN profiles p ON c.author_id = p.id
  WHERE c.ticket_id = v_ticket.id AND c.is_internal = FALSE;

  -- Return the ticket, history, and comments as a JSON object
  RETURN json_build_object(
    'ticket', row_to_json(v_ticket),
    'history', v_history,
    'comments', v_comments
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
