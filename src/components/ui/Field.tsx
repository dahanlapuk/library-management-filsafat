import type { ComponentProps } from 'react'

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={`rounded-lg border border-[var(--rule)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--sun)] focus:outline-none ${className}`}
      {...props}
    />
  )
}
