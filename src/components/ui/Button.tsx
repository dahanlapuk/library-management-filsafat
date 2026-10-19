import type { ComponentProps } from 'react'

const VARIANTS = {
  primary:
    'bg-[var(--ink)] text-[var(--cream)] border border-[var(--ink)] hover:bg-[var(--muted)]',
  secondary:
    'bg-[var(--white)] text-[var(--ink)] border border-[var(--rule)] hover:bg-[var(--pale-soft)]',
  accent:
    'bg-[var(--pale)] text-[var(--ink)] border border-[var(--sun)] hover:bg-[var(--sun-bright)]',
  quiet:
    'bg-transparent text-[var(--muted)] border border-[var(--rule)] hover:bg-[var(--pale-soft)]',
  danger:
    'bg-[var(--white)] text-red-700 border border-red-200 hover:bg-red-50',
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      type={type}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Chip({
  active = false,
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? 'border-[var(--sun)] bg-[var(--pale)] font-medium text-[var(--ink)]'
          : 'border-[var(--rule)] bg-[var(--white)] text-[var(--muted)] hover:bg-[var(--pale-soft)]'
      } ${className}`}
      {...props}
    />
  )
}

export function buttonClass(variant: keyof typeof VARIANTS = 'secondary', extra = '') {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${VARIANTS[variant]} ${extra}`
}
