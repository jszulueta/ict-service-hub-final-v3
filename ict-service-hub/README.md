# ICT Service Hub — Diocese of Kalookan
## Complete Setup & Deployment Guide

> **Production-grade internal platform** for ICT support and media service requests.  
> Built with Next.js 16 · TypeScript · Tailwind CSS · Supabase · Resend  
> Optimized for **Supabase Free Tier** + **Vercel Hobby Plan**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Backend Setup — Supabase](#3-backend-setup--supabase)
4. [Email Setup — Resend](#4-email-setup--resend)
5. [Frontend Setup — Local Development](#5-frontend-setup--local-development)
6. [Role & User Setup](#6-role--user-setup)
7. [Deployment — Vercel](#7-deployment--vercel)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Maintenance & Free-Tier Tips](#9-maintenance--free-tier-tips)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have the following installed and accounts ready:

### Software Required
| Tool | Version | Install |
|------|---------|---------|
| Node.js | v22.10 LTS or higher | https://nodejs.org |
| npm | v10+ (comes with Node) | — |
| Git | Any recent version | https://git-scm.com |

### Accounts Required (all free)
| Service | Purpose | Link |
|---------|---------|------|
| **Supabase** | Database + Auth | https://supabase.com |
| **Vercel** | Hosting | https://vercel.com |
| **Resend** | Email notifications | https://resend.com |
| **GitHub** | Code repository | https://github.com |

> **Domain:** You will need a domain for Resend email sending (e.g., `dioceseofkalookan.org`). If you don't have one yet, you can use Resend's sandbox mode during development.

---

## 2. Project Structure

```text
ict-service-hub/
├── app/
│   ├── (admin)/                    # Admin portal routes (ICT staff)
│   │   ├── admin/
│   │   │   ├── audit/              # Audit logs
│   │   │   ├── page.tsx            # Admin dashboard
│   │   │   ├── spam/               # Spam monitoring
│   │   │   ├── tickets/            # All tickets (filterable)
│   │   │   └── users/              # User management
│   │   └── layout.tsx              # Admin layout wrapper
│   ├── api/                        # API routes
│   │   ├── admin/                  # Admin API endpoints
│   │   ├── auth/                   # Authentication API endpoints
│   │   └── test-spam/              # Spam testing endpoint
│   ├── auth/                       # Authentication routes
│   │   ├── callback/               # Supabase OAuth callback
│   │   ├── forgot-password/        # Forgot password page
│   │   ├── login/                  # Login page
│   │   ├── reset-password/         # Reset password page
│   │   ├── signup/                 # Signup page
│   │   └── suspended/              # Suspended account page
│   ├── guest/                      # Guest portal routes
│   │   ├── submit-ticket/          # Guest ticket submission
│   │   └── track-ticket/           # Guest ticket tracking
│   ├── (user)/                     # User portal routes (requesters)
│   │   ├── dashboard/              # User dashboard
│   │   ├── notifications/          # User notifications
│   │   └── tickets/                # Ticket management
│   ├── globals.css                 # Global CSS styles
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Landing/redirect page
│
├── components/                     # Reusable UI components
│   ├── admin/                      # Admin-specific components
│   │   ├── TicketActions.tsx       # Ticket action controls
│   │   ├── TicketTable.tsx         # Admin ticket table
│   │   ├── UsageMonitor.tsx        # System usage stats
│   │   └── UserActions.tsx         # User administration controls
│   ├── tickets/                    # Ticket-related components
│   │   ├── GuestTicketSubmitForm.tsx # Form to submit guest tickets
│   │   └── TicketSubmitForm.tsx    # Form to submit user tickets
│   ├── ui/                         # Base UI components
│   │   ├── GuestNavbar.tsx         # Guest application navigation bar
│   │   ├── index.tsx               # Shared accessible components
│   │   └── navbar.tsx              # Application navigation bar
│   ├── user/                       # User-specific components
│   │   └── UserCommentBox.tsx      # Ticket comment input
│   └── FetchInterceptor.tsx        # Global fetch interceptor
│
├── lib/                            # Core logic and utilities
│   ├── actions/                    # Server actions
│   │   └── tickets.ts              # Server actions for tickets
│   ├── email/                      # Email templates and logic
│   │   └── resend.ts               # Resend setup
│   ├── services/                   # Business logic services
│   │   ├── audit.service.ts        # Audit logging service
│   │   ├── notification.service.ts # Notification management service
│   │   ├── rate-limit.service.ts   # Rate limiting service
│   │   ├── spam.service.ts         # Spam detection service
│   │   └── ticket.service.ts       # Ticket management service
│   ├── supabase/                   # Supabase clients
│   │   ├── client.ts               # Browser-side client
│   │   └── server.ts               # Server-side client
│   ├── utility/                    # Utility functions
│   │   └── crypto.ts               # Cryptography helpers
│   └── validations/                # Zod validation schemas
│       └── schemas.ts              # Zod schemas
│
├── scripts/                        # Utility scripts
│   ├── clear-spam.ts               # Script to clear spam data
│   └── simulate-spam.sh            # Script to simulate spam
│
├── supabase/                       # Supabase configuration
│   └── schema.sql                  # Full DB schema + RLS
│
├── types/                          # Type definitions
│   ├── css.d.ts                    # CSS Module typings
│   └── database.ts                 # TypeScript types
│
├── middleware.ts                   # RBAC + rate limiting
├── tailwind.config.ts              # Tailwind CSS configuration
├── package.json                    # Dependencies and scripts
└── .env.example                    # Example environment variables
```

---

## 3. Backend Setup — Supabase

### Step 3.1 — Create a Supabase Project

1. Go to **https://supabase.com** and sign in (or create a free account)
2. Click **"New Project"**
3. Fill in:
   - **Organization:** Your organization (create one if needed)
   - **Project name:** `ict-service-hub`
   - **Database password:** WebTicketingSystem **save it securely**
   - **Region:** Choose `Southeast Asia (Singapore)` — closest to Kalookan
4. Click **"Create new project"**
5. Wait ~2 minutes for provisioning

### Step 3.2 — Get Your API Keys

1. In your Supabase project, go to **Project Settings**
2. Copy and save these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (Found in Data API Section. **Omit the '/rest/v1/' of the url** )
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Found in API Keys Section)
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` (Found in API Keys Section, **keep private!**)

### Step 3.3 — Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from this project
4. Copy the **entire contents** and paste into the SQL editor
5. Click **"Run"** (or press `Ctrl/Cmd + Enter`)
6. You should see: `Success. No rows returned`

> ⚠️ If you see errors, run it in sections — start with the ENUMS block, then TABLES, then TRIGGERS, then RLS POLICIES.

### Step 3.4 — Configure Supabase Auth

1. Go to **Authentication → URL Configuration** in your Supabase dashboard
2. Under **"Site URL"**, set:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Under **"Redirect URLs"**, add:
   ```
   http://localhost:3000/auth/callback (For Development)
   https://your-domain.com/auth/callback (For Production)
   ```
4. Under **"Sign In / Providers"** settings:
   - Enable **"Confirm email"** — ON\
5. Navigate to Auth Providers in **"Sign In / Providers"** settings and press **"Email**:
   - Enable **"Secure email change"** — ON
   - Set **"Password minimum length"** to `8`
   - Click **Save**

### Step 3.5 — Set Auth Email Templates (optional but recommended)

1. Go to **Authentication → Email Templates**
2. Customize the **Confirm signup**, **Reset password**, and **Magic Link** templates with the Diocese of Kalookan branding
3. Use the same navy/gold color scheme

### Step 3.6 — Configure Row Level Security

The schema already includes all RLS policies. Verify they're active:

1. Go to **Table Editor** → click any table (e.g., `tickets`)
2. Click the shield icon or go to **Auth → Policies**
3. Confirm that **RLS is enabled** for all tables
4. Confirm the policies are listed

### Step 3.7 — Create the Email Confirm Trigger

This is already in the schema (the `handle_new_user` trigger), but confirm it exists:

1. Go to **Database → Functions**
2. You should see `handle_new_user` in the list
3. Go to **Database → Triggers**
4. You should see `trg_on_auth_user_created` linked to `auth.users`

---

## 4. Email Setup — Resend

### Step 4.1 — Create a Resend Account

1. Go to **https://resend.com** and sign up (free)
2. Free tier: **3,000 emails/month** — sufficient for diocesan operations

### Step 4.2 — Add and Verify Your Domain

1. In Resend dashboard, go to **Domains → Add Domain**
2. Enter your domain (e.g., `dioceseofkalookan.org`)
3. Resend will give you **DNS records** to add (SPF, DKIM, DMARC)
4. Log into your domain registrar (e.g., Namecheap, GoDaddy) and add those DNS records
5. Click **"Verify"** in Resend — verification may take up to 24 hours

> **No domain yet?** During development, use Resend's sandbox. Emails will only send to your Resend account email. Set `RESEND_API_KEY` to your sandbox key.

### Step 4.3 — Create an API Key

1. In Resend dashboard, go to **API Keys → Create API Key**
2. Name it: `ict-service-hub-production`
3. Set permission to: **Sending access**
4. Copy the key → this is your `RESEND_API_KEY`

---

## 5. Frontend Setup — Local Development

### Step 5.1 — Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/ict-service-hub.git
cd ict-service-hub

# Install all dependencies
npm install
```

### Step 5.2 — Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

NEXT_PUBLIC_APP_URL=http://localhost:3000

RESEND_API_KEY=re_your_resend_key_here
ICT_ADMIN_EMAIL=ict@dioceseofkalookan.org
```

> **Security:** Never commit `.env.local` to Git. It's already in `.gitignore`.

### Step 5.3 — Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** — you should see the landing page.

### Step 5.4 — Verify the Setup

1. Go to `http://localhost:3000/auth/signup`
2. Create a test account
3. Check your email for the confirmation link (or check Supabase Auth → Users)
4. After confirming, log in and verify the dashboard loads
5. Submit a test ticket and verify it appears in the database (Supabase Table Editor → tickets)

---

## 6. Role & User Setup

### Step 6.1 — Create the Super Admin Account

1. First, sign up through the app: `http://localhost:3000/auth/signup`
2. Use the ICT admin's real email address
3. Confirm the email
4. Then promote to super admin in Supabase:

```sql
-- Run in Supabase SQL Editor
-- Replace the email with the actual admin email
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'ict-admin@dioceseofkalookan.org';
```

### Step 6.2 — Create ICT Staff Accounts

Option A — Staff signs up themselves, then admin promotes them:

```sql
-- Promote to ICT staff
UPDATE profiles 
SET role = 'ict_staff' 
WHERE email = 'staff@dioceseofkalookan.org';

-- Promote to ICT admin
UPDATE profiles 
SET role = 'ict_admin' 
WHERE email = 'team-lead@dioceseofkalookan.org';
```

Option B — Use the Admin Portal (once deployed):
1. Log in as super_admin
2. Go to `/admin/users`
3. Find the user and change their role via the UI

### Step 6.3 — Understanding Roles

| Role | Access | Description |
|------|--------|-------------|
| `requester` | `/dashboard`, `/tickets` | Parish staff, clergy, employees submitting requests |
| `ict_staff` | `/admin/*` | ICT team members who handle tickets |
| `ict_admin` | `/admin/*` + user management | Team leaders, can manage users and roles |
| `super_admin` | Everything | Full system access, can promote/demote admins |

> **Default role:** All new signups automatically get `requester` role via the database trigger.

---

## 7. Deployment — Vercel

### Step 7.1 — Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit — ICT Service Hub Diocese of Kalookan"

# Push to GitHub
git remote add origin https://github.com/your-org/ict-service-hub.git
git push -u origin main
```

### Step 7.2 — Connect to Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **"New Project"**
3. Import your `ict-service-hub` repository
4. Vercel will auto-detect Next.js — click **"Deploy"**
5. The first deploy will fail (no env vars yet) — that's okay

### Step 7.3 — Add Environment Variables in Vercel

1. In your Vercel project, go to **Settings → Environment Variables**
2. Add each variable from your `.env.local`:

| Variable | Environment |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Production: your domain; Preview: auto |
| `RESEND_API_KEY` | Production, Preview |
| `ICT_ADMIN_EMAIL` | Production |

3. After adding all variables, click **"Redeploy"** → **"Redeploy"** (no cache)

### Step 7.4 — Configure Custom Domain (optional)

1. In Vercel → **Settings → Domains**
2. Add your domain: `ict.dioceseofkalookan.org`
3. Add the provided DNS record to your domain registrar
4. Wait for DNS propagation (up to 24 hours, usually faster)
5. Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://ict.dioceseofkalookan.org`
6. Update Supabase Auth → Settings → Site URL to match

### Step 7.5 — Update Supabase for Production

1. In Supabase → **Authentication → URL Configuration**
2. Update **Site URL** to your production URL
3. Add production redirect URL:
   ```
   https://ict.dioceseofkalookan.org/auth/callback
   ```
4. Save

---

## 8. Post-Deployment Checklist

Run through this checklist after every deployment:

### Authentication
- [ ] Sign up as a new user → confirmation email arrives
- [ ] Confirm email → redirects to dashboard
- [ ] Log in → reaches user dashboard
- [ ] Log in as admin → reaches admin dashboard
- [ ] Try accessing `/admin` as a requester → redirects to `/dashboard`
- [ ] Try accessing `/dashboard` as ICT staff → redirects to `/admin`

### Ticket Flow
- [ ] Submit a ticket as requester → confirmation notification appears
- [ ] Admin can see the ticket in `/admin/tickets`
- [ ] Admin assigns ticket → status updates
- [ ] Requester receives email notification
- [ ] Requester can add a comment
- [ ] Admin can add internal note (not visible to requester)

### Security
- [ ] Direct URL to `/admin` while logged out → redirects to login
- [ ] Rate limiting works (submit 6+ tickets rapidly → error message)
- [ ] External archive links only accept Google Drive / OneDrive / Dropbox

### Email
- [ ] Ticket created → requester receives email
- [ ] Status update → requester receives email
- [ ] Admin receives new ticket alert email

---

## 9. Maintenance & Free-Tier Tips

### Monthly Maintenance Tasks

**Run these SQL queries in Supabase SQL Editor monthly:**

```sql
-- 1. Clean up old read notifications (keeps DB lean)
DELETE FROM notifications 
WHERE is_read = TRUE 
AND created_at < NOW() - INTERVAL '30 days';

-- 2. Check DB size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Archive old closed tickets (optional — export first)
-- Export closed tickets older than 1 year before deleting
SELECT * FROM tickets 
WHERE status IN ('closed', 'cancelled')
AND closed_at < NOW() - INTERVAL '1 year';
```

### Supabase Free Tier Limits

| Resource | Limit | Our Usage |
|----------|-------|-----------|
| Database size | 500 MB | ~1MB per 10,000 tickets |
| Bandwidth | 5 GB/month | Minimal (no file uploads) |
| Auth MAU | 50,000 | More than enough |
| Edge Function calls | 500K/month | Not used |
| Storage | 1 GB | Not used (external links only) |

### Vercel Hobby Plan Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Deployments | 100/day | More than enough |
| Bandwidth | 100 GB/month | Minimal for internal tool |
| Serverless function duration | 10 seconds | All actions well within limit |
| Cron jobs | Not available | Use Supabase scheduled functions instead |

### Keeping the System Light

1. **Never upload files** — always use external archive links (Google Drive, OneDrive)
2. **Auto-delete notifications** — the cleanup function removes read notifications after 30 days
3. **Close resolved tickets** — encourage staff to close tickets promptly
4. **Archive annually** — export and delete tickets older than 1 year

---

## 10. Troubleshooting

### "Invalid login credentials"
- Check that the user confirmed their email
- Check Supabase → Auth → Users — look for the user and their status
- Try resetting their password via `/auth/forgot-password`

### "You do not have permission to access this page"
- The user's role may not be set correctly
- Check in Supabase SQL Editor:
  ```sql
  SELECT email, role, is_active, is_suspended 
  FROM profiles 
  WHERE email = 'user@example.com';
  ```
- Update role if needed:
  ```sql
  UPDATE profiles SET role = 'ict_staff' WHERE email = 'user@example.com';
  ```

### Tickets not showing in admin panel
- Verify RLS policies are correctly applied
- Verify the user has `ict_staff` or higher role
- Check browser console for API errors

### Emails not sending
- Verify `RESEND_API_KEY` is correct in Vercel environment variables
- Verify your domain is verified in Resend dashboard
- Check Resend dashboard → Logs for delivery failures
- During development, use Resend sandbox (emails only go to your account email)

### "Too many requests" error
- The rate limiter is working correctly
- Users are limited to 60 requests/minute, auth routes to 15/minute
- Wait 60 seconds and try again
- For legitimate high-volume use, increase limits in `middleware.ts`

### Database errors on first deploy
- Ensure the full `schema.sql` was run in Supabase SQL Editor
- Check for partial runs — re-run the entire schema
- Common issue: `uuid-ossp` extension not enabled — the schema handles this automatically

### Middleware redirect loops
- Usually caused by incorrect role in database
- Check the profile row in Supabase:
  ```sql
  SELECT * FROM profiles WHERE id = 'your-user-uuid';
  ```

---

## Support & Development

**ICT Department — Diocese of Kalookan**  
Email: ict@dioceseofkalookan.org  

**Built with:**
- [Next.js](https://nextjs.org) 16 App Router
- [Supabase](https://supabase.com) Auth + PostgreSQL
- [Tailwind CSS](https://tailwindcss.com)
- [Resend](https://resend.com)
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)

---

*In Nomine Patris et Filii et Spiritus Sancti.*  
*Diocese of Kalookan — Serving the People of God through Technology*
