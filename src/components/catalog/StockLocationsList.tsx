import { useQuery } from '@tanstack/react-query'
import { getBookStockBreakdown } from '../../books/catalog'

// Dipakai di dalam modal detail untuk buku qty > 1. Komponen mandiri
// (fetch sendiri) supaya cuma dipanggil kalau memang perlu ditampilkan.
export function StockLocationsList({ bookId }: { bookId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['book-stock-breakdown', bookId],
    queryFn: () => getBookStockBreakdown({ data: { bookId } }),
  })

  if (isLoading) {
    return <p className="text-xs text-[var(--gray-600)]">Memuat lokasi...</p>
  }
  if (!data || data.allocations.length === 0) {
    return (
      <p className="text-xs text-[var(--gray-600)]">Lokasi belum tercatat.</p>
    )
  }
  return (
    <ul className="flex flex-wrap gap-1">
      {data.allocations.map((a) => (
        <li
          key={a.posisiId ?? 'tanpa-rak'}
          className="rounded-full border border-[var(--gray-200)] bg-[var(--gray-100)] px-2.5 py-0.5 text-xs"
        >
          {a.posisiKode ?? 'Tanpa rak'}: {a.qty}
        </li>
      ))}
    </ul>
  )
}
