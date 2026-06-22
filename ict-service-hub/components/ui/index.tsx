// components/ui/index.tsx
import React, { type ElementType } from 'react'
import type { ServiceCategory, TicketStatus, TicketPriority } from '@/types/database'
import { SERVICE_CATEGORY_LABELS, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/types/database'

// ── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  icon?:     React.ReactNode
  fullWidth?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   'bg-brand-600 hover:bg-brand-700 text-white border-transparent focus-visible:ring-brand-600',
  secondary: 'bg-white hover:bg-slate-50 text-brand-900 border-slate-300 hover:border-slate-400 focus-visible:ring-brand-600',
  ghost:     'bg-transparent hover:bg-slate-100 text-brand-900 border-transparent focus-visible:ring-brand-600',
  danger:    'bg-red-600 hover:bg-red-700 text-white border-transparent focus-visible:ring-red-600',
  gold:      'bg-brand-500 hover:bg-brand-600 text-white border-transparent focus-visible:ring-brand-500',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-14 px-8 text-lg min-w-[160px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  )
}

// ── Field ───────────────────────────────────────────────────────────────────

interface FieldProps {
  label:    string
  htmlFor:  string
  error?:   string
  hint?:    string
  required?: boolean
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, hint, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="text-brand-600 ml-1" aria-label="required">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-slate-500">{hint}</p>}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1" role="alert" aria-live="polite">
          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// ── Input ───────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={[
        'w-full h-11 px-4 rounded-lg border text-base text-slate-900 bg-white',
        'placeholder:text-slate-400 transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70',
        error
          ? 'border-red-400 focus:ring-red-400 bg-red-50'
          : 'border-slate-300 hover:border-slate-400',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

// ── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={[
        'w-full px-4 py-3 rounded-lg border text-base text-slate-900 bg-white resize-y min-h-[120px]',
        'placeholder:text-slate-400 transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 focus:ring-red-400 bg-red-50'
          : 'border-slate-300 hover:border-slate-400',
        className,
      ].join(' ')}
      {...props}
    />
  )
}

// ── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?:       boolean
  options:      { value: string; label: string }[]
  placeholder?: string
}

export function Select({ error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <select
      className={[
        'w-full h-11 px-4 rounded-lg border text-base text-slate-900 bg-white',
        'transition-colors duration-150 pr-10',
        'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent',
        'disabled:bg-slate-100 disabled:cursor-not-allowed',
        error
          ? 'border-red-400 focus:ring-red-400 bg-red-50'
          : 'border-slate-300 hover:border-slate-400',
        className,
      ].join(' ')}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
// Fixed: use ElementType instead of keyof JSX.IntrinsicElements

interface CardProps {
  children:  React.ReactNode
  className?: string
  as?:       ElementType
}

export function Card({ children, className = '', as: Tag = 'div' }: CardProps) {
  return (
    <Tag className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </Tag>
  )
}

// ── StatusBadge ──────────────────────────────────────────────────────────────

const statusConfig: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  pending:     { bg: 'bg-yellow-50',  text: 'text-yellow-800', dot: 'bg-yellow-400' },
  open:        { bg: 'bg-blue-50',    text: 'text-blue-800',   dot: 'bg-blue-500'   },
  in_progress: { bg: 'bg-sky-50',     text: 'text-sky-800',    dot: 'bg-sky-500'    },
  on_hold:     { bg: 'bg-amber-50',   text: 'text-amber-800',  dot: 'bg-amber-400'  },
  resolved:    { bg: 'bg-green-50',   text: 'text-green-800',  dot: 'bg-green-500'  },
  closed:      { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  cancelled:   { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400'    },
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}

// ── PriorityBadge ────────────────────────────────────────────────────────────

const priorityConfig: Record<TicketPriority, { bg: string; text: string }> = {
  low:    { bg: 'bg-green-50',  text: 'text-green-700'  },
  medium: { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  high:   { bg: 'bg-orange-50', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-50',    text: 'text-red-700'    },
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = priorityConfig[priority]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {TICKET_PRIORITY_LABELS[priority]}
    </span>
  )
}

// ── CategoryBadge ────────────────────────────────────────────────────────────

const categoryIcons: Record<ServiceCategory, string> = {
  systems_software:       '💻',
  network_infrastructure: '🌐',
  live_streaming:         '📡',
  photography:            '📷',
  videography:            '🎬',
}

export function CategoryBadge({ category }: { category: ServiceCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <span aria-hidden="true">{categoryIcons[category]}</span>
      {SERVICE_CATEGORY_LABELS[category]}
    </span>
  )
}

// ── Alert ────────────────────────────────────────────────────────────────────

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?:  AlertVariant
  title?:    string
  children:  React.ReactNode
  onDismiss?: () => void
}

const alertConfig: Record<AlertVariant, { bg: string; border: string; icon: string; titleColor: string; textColor: string }> = {
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: 'ℹ️', titleColor: 'text-blue-900',  textColor: 'text-blue-800'  },
  success: { bg: 'bg-green-50',  border: 'border-green-200', icon: '✅', titleColor: 'text-green-900', textColor: 'text-green-800' },
  warning: { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠️', titleColor: 'text-amber-900', textColor: 'text-amber-800' },
  error:   { bg: 'bg-red-50',    border: 'border-red-200',   icon: '❌', titleColor: 'text-red-900',   textColor: 'text-red-800'   },
}

export function Alert({ variant = 'info', title, children, onDismiss }: AlertProps) {
  const cfg = alertConfig[variant]
  return (
    <div className={`relative flex gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`} role="alert">
      <span className="text-lg mt-0.5" aria-hidden="true">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={`font-semibold text-sm mb-0.5 ${cfg.titleColor}`}>{title}</p>}
        <div className={`text-sm ${cfg.textColor}`}>{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className={`flex-shrink-0 ${cfg.textColor} hover:opacity-70`} aria-label="Dismiss">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} aria-hidden="true" />
}

export function TicketCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

// ── GuestNavbar ──────────────────────────────────────────────────────────────

export { GuestNavbar } from './GuestNavbar'

// ── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title:       string
  subtitle?:   string
  action?:     React.ReactNode
  breadcrumb?: { label: string; href?: string }[]
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <nav className="mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-slate-500">
            {breadcrumb.map((item, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                {item.href
                  ? <a href={item.href} className="hover:text-slate-900 transition-colors">{item.label}</a>
                  : <span className="text-slate-900 font-medium">{item.label}</span>
                }
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:        string
  title:        string
  description?: string
  action?:      React.ReactNode
}

export function EmptyState({ icon = '📋', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      {description && <p className="text-slate-500 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}

// ── StatsCard ─────────────────────────────────────────────────────────────────

interface StatsCardProps {
  label:  string
  value:  string | number
  icon?:  string
  trend?: { value: string; up: boolean }
  color?: 'navy' | 'gold' | 'green' | 'red'
}

const statsColors: Record<string, string> = {
  navy:  'border-slate-200  bg-slate-50',
  gold:  'border-amber-200  bg-amber-50',
  green: 'border-green-200  bg-green-50',
  red:   'border-red-200    bg-red-50',
}

export function StatsCard({ label, value, icon, trend, color = 'navy' }: StatsCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${statsColors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
          <span aria-hidden="true">{trend.up ? '↑' : '↓'}</span>
          {trend.value}
        </div>
      )}
    </div>
  )
}

// ── NotificationDot ───────────────────────────────────────────────────────────

export function NotificationDot({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span
      className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold"
      aria-label={`${count} unread notifications`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
