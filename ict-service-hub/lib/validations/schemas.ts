// lib/validations/ticket.ts
// Zod validation schemas — used in both client forms and server actions

import { z } from 'zod'

// ---- Sanitization helper ----
const sanitizedString = (min: number, max: number, label: string) =>
  z
    .string()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must not exceed ${max} characters.`)
    .transform((val) =>
      val
        .trim()
        .replace(/<[^>]*>/g, '')
    )

const externalLinkSchema = z
  .string()
  .url('Please enter a valid URL (e.g. https://drive.google.com/...)')
  .refine(
    (url) =>
      url.startsWith('https://drive.google.com') ||
      url.startsWith('https://onedrive.live.com') ||
      url.startsWith('https://1drv.ms') ||
      url.startsWith('https://www.dropbox.com') ||
      url.startsWith('https://dropbox.com') ||
      url.startsWith('https://sharepoint.com') ||
      url.startsWith('https://docs.google.com'),
    'Only Google Drive, OneDrive, Dropbox, or SharePoint links are allowed.'
  )
  .optional()
  .or(z.literal(''))

// ============================================================
// TICKET SUBMISSION
// ============================================================

export const createTicketSchema = z.object({
  title: sanitizedString(5, 150, 'Title'),
  description: sanitizedString(20, 2000, 'Description'),
  category: z.enum([
    'systems_software',
    'network_infrastructure',
    'live_streaming',
    'photography',
    'videography',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  event_name: sanitizedString(2, 200, 'Event name').optional().or(z.literal('')),
  event_date: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      'Please enter a valid date.'
    )
    .refine(
      (val) => !val || new Date(val) >= new Date(new Date().toDateString()),
      'Event date cannot be in the past.'
    ),
  event_location: sanitizedString(2, 300, 'Event location').optional().or(z.literal('')),
  event_notes: sanitizedString(0, 1000, 'Event notes').optional().or(z.literal('')),
  external_archive_link: externalLinkSchema,
  archive_description: sanitizedString(0, 300, 'Archive description').optional().or(z.literal('')),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const createGuestTicketSchema = createTicketSchema.extend({
  guest_name: sanitizedString(2, 100, 'Full name'),
  guest_email: z.string().email('Please enter a valid email address.').toLowerCase(),
  guest_phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number.')
    .optional()
    .or(z.literal('')),
})

export type CreateGuestTicketInput = z.infer<typeof createGuestTicketSchema>


// ============================================================
// TICKET UPDATE (admin)
// ============================================================

export const updateTicketSchema = z.object({
  status: z
    .enum(['pending', 'open', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid('Invalid user ID.').optional().nullable(),
  resolution_notes: sanitizedString(0, 2000, 'Resolution notes').optional().or(z.literal('')),
  external_archive_link: externalLinkSchema,
  archive_description: sanitizedString(0, 300, 'Archive description').optional().or(z.literal('')),
})

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>

// ============================================================
// COMMENT
// ============================================================

export const createCommentSchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID.'),
  body: sanitizedString(2, 1000, 'Comment'),
  is_internal: z.boolean().default(false),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>

// ============================================================
// AUTH FORMS
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    full_name: sanitizedString(2, 100, 'Full name'),
    email: z.string().email('Please enter a valid email address.').toLowerCase(),
    department: sanitizedString(0, 100, 'Department').optional().or(z.literal('')),
    parish_office: sanitizedString(0, 100, 'Parish/Office').optional().or(z.literal('')),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number.')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.').toLowerCase(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// ============================================================
// PROFILE UPDATE
// ============================================================

export const updateProfileSchema = z.object({
  full_name: sanitizedString(2, 100, 'Full name'),
  display_name: sanitizedString(2, 60, 'Display name').optional().or(z.literal('')),
  department: sanitizedString(0, 100, 'Department').optional().or(z.literal('')),
  parish_office: sanitizedString(0, 100, 'Parish/Office').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number.')
    .optional()
    .or(z.literal('')),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>