import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBook } from '../../books/catalog'
import { eksLabel } from './BookCard'
import { BookTags } from './BookTags'
import { LoanRequestSection } from './LoanRequestSection'
import { StatusBadge } from './StatusBadge'
import { StockLocationsList } from './StockLocationsList'
import type { BookDetail } from './types'

export function BookDetailModal({
  bookId,
  initialBook,
  onClose,
}: {
  bookId: number
  initialBook?: BookDetail
  onClose: () => void
}) {
  const {
    data: book,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['book-detail', bookId],
    queryFn: () => getBook({ data: { id: bookId } }),
    initialData: initialBook,
    retry: false,
  })

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--ink)]/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative my-8 flex w-full max-w-[640px] flex-col gap-5 overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--white)] p-6 shadow-[0_24px_60px_-20px_rgba(24,22,0,0.45)] sm:my-0 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-[var(--muted)] hover:bg-[var(--pale-soft)] hover:text-[var(--ink)]"
        >
          ✕
        </button>

        {isLoading ? (
          <p className="py-8 text-center text-[var(--muted)]">Memuat...</p>
        ) : isError || !book ? (
          <div className="py-8 text-center text-[var(--muted)]">
            {error instanceof Error ? error.message : 'Buku tidak ditemukan.'}
          </div>
        ) : (
          <>
            <div className="flex flex-col items-start gap-3 pr-10">
              <StatusBadge isDipinjam={book.isDipinjam} />
              <div className="flex flex-col gap-1">
                <h2 className="font-[var(--font-heading)] text-2xl font-semibold leading-snug text-[var(--ink)] sm:text-[1.7rem]">
                  {book.judul}
                </h2>
                {book.penulis && (
                  <p className="text-sm text-[var(--muted)]">
                    {book.penulis}
                    {book.tahun ? `, ${book.tahun}` : ''}
                  </p>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[var(--pale-soft)] p-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[var(--muted)]">Kode</dt>
                <dd className="font-mono font-semibold text-[var(--ink)]">{book.kode || '—'}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-[var(--muted)]">Eksemplar</dt>
                <dd className="font-medium text-[var(--ink)]">{eksLabel(book.qty, book.sisa)}</dd>
              </div>
              {book.posisiKode && (
                <div className="col-span-2 flex items-center justify-between gap-3 rounded-lg bg-[var(--ink)] px-3 py-2 text-[var(--cream)]">
                  <span className="text-xs opacity-75">Posisi rak</span>
                  <span className="font-semibold tracking-widest">
                    {book.posisiKode.replace(/-/g, ' - ')}
                  </span>
                </div>
              )}
            </dl>

            <BookTags tags={book.tags} kategoriId={book.kategoriId} />

            {book.keterangan && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
                {book.keterangan}
              </p>
            )}

            {book.qty > 1 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Lokasi Stok</h3>
                <StockLocationsList bookId={book.id} />
              </div>
            )}

            <LoanRequestSection
              book={{ id: book.id, judul: book.judul, isDipinjam: book.isDipinjam }}
            />

            <Link
              to="/feedback"
              search={{ book: book.id, jenis: 'koreksi_buku' }}
              className="text-xs text-[var(--muted)] underline hover:text-[var(--ink)]"
            >
              Ada data buku yang keliru? Laporkan koreksi
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
