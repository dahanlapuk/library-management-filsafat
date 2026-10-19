import type { ReactNode } from 'react'

const TONES = {
  neutral: 'border border-[var(--rule)] bg-[var(--cream)] text-[var(--muted)]',
  solid: 'bg-[var(--ink)] text-[var(--cream)]',
  soft: 'border border-[var(--sun)] bg-[var(--pale)] text-[var(--ink)]',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof TONES
  children: ReactNode
}) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
