export function StatusBadge({ isDipinjam }: { isDipinjam: boolean }) {
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isDipinjam
          ? 'bg-[var(--ink)] text-[var(--cream)]'
          : 'border border-[var(--sun)] bg-[var(--pale)] text-[var(--ink)]'
      }`}
    >
      {isDipinjam ? 'Dipinjam' : 'Tersedia'}
    </span>
  )
}
