import type { ReactNode } from 'react'
import { AdminHeader } from '../../admin/AdminHeader'

export function AdminPage({
  children,
  narrow = false,
  className = '',
}: {
  children: ReactNode
  narrow?: boolean
  className?: string
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <AdminHeader />
      <div className="md:pl-16 xl:pl-0">
      <main
        className={`mx-auto w-full px-5 py-6 sm:px-8 ${
          narrow ? 'max-w-[640px]' : 'max-w-[1280px]'
        } ${className}`}
      >
        {children}
      </main>
      </div>
    </div>
  )
}
