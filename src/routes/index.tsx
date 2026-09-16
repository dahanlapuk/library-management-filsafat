import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  getBooks,
  searchBooks,
  getBook,
  getCategories,
  getBookStockBreakdown,
} from '../books/catalog'

export const Route = createFileRoute('/')({
  component: PublicCatalogPage,
  validateSearch: (search: Record<string, unknown>): { book?: number } => {
    const raw = search.book
    const num =
      typeof raw === 'string'
        ? Number(raw)
        : typeof raw === 'number'
          ? raw
          : undefined
    return { book: num !== undefined && Number.isFinite(num) ? num : undefined }
  },
})

const PAGE_SIZE_OPTIONS = [20, 40, 80] as const
const TOP_CATEGORY_COUNT = 10

type BookTag = { id: number; nama: string }

type BookRow = {
  id: number
  kode: string | null
  judul: string
  penulis: string | null
  tahun: number | null
  qty: number
  keterangan: string | null
  kategoriId: number | null
  kategoriNama: string | null
  posisiId: number | null
  posisiKode: string | null
  posisiRak: string | null
  isDipinjam: boolean
  tags: BookTag[]
}

type CategoryRow = {
  id: number
  nama: string
  grouping: 'bentuk' | 'konten' | 'lain' | null
  bookCount: number
}

const statusOptions: {
  value: 'dipinjam' | 'tersedia' | undefined
  label: string
}[] = [
  { value: undefined, label: 'Semua' },
  { value: 'tersedia', label: 'Tersedia' },
  { value: 'dipinjam', label: 'Dipinjam' },
]

// Dipakai di dalam modal detail untuk buku qty > 1. Komponen mandiri
// (fetch sendiri) supaya cuma dipanggil kalau memang perlu ditampilkan.
function StockLocationsList({ bookId }: { bookId: number }) {
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
          className="text-xs border border-[var(--gray-200)] bg-[var(--gray-100)] px-1.5 py-0.5"
        >
          {a.posisiKode ?? 'Tanpa rak'}: {a.qty}
        </li>
      ))}
    </ul>
  )
}

// Card ini sendiri sebuah Link (search param ?book=id) -- klik di mana
// pun di kartu membuka modal detail, tanpa navigasi ke halaman baru.
function BookCard({ book }: { book: BookRow }) {
  return (
    <Link
      to="/"
      search={{ book: book.id }}
      className="text-left border-2 border-[var(--black)] bg-[var(--white)] p-4 flex flex-col gap-2 hover:bg-[var(--gray-100)] transition-colors"
    >
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
        <p className="text-sm text-[var(--gray-600)]">
          {book.penulis}
          {book.tahun ? `, ${book.tahun}` : ''}
        </p>
      )}

      <div className="flex flex-wrap gap-1 text-xs text-[var(--gray-600)]">
        {book.kode && (
          <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
            {book.kode}
          </span>
        )}
        {book.kategoriNama && (
          <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
            {book.kategoriNama}
          </span>
        )}
        {book.posisiKode && (
          <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
            Rak {book.posisiKode}
          </span>
        )}
        <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
          Qty {book.qty}
        </span>
      </div>

      {book.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {book.tags.map((tag) => (
            <span
              key={tag.id}
              className="text-xs rounded-full border border-[var(--gray-200)] px-2 py-0.5 text-[var(--gray-600)]"
            >
              {tag.nama}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

// Modal detail buku, dikendalikan lewat search param ?book=<id> di route
// ini sendiri -- jadi tetap bisa dibagikan/dibuka lewat link langsung
// (refresh halaman dengan ?book=123 di URL akan langsung membuka modal
// yang sama), tanpa perlu route/halaman terpisah.
function BookDetailModal({
  bookId,
  onClose,
}: {
  bookId: number
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
                    : 'border-2 border-[var(--accent)] text-[var(--accent)]'
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

            <div className="flex flex-wrap gap-1 text-xs text-[var(--gray-600)]">
              {book.kode && (
                <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
                  {book.kode}
                </span>
              )}
              {book.kategoriNama && (
                <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
                  {book.kategoriNama}
                </span>
              )}
              {book.posisiKode && (
                <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
                  Rak {book.posisiKode}
                </span>
              )}
              <span className="border border-[var(--gray-200)] px-1.5 py-0.5">
                Qty {book.qty}
              </span>
            </div>

            {book.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {book.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs rounded-full border border-[var(--gray-200)] px-2 py-0.5 text-[var(--gray-600)]"
                  >
                    {tag.nama}
                  </span>
                ))}
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
          </>
        )}
      </div>
    </div>
  )
}

function PublicCatalogPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const selectedBookId = search.book

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedKategoriId, setSelectedKategoriId] = useState<number | null>(
    null,
  )
  const [status, setStatus] = useState<'dipinjam' | 'tersedia' | undefined>(
    undefined,
  )
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0])
  const [page, setPage] = useState(1)

  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAllCategories, setShowAllCategories] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedKategoriId, status, pageSize])

  const isSearching = debouncedSearch.length > 0

  const { data: categories = [] } = useQuery<CategoryRow[]>({
    queryKey: ['catalog-categories'],
    queryFn: () => getCategories(),
  })

  const { data: result, isLoading } = useQuery({
    queryKey: [
      'public-catalog',
      { page, pageSize, selectedKategoriId, status, isSearching, debouncedSearch },
    ],
    queryFn: () =>
      isSearching
        ? searchBooks({
            data: {
              q: debouncedSearch,
              page,
              limit: pageSize,
              kategoriId: selectedKategoriId ?? undefined,
              status,
            },
          })
        : getBooks({
            data: {
              page,
              limit: pageSize,
              kategoriId: selectedKategoriId ?? undefined,
              status,
            },
          }),
  })

  // Kategori diurutkan dari jumlah buku terbanyak. Grouping V1
  // (bentuk/konten/lain) SENGAJA tidak dipakai untuk mengelompokkan --
  // kolom itu 100% NULL di seluruh 87 kategori V1 (dikonfirmasi lewat
  // introspeksi langsung saat migrasi), jadi header grup tidak akan
  // pernah membedakan apa pun secara nyata. List flat + urutan by
  // jumlah buku lebih jujur terhadap data yang benar-benar ada.
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => b.bookCount - a.bookCount),
    [categories],
  )

  const filteredCategories = useMemo(() => {
    const term = categoryFilter.trim().toLowerCase()
    if (!term) return sortedCategories
    return sortedCategories.filter((c) => c.nama.toLowerCase().includes(term))
  }, [sortedCategories, categoryFilter])

  const isFilteringCategories = categoryFilter.trim().length > 0
  const visibleCategories =
    isFilteringCategories || showAllCategories
      ? filteredCategories
      : filteredCategories.slice(0, TOP_CATEGORY_COUNT)
  const hiddenCategoryCount = Math.max(
    0,
    filteredCategories.length - TOP_CATEGORY_COUNT,
  )

  const books: BookRow[] = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 1

  function closeModal() {
    navigate({ to: '/', search: {}, replace: true })
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b-4 border-[var(--black)] bg-[var(--white)] px-5 pt-10 pb-6">
        <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-[0.08em] uppercase text-[var(--text-primary)]">
            Pustaka Filsafat
          </h1>
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-[var(--gray-600)]">
            Katalog Perpustakaan Program Studi Ilmu Filsafat FIB UI
          </p>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 py-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-[240px] shrink-0 flex flex-col gap-4">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul, kode..."
            className="w-full text-sm p-2 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
          />

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Kategori
            </h2>

            <input
              type="search"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Cari kategori..."
              className="w-full text-xs p-1.5 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
            />

            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedKategoriId(null)}
                className={`text-left px-3 py-2 border-2 transition-colors ${
                  selectedKategoriId === null
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                    : 'border-[var(--gray-200)]'
                }`}
              >
                Semua Buku
              </button>

              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedKategoriId(cat.id)}
                  className={`text-left px-3 py-2 border-2 transition-colors flex items-center justify-between gap-2 ${
                    selectedKategoriId === cat.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                      : 'border-[var(--gray-200)]'
                  }`}
                >
                  <span>{cat.nama}</span>
                  <span className="text-xs text-[var(--gray-600)]">
                    {cat.bookCount}
                  </span>
                </button>
              ))}

              {!isFilteringCategories && hiddenCategoryCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((v) => !v)}
                  className="text-left px-3 py-2 text-sm text-[var(--gray-600)] underline underline-offset-2"
                >
                  {showAllCategories ? 'Sembunyikan' : `Lainnya (${hiddenCategoryCount})`}
                </button>
              )}

              {isFilteringCategories && filteredCategories.length === 0 && (
                <p className="text-xs text-[var(--gray-600)] px-1">
                  Tidak ada kategori yang cocok.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2">
              {statusOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-2 border-2 text-sm transition-colors ${
                    status === opt.value
                      ? 'border-[var(--black)] bg-[var(--gray-100)]'
                      : 'border-[var(--gray-200)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-[var(--gray-600)]">
              <label htmlFor="page-size">Tampilkan</label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border-2 border-[var(--gray-200)] px-2 py-1 focus:outline-none focus:border-[var(--black)]"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-[var(--gray-600)]">
            {isLoading ? 'Memuat...' : `${total} buku ditemukan`}
          </p>

          {isLoading ? (
            <p className="text-[var(--gray-600)] py-8 text-center">
              Memuat katalog...
            </p>
          ) : books.length === 0 ? (
            <div className="border-2 border-[var(--gray-200)] p-8 text-center text-[var(--gray-600)]">
              Tidak ada buku yang cocok dengan pencarian ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 border-2 border-[var(--black)] disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <span className="text-sm text-[var(--gray-600)]">
                Halaman {page} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 border-2 border-[var(--black)] disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t-2 border-[var(--black)] bg-[var(--white)] px-5 py-5 text-center">
        <Link
          to="/admin/login"
          className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
        >
          Masuk sebagai Admin →
        </Link>
      </footer>

      {selectedBookId !== undefined && (
        <BookDetailModal bookId={selectedBookId} onClose={closeModal} />
      )}
    </div>
  )
}
