import type { ReactNode } from 'react'

export const authLink =
  'text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]'

export function AuthShell({
  subtitle,
  children,
  footer,
}: {
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--cream)]">
      <div className="h-1.5 bg-[var(--sun-bright)]" />
      <div className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-[480px]">
          <div className="mb-6 text-center">
            <h1
              className="mb-1 text-2xl font-semibold sm:text-3xl"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Biblioteka Filsafat UI
            </h1>
            <p className="text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-[var(--rule)] bg-[var(--white)] p-5 shadow-[0_1px_2px_rgba(24,22,0,0.05)] sm:p-6">
            {children}
          </div>
          {footer && <div className="mt-5 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  )
}

export function AuthTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-5 text-center">
      <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
        {children}
      </h2>
      {hint && <p className="mt-1.5 text-sm text-[var(--muted)]">{hint}</p>}
    </div>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {children}
    </div>
  )
}

export function AdminRadioList<T extends { id: string; nama: string; title?: string | null }>({
  admins,
  selectedId,
  onSelect,
  renderBadge,
}: {
  admins: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  renderBadge?: (admin: T) => ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {admins.map((admin) => (
        <label
          key={admin.id}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors ${
            selectedId === admin.id
              ? 'border-[var(--sun)] bg-[var(--pale)]'
              : 'border-[var(--rule)] bg-[var(--white)] hover:bg-[var(--pale-soft)]'
          }`}
        >
          <input
            type="radio"
            name="admin"
            value={admin.id}
            checked={selectedId === admin.id}
            onChange={() => onSelect(admin.id)}
            className="h-5 w-5 shrink-0 accent-[var(--ink)]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="break-words font-semibold">{admin.nama}</span>
            {admin.title && (
              <span className="break-words text-sm text-[var(--muted)]">{admin.title}</span>
            )}
            {renderBadge?.(admin)}
          </div>
        </label>
      ))}
    </div>
  )
}
