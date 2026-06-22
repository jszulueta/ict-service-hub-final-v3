'use client'
// components/tickets/GuestTicketSubmitForm.tsx
// Guest-facing ticket submission form
// Elderly-friendly, accessible, validated with React Hook Form + Zod

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGuestTicketSchema, type CreateGuestTicketInput } from '@/lib/validations/schemas'
import { submitGuestTicket } from '@/app/guest/submit-ticket/actions'
import { SERVICE_CATEGORY_LABELS } from '@/types/database'
import { Button, Field, Input, Textarea, Select, Alert } from '@/components/ui'

// ---- Category options ----
const CATEGORY_OPTIONS = Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

// ---- Priority options ----
const PRIORITY_OPTIONS = [
  { value: 'low',    label: '🟢 Low — No urgency, general inquiry' },
  { value: 'medium', label: '🟡 Medium — Needed within a few days' },
  { value: 'high',   label: '🟠 High — Needed urgently' },
  { value: 'urgent', label: '🔴 Urgent — Critical, immediate attention needed' },
]

// ---- Categories requiring event details ----
const EVENT_CATEGORIES = ['live_streaming', 'photography', 'videography']

export function GuestTicketSubmitForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(createGuestTicketSchema),
    defaultValues: {
      priority: 'medium',
      category: 'systems_software',
    },
  })

  const selectedCategory = watch('category')
  const isEventCategory = EVENT_CATEGORIES.includes(selectedCategory)

  const onSubmit = async (data: any) => {
    setServerError(null)
    try {
      const result = await submitGuestTicket(data as CreateGuestTicketInput)
      setTicketNumber(result.ticket_number)
      setSubmitted(true)
      reset()
    } catch (err: any) {
      console.error(err)
      setServerError(err.message || 'An unexpected error occurred.')
    }
  }

  // ---- Success State ----
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-card border border-green-200 shadow-card p-8 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">✅</div>
          <h2 className="font-display text-2xl font-bold text-brand-900 mb-2">
            Request Submitted Successfully
          </h2>
          {ticketNumber && (
            <div className="inline-flex items-center gap-2 bg-brand-950 text-white px-4 py-2 rounded-btn text-sm font-mono font-bold mb-4">
              <span aria-hidden="true">🎟</span>
              {ticketNumber}
            </div>
          )}
          <p className="text-slate-600 text-base max-w-md mx-auto mb-6">
            Your request has been received. Our ICT team will review and respond as soon as possible.
            Please save your tracking number above to check the status of your request later.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={() => router.push('/guest/track-ticket')}
              size="lg"
            >
              Track Ticket Status
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSubmitted(false)}
              size="lg"
            >
              Submit Another Request
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Form ----
  return (
    <div className="max-w-2xl mx-auto">
      {/* Form Card */}
      <div className="bg-white rounded-card border border-liturgical-muted shadow-card overflow-hidden">
        {/* Header */}
        <div className="bg-brand-600 px-6 py-5">
          <h2 className="font-display text-xl font-bold text-white">Submit a Service Request</h2>
          <p className="text-slate-200 text-sm mt-0.5">
            Fill in the details below. Fields marked with <span className="text-brand-300">*</span> are required.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-6">
          {/* Server Error */}
          {serverError && (
            <Alert variant="error" title="Submission Failed" onDismiss={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}

          {/* ---- GUEST INFO ---- */}
          <fieldset>
            <legend className="text-base font-bold text-brand-900 mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold" aria-hidden="true">1</span>
              Personal Information
            </legend>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  htmlFor="guest_name"
                  error={errors.guest_name?.message as any}
                  required
                >
                  <Input
                    id="guest_name"
                    placeholder="e.g., Juan Dela Cruz"
                    error={!!errors.guest_name}
                    {...register('guest_name')}
                    aria-required="true"
                  />
                </Field>

                <Field
                  label="Email Address"
                  htmlFor="guest_email"
                  error={errors.guest_email?.message as any}
                  required
                >
                  <Input
                    id="guest_email"
                    type="email"
                    placeholder="e.g., juan@example.com"
                    error={!!errors.guest_email}
                    {...register('guest_email')}
                    aria-required="true"
                  />
                </Field>
              </div>

              <Field
                label="Phone Number"
                htmlFor="guest_phone"
                error={errors.guest_phone?.message as any}
                hint="Optional. Used if we need to call you."
              >
                <Input
                  id="guest_phone"
                  placeholder="e.g., 0912 345 6789"
                  error={!!errors.guest_phone}
                  {...register('guest_phone')}
                />
              </Field>
            </div>
          </fieldset>

          {/* ---- SERVICE TYPE ---- */}
          <fieldset>
            <legend className="text-base font-bold text-brand-900 mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold" aria-hidden="true">2</span>
              Service Type
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map((opt) => {
                const isChecked = selectedCategory === opt.value
                const icons: Record<string, string> = {
                  systems_software: '💻',
                  network_infrastructure: '🌐',
                  live_streaming: '📡',
                  photography: '📷',
                  videography: '🎬',
                }
                return (
                  <label
                    key={opt.value}
                    className={[
                      'flex items-center gap-3 p-4 rounded-btn border-2 cursor-pointer transition-all duration-150',
                      isChecked
                        ? 'border-brand-600 bg-brand-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-400 bg-white',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('category')}
                      className="sr-only"
                      aria-describedby={errors.category ? 'category-error' : undefined}
                    />
                    <span className="text-2xl" aria-hidden="true">{icons[opt.value]}</span>
                    <span className={`text-sm font-semibold ${isChecked ? 'text-brand-900' : 'text-slate-600'}`}>
                      {opt.label}
                    </span>
                    {isChecked && (
                      <span className="ml-auto text-brand-600" aria-hidden="true">✓</span>
                    )}
                  </label>
                )
              })}
            </div>
            {errors.category?.message && (
              <p className="text-sm text-red-600 mt-2" id="category-error" role="alert">
                {String(errors.category.message)}
              </p>
            )}
          </fieldset>

          {/* ---- REQUEST DETAILS ---- */}
          <fieldset>
            <legend className="text-base font-bold text-brand-900 mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold" aria-hidden="true">3</span>
              Request Details
            </legend>
            <div className="space-y-4">
              <Field
                label="Subject / Title"
                htmlFor="title"
                error={errors.title?.message as any}
                hint="Brief summary of your request (e.g., 'Projector not working in chapel')"
                required
              >
                <Input
                  id="title"
                  placeholder="Briefly describe your request..."
                  error={!!errors.title}
                  {...register('title')}
                  aria-required="true"
                />
              </Field>

              <Field
                label="Full Description"
                htmlFor="description"
                error={errors.description?.message as any}
                hint="Provide as much detail as possible to help us assist you quickly."
                required
              >
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Please describe the issue or service you need in detail..."
                  error={!!errors.description}
                  {...register('description')}
                  aria-required="true"
                />
              </Field>

              <Field
                label="Priority Level"
                htmlFor="priority"
                error={errors.priority?.message as any}
                required
              >
                <Select
                  id="priority"
                  options={PRIORITY_OPTIONS}
                  error={!!errors.priority}
                  {...register('priority')}
                />
              </Field>
            </div>
          </fieldset>

          {/* ---- EVENT DETAILS (conditional) ---- */}
          {isEventCategory && (
            <fieldset className="animate-fade-in border border-brand-200 rounded-card p-5 bg-brand-50">
              <legend className="text-base font-bold text-brand-800 mb-3 flex items-center gap-2 px-1">
                <span aria-hidden="true">📅</span>
                Event Information
                <span className="text-sm font-normal text-brand-600">(Required for media & streaming requests)</span>
              </legend>
              <div className="space-y-4">
                <Field
                  label="Event Name"
                  htmlFor="event_name"
                  error={errors.event_name?.message as any}
                >
                  <Input
                    id="event_name"
                    placeholder="e.g., Parish Fiesta Mass, Diocesan Assembly 2025..."
                    error={!!errors.event_name}
                    {...register('event_name')}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Event Date" htmlFor="event_date" error={errors.event_date?.message as any}>
                    <Input
                      id="event_date"
                      type="date"
                      error={!!errors.event_date}
                      {...register('event_date')}
                    />
                  </Field>

                  <Field label="Event Location / Venue" htmlFor="event_location" error={errors.event_location?.message as any}>
                    <Input
                      id="event_location"
                      placeholder="e.g., Cathedral of the Risen Christ..."
                      error={!!errors.event_location}
                      {...register('event_location')}
                    />
                  </Field>
                </div>

                <Field
                  label="Additional Notes"
                  htmlFor="event_notes"
                  error={errors.event_notes?.message as any}
                  hint="e.g., Number of cameras needed, streaming platform, expected attendees"
                >
                  <Textarea
                    id="event_notes"
                    rows={3}
                    placeholder="Any additional details about the event requirements..."
                    error={!!errors.event_notes}
                    {...register('event_notes')}
                  />
                </Field>
              </div>
            </fieldset>
          )}

          {/* ---- ARCHIVE LINK (optional) ---- */}
          <fieldset>
            <legend className="text-base font-bold text-brand-900 mb-3 flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-bold" aria-hidden="true">4</span>
              Reference Files
              <span className="text-sm font-normal text-slate-500">(Optional)</span>
            </legend>
            <div className="space-y-4 p-4 bg-slate-50 rounded-btn border border-slate-200">
              <Alert variant="info">
                <strong>No file uploads needed.</strong> Share a Google Drive, OneDrive, or Dropbox link instead.
              </Alert>
              <Field
                label="External Archive Link"
                htmlFor="external_archive_link"
                error={errors.external_archive_link?.message as any}
                hint="Paste a Google Drive, OneDrive, or Dropbox shared link"
              >
                <Input
                  id="external_archive_link"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  error={!!errors.external_archive_link}
                  {...register('external_archive_link')}
                />
              </Field>
              <Field
                label="Archive Description"
                htmlFor="archive_description"
                error={errors.archive_description?.message as any}
              >
                <Input
                  id="archive_description"
                  placeholder="e.g., Event photos from last year's fiesta"
                  error={!!errors.archive_description}
                  {...register('archive_description')}
                />
              </Field>
            </div>
          </fieldset>

          {/* ---- SUBMIT ---- */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-liturgical-muted">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              fullWidth
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Service Request'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.push('/')}
              disabled={isSubmitting}
              className="sm:w-auto"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Your request will be reviewed by the ICT Department. Response times vary by priority level.
          </p>
        </form>
      </div>
    </div>
  )
}
