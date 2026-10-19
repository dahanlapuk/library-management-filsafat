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
        className="relative my-8 flex w-full max-w-[640px] flex-col gap-4 overflow-hidden border border-[var(--rule)] bg-[var(--white)] p-6 sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 text-xl leading-none text-[var(--muted)] hover:text-[var(--ink)]"
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
            <div className="flex flex-col items-start gap-3 pr-8">
              <StatusBadge isDipinjam={book.isDipinjam} />
              <h2 className="font-[var(--font-heading)] text-2xl font-semibold leading-snug text-[var(--ink)]">
                {book.judul}
              </h2>
            </div>

            {book.penulis && (
              <p className="text-sm text-[var(--muted)]">
                {book.penulis}
                {book.tahun ? `, ${book.tahun}` : ''}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 border-y border-[var(--rule)] py-2 text-sm">
              <span className="font-mono font-semibold text-[var(--ink)]">{book.kode ?? ''}</span>
              <span className="shrink-0 text-[var(--muted)]">{eksLabel(book.qty, book.sisa)}</span>
            </div>

            <BookTags tags={book.tags} kategoriId={book.kategoriId} />

            {book.posisiKode && (
              <div className="-mx-6 bg-[var(--ink)] py-2 text-center text-sm font-semibold tracking-widest text-[var(--cream)]">
                {book.posisiKode.replace(/-/g, ' - ')}
              </div>
            )}

            {book.keterangan && (
              <p className="whitespace-pre-line text-sm text-[var(--muted)]">{book.keterangan}</p>
            )}

            {book.qty > 1 && (
              <div className="flex flex-col gap-1">
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
