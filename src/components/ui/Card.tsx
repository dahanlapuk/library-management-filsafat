import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-[var(--rule)] bg-[var(--white)] p-5 shadow-[0_1px_2px_rgba(24,22,0,0.05)] ${className}`}
    >
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatCard({
  label,
  value,
  hint,
  to,
  alert = false,
}: {
  label: string
  value: string | number
  hint?: string
  to: string
  alert?: boolean
}) {
  return (
    <Link
      to={to}
      className={`card-lift flex flex-col gap-1 rounded-xl border p-4 ${
        alert
          ? 'border-[var(--sun)] bg-[var(--pale-soft)]'
          : 'border-[var(--rule)] bg-[var(--white)]'
      }`}
    >
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </span>
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
    </Link>
  )
}
