export function StatusBadge({
  isDipinjam,
  tidakTersedia,
}: {
  isDipinjam: boolean
  tidakTersedia: boolean
}) {
  const label = tidakTersedia ? 'Tidak tersedia' : isDipinjam ? 'Dipinjam' : 'Tersedia'
  const style = tidakTersedia
    ? 'border border-[var(--rule)] bg-[var(--cream)] text-[var(--gray-600)]'
    : isDipinjam
      ? 'bg-[var(--ink)] text-[var(--cream)]'
      : 'border border-[var(--sun)] bg-[var(--pale)] text-[var(--ink)]'
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  )
}
