type PeranInput = { isDeveloper?: boolean; isSuperadmin?: boolean }

export type Peran = 'developer' | 'superadmin' | 'admin'

// Hierarki: developer ⊃ superadmin ⊃ admin. Yang tertinggi yang ditampilkan.
export function peranOf(a: PeranInput): Peran {
  if (a.isDeveloper) return 'developer'
  if (a.isSuperadmin) return 'superadmin'
  return 'admin'
}

const LABEL: Record<Peran, string> = {
  developer: 'Developer',
  superadmin: 'Superadmin',
  admin: 'Admin',
}

const TERANG: Record<Peran, string> = {
  developer: 'bg-[var(--black)] text-[var(--white)] border-[var(--black)]',
  superadmin: 'bg-transparent text-[var(--black)] border-[var(--black)]',
  admin: '',
}

const GELAP: Record<Peran, string> = {
  developer: 'bg-[var(--accent)] text-[var(--black)] border-[var(--accent)]',
  superadmin: 'bg-transparent text-[var(--accent)] border-[var(--accent)]',
  admin: '',
}

// Admin biasa tidak diberi lencana. onDark = dipakai di atas latar hitam (header).
export function PeranBadge({ admin, onDark = false }: { admin: PeranInput; onDark?: boolean }) {
  const peran = peranOf(admin)
  if (peran === 'admin') return null
  return (
    <span
      className={`inline-block w-fit border px-2 py-0.5 text-xs font-semibold ${
        (onDark ? GELAP : TERANG)[peran]
      }`}
    >
      {LABEL[peran]}
    </span>
  )
}
