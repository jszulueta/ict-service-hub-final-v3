# Supabase Guest Tickets Schema Migration

Follow these steps to update the Supabase database to support guest ticket submissions and tracking.

## 1. Modify the `tickets` table
Execute the following SQL commands in the Supabase SQL Editor to make `requester_id` nullable and add guest information fields.

```sql
ALTER TABLE tickets ALTER COLUMN requester_id DROP NOT NULL;

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT;

ALTER TABLE comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_name TEXT;
```

## 2. Add Row-Level Security (RLS) Policy
Apply this policy to allow non-authenticated users to create guest tickets.

```sql
CREATE POLICY "Guests can create tickets"
  ON tickets FOR INSERT WITH CHECK (
    requester_id IS NULL 
    AND guest_email IS NOT NULL
  );
```

## 3. Create the Guest Tracking RPC Function
Run this script to create a secure database function for retrieving a guest ticket and its status history using the tracking ID. This function is `SECURITY DEFINER` to bypass RLS for public read access.

```sql
CREATE OR REPLACE FUNCTION get_guest_ticket(p_ticket_number TEXT)
RETURNS JSON AS $$
DECLARE
  v_ticket RECORD;
  v_history JSON;
  v_comments JSON;
BEGIN
  -- Retrieve ticket details if it is a guest ticket
  SELECT id, ticket_number, title, description, category, status, priority, guest_name, created_at, resolution_notes
  INTO v_ticket
  FROM tickets
  WHERE ticket_number = p_ticket_number
  AND requester_id IS NULL;

  -- Return NULL if the ticket is not found or not a guest ticket
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Aggregate the status history
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

  -- Output as JSON
  RETURN json_build_object(
    'ticket', row_to_json(v_ticket),
    'history', v_history,
    'comments', v_comments
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
