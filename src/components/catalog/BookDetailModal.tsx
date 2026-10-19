import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBook } from '../../books/catalog'
import { LoanRequestSection } from './LoanRequestSection'
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

  const orderedTags = book
    ? book.kategoriId != null
      ? [...book.tags].sort((a, b) =>
          a.id === book.kategoriId ? -1 : b.id === book.kategoriId ? 1 : 0,
        )
      : book.tags
    : []

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
      className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[640px] my-8 sm:my-0 border-2 border-[var(--black)] bg-[var(--white)] p-6 flex flex-col gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 text-[var(--gray-600)] hover:text-[var(--text-primary)] text-xl leading-none"
        >
          ✕
        </button>

        {isLoading ? (
          <p className="text-[var(--gray-600)] py-8 text-center">Memuat...</p>
        ) : isError || !book ? (
          <div className="text-center text-[var(--gray-600)] py-8">
            {error instanceof Error ? error.message : 'Buku tidak ditemukan.'}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 pr-6">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-snug">
                {book.judul}
              </h2>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 ${
                  book.isDipinjam
                    ? 'bg-[var(--black)] text-[var(--white)]'
                    : 'border-2 border-[var(--accent)] text-[var(--text-primary)]'
                }`}
              >
                {book.isDipinjam ? 'Dipinjam' : 'Tersedia'}
              </span>
            </div>

            {book.penulis && (
              <p className="text-sm text-[var(--gray-600)]">
                {book.penulis}
                {book.tahun ? `, ${book.tahun}` : ''}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 py-2 border-y-2 border-[var(--black)]">
              <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {book.kode ?? ''}
              </span>
              <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                {book.qty} Eks
              </span>
            </div>

            {orderedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {orderedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className={
                      tag.id === book.kategoriId
                        ? 'text-xs font-medium px-2 py-0.5 border-2 border-[var(--accent)] text-[var(--text-primary)]'
                        : 'text-xs rounded-full border border-[var(--gray-200)] px-2 py-0.5 text-[var(--gray-600)]'
                    }
                  >
                    {tag.nama}
                  </span>
                ))}
              </div>
            )}

            {book.posisiKode && (
              <div className="-mx-6 bg-[var(--black)] text-[var(--white)] text-center font-bold tracking-widest py-2 text-sm">
                {book.posisiKode.replace(/-/g, ' - ')}
              </div>
            )}

            {book.keterangan && (
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
                {book.keterangan}
              </p>
            )}

            {book.qty > 1 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Lokasi Stok
                </h3>
                <StockLocationsList bookId={book.id} />
              </div>
            )}

            <LoanRequestSection
              book={{ id: book.id, judul: book.judul, isDipinjam: book.isDipinjam }}
            />

            <Link
              to="/feedback"
              search={{ book: book.id, jenis: 'koreksi_buku' }}
              className="text-xs text-[var(--gray-600)] underline hover:text-[var(--black)]"
            >
              Ada data buku yang keliru? Laporkan koreksi
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
