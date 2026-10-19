import { Link } from '@tanstack/react-router'
import { BookTags } from './BookTags'
import { StatusBadge } from './StatusBadge'
import type { BookRow } from './types'

export function eksLabel(qty: number, sisa: number) {
  return qty > 1 ? `${sisa} dari ${qty} Eks tersedia` : `${qty} Eks`
}

export function BookCard({ book }: { book: BookRow }) {
  return (
    <Link
      to="/"
      search={{ book: book.id }}
      resetScroll={false}
      className="card-lift flex h-full flex-col overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] text-left"
    >
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-[var(--font-heading)] text-base font-semibold leading-snug sm:text-lg text-[var(--ink)]">
            {book.judul}
          </span>
          <StatusBadge isDipinjam={book.isDipinjam} />
        </div>

        {book.penulis && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {book.penulis}
            {book.tahun ? `, ${book.tahun}` : ''}
          </p>
        )}

        {/* mt-auto: kode dan tag selalu rapat ke bilah rak, berapa pun panjang judul. */}
        <div className="mt-auto flex flex-col gap-3 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-[var(--rule)] pt-3 text-sm">
            <span className="font-mono font-semibold text-[var(--ink)]">{book.kode ?? ''}</span>
            <span className="shrink-0 text-[var(--muted)]">{eksLabel(book.qty, book.sisa)}</span>
          </div>
          <div className="hidden sm:block">
            <BookTags tags={book.tags} kategoriId={book.kategoriId} />
          </div>
        </div>
      </div>

      {book.posisiKode && (
        <div className="bg-[var(--ink)] py-2 text-center text-xs font-semibold tracking-widest text-[var(--cream)]">
          {book.posisiKode.replace(/-/g, ' - ')}
        </div>
      )}
    </Link>
  )
}
