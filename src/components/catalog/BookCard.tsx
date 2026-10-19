import { Link } from '@tanstack/react-router'
import type { BookRow } from './types'

export function BookCard({ book }: { book: BookRow }) {
  const orderedTags =
    book.kategoriId != null
      ? [...book.tags].sort((a, b) =>
          a.id === book.kategoriId ? -1 : b.id === book.kategoriId ? 1 : 0,
        )
      : book.tags

  return (
    <Link
      to="/"
      search={{ book: book.id }}
      className="text-left border-2 border-[var(--black)] bg-[var(--white)] flex flex-col h-full hover:bg-[var(--gray-100)] transition-colors overflow-hidden"
    >
      <div className="flex-1 flex flex-col p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-[var(--text-primary)] leading-snug">
              {book.judul}
            </span>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 ${
                book.isDipinjam
                  ? 'bg-[var(--black)] text-[var(--white)]'
                  : 'border-2 border-[var(--accent)] text-[var(--accent)]'
              }`}
            >
              {book.isDipinjam ? 'Dipinjam' : 'Tersedia'}
            </span>
          </div>

          {book.penulis && (
            <p className="text-sm text-[var(--gray-600)] -mt-1.5">
              {book.penulis}
              {book.tahun ? `, ${book.tahun}` : ''}
            </p>
          )}
        </div>

        {/* Grup bawah: kode/eks + tag -- mt-auto biar SELALU nempel di
            posisi yang sama (rapat ke footer rak), gak peduli judulnya
            pendek atau panjang. Ini yang bikin proporsi antar kartu
            konsisten/seragam. */}
        <div className="mt-auto flex flex-col gap-3 pt-4">
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
                      ? 'text-xs font-medium px-2 py-0.5 border-2 border-[var(--accent)] text-[var(--accent)]'
                      : 'text-xs rounded-full border border-[var(--gray-200)] px-2 py-0.5 text-[var(--gray-600)]'
                  }
                >
                  {tag.nama}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {book.posisiKode && (
        <div className="bg-[var(--black)] text-[var(--white)] text-center font-bold tracking-widest py-2 text-sm">
          {book.posisiKode.replace(/-/g, ' - ')}
        </div>
      )}
    </Link>
  )
}
