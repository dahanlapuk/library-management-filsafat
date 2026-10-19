import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBooks, searchBooks, getBook, getCategories } from '../books/catalog'
import { BookCard } from '../components/catalog/BookCard'
import { BookDetailModal } from '../components/catalog/BookDetailModal'
import { buildCategoryRows, TOP_CATEGORY_COUNT } from '../components/catalog/categories'
import type {
  BookDetail,
  BookRow,
  CategoryNode,
  CategoryRow,
} from '../components/catalog/types'

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
  loaderDeps: ({ search }) => ({ book: search.book }),
  // SSR detail buku untuk title/meta per-buku (SEO) -- modal-nya sendiri
  // tetap client-side seperti semula, ini cuma nyuntik data awal + head
  // tag lewat search param yang sama, tanpa route/halaman terpisah.
  loader: async ({ deps }): Promise<{ book: BookDetail | null }> => {
    if (deps.book === undefined) return { book: null }
    try {
      const book = await getBook({ data: { id: deps.book } })
      return { book }
    } catch {
      // Buku tidak ketemu / id ngawur -- jangan gagalkan seluruh route,
      // biarkan modal client-side yang nampilin pesan "tidak ditemukan".
      return { book: null }
    }
  },
  head: ({ loaderData }) => {
    const book = loaderData?.book
    if (!book) {
      return {
        links: [{ rel: 'canonical', href: 'https://biblioteka.filsafatui.app/' }],
        scripts: [
          {
            type: 'application/ld+json',
            children: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Biblioteka Departemen Filsafat UI',
              alternateName: [
                'Perpustakaan Filsafat UI',
                'Perpustakaan Departemen Filsafat UI',
                'Pustaka Filsafat UI',
                'Biblioteka Filsafat UI',
              ],
              url: 'https://biblioteka.filsafatui.app/',
            }),
          },
        ],
        meta: [
          { title: 'Biblioteka (Perpustakaan) Filsafat UI — Katalog Buku' },
          {
            name: 'description',
            content:
              'Katalog daring Biblioteka (perpustakaan) Filsafat UI: cari buku, jurnal, dan skripsi, lalu ajukan pinjam.',
          },
        ],
      }
    }
    const detail = [book.penulis, book.tahun ? String(book.tahun) : null, book.kode]
      .filter(Boolean)
      .join(' · ')
    return {
      links: [
        {
          rel: 'canonical',
          href: `https://biblioteka.filsafatui.app/?book=${book.id}`,
        },
      ],
      meta: [
        { title: `${book.judul} — Biblioteka Departemen Filsafat UI` },
        {
          name: 'description',
          content:
            detail || `Detail buku ${book.judul} di katalog Biblioteka Departemen Filsafat UI.`,
        },
      ],
    }
  },
})

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const

const statusOptions: {
  value: 'dipinjam' | 'tersedia' | undefined
  label: string
}[] = [
  { value: undefined, label: 'Semua' },
  { value: 'tersedia', label: 'Tersedia' },
  { value: 'dipinjam', label: 'Dipinjam' },
]

function PublicCatalogPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const selectedBookId = search.book
  const loaderData = Route.useLoaderData()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedKategoriId, setSelectedKategoriId] = useState<number | null>(
    null,
  )
  const [status, setStatus] = useState<'dipinjam' | 'tersedia' | undefined>(
    undefined,
  )
  const [pageSize, setPageSize] = useState<number>(20)
  const [page, setPage] = useState(1)

  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [mobileCatOpen, setMobileCatOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

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

  const { rows: allCategoryRows, totals: categoryTotals } = useMemo(
    () => buildCategoryRows(categories, () => true),
    [categories],
  )
  const treeCategoryRows = useMemo(
    () => buildCategoryRows(categories, (id) => expandedIds.has(id)).rows,
    [categories, expandedIds],
  )

  const filteredCategories = useMemo(() => {
    const term = categoryFilter.trim().toLowerCase()
    return allCategoryRows.filter((r) => r.path.toLowerCase().includes(term))
  }, [allCategoryRows, categoryFilter])

  const isFilteringCategories = categoryFilter.trim().length > 0
  const rootCategoryCount = treeCategoryRows.filter((r) => r.depth === 0).length
  const visibleCategories = useMemo(() => {
    if (isFilteringCategories) return filteredCategories
    if (showAllCategories) return treeCategoryRows
    const out: CategoryNode[] = []
    let roots = 0
    for (const row of treeCategoryRows) {
      if (row.depth === 0) roots++
      if (roots > TOP_CATEGORY_COUNT) break
      out.push(row)
    }
    return out
  }, [isFilteringCategories, showAllCategories, filteredCategories, treeCategoryRows])
  const hiddenCategoryCount = Math.max(0, rootCategoryCount - TOP_CATEGORY_COUNT)

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const books: BookRow[] = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 1

  function closeModal() {
    navigate({ to: '/', search: {}, replace: true, resetScroll: false })
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="border-b border-[var(--rule)] bg-[var(--sun-bright)] px-5 sm:px-8 py-8 sm:py-10">
        <div className="max-w-[1280px] mx-auto grid gap-1 lg:grid-cols-[1fr_26rem] lg:gap-x-10">
          <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl font-semibold leading-tight text-[var(--ink)]">
            Biblioteka Departemen Filsafat UI
          </h1>
          <p className="text-sm text-[var(--ink)]/75">
            Katalog koleksi · Fakultas Ilmu Pengetahuan Budaya
          </p>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul, kode..."
            aria-label="Cari buku"
            className="search-hero mt-3 w-full rounded-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center border border-[var(--ink)]/20 bg-[var(--white)] px-5 py-3 text-base shadow-sm"
          />
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-5 sm:px-8 py-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="lg:w-[260px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMobileCatOpen((v) => !v)}
              aria-expanded={mobileCatOpen}
              className="lg:hidden flex items-center justify-between gap-2 w-full text-left text-sm font-semibold text-[var(--text-primary)] rounded-lg bg-[var(--white)] px-3 py-2 border border-[var(--gray-200)]"
            >
              <span>
                Kategori: {categories.find((c) => c.id === selectedKategoriId)?.nama ?? 'Semua Buku'}
              </span>
              <span aria-hidden>{mobileCatOpen ? '▴' : '▾'}</span>
            </button>
            <h2 className="hidden lg:block text-sm font-semibold text-[var(--text-primary)]">
              Kategori
            </h2>

            <input
              type="search"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Cari kategori..."
              className={`w-full text-xs rounded-lg bg-[var(--white)] px-3 py-1.5 border border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)] ${mobileCatOpen ? '' : 'hidden'} lg:block`}
            />

            <div className={`flex-col gap-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto pr-1 ${mobileCatOpen ? 'flex' : 'hidden lg:flex'}`}>
              <button
                type="button"
                onClick={() => {
                  setSelectedKategoriId(null)
                  setMobileCatOpen(false)
                }}
                className={`text-left rounded-lg px-3 py-2 border transition-colors ${
                  selectedKategoriId === null
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                    : 'border-[var(--gray-200)]'
                }`}
              >
                Semua Buku
              </button>

              {visibleCategories.map(({ cat, depth, path, hasChildren }) => (
                <div
                  key={cat.id}
                  className="flex items-stretch gap-1"
                  style={{ marginLeft: isFilteringCategories ? 0 : depth * 16 }}
                >
                  {!isFilteringCategories &&
                    (hasChildren ? (
                      <button
                        type="button"
                        aria-label={
                          expandedIds.has(cat.id) ? 'Tutup subkategori' : 'Buka subkategori'
                        }
                        onClick={() => toggleExpanded(cat.id)}
                        className="w-7 shrink-0 rounded-lg border border-[var(--gray-200)] text-xs text-[var(--gray-600)]"
                      >
                        {expandedIds.has(cat.id) ? '−' : '+'}
                      </button>
                    ) : (
                      <span className="w-7 shrink-0" />
                    ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKategoriId(cat.id)
                      setMobileCatOpen(false)
                    }}
                    className={`flex-1 text-left rounded-lg px-3 py-2 border transition-colors flex items-center justify-between gap-2 ${
                      selectedKategoriId === cat.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                        : 'border-[var(--gray-200)]'
                    }`}
                  >
                    <span>{isFilteringCategories ? path : cat.nama}</span>
                    <span className="text-xs text-[var(--gray-600)]">
                      {categoryTotals.get(cat.id) ?? cat.bookCount}
                    </span>
                  </button>
                </div>
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
                  className={`rounded-full px-4 py-2 border text-sm transition-colors ${
                    status === opt.value
                      ? 'border-[var(--sun)] bg-[var(--accent-soft)]'
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
                className="rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-2 py-1 focus:outline-none focus:border-[var(--black)]"
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
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
              aria-label="Memuat katalog"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl border border-[var(--rule)] bg-[var(--pale-soft)]"
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-xl border border-[var(--gray-200)] p-8 text-center text-[var(--gray-600)]">
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
                className="rounded-lg border border-[var(--rule)] bg-[var(--white)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--pale-soft)] disabled:opacity-40 disabled:hover:bg-[var(--white)]"
              >
                ← Sebelumnya
              </button>
              <span className="text-sm text-[var(--gray-600)]">
                <span className="hidden sm:inline">Halaman</span><span className="sm:hidden">Hal.</span> {page} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-[var(--rule)] bg-[var(--white)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--pale-soft)] disabled:opacity-40 disabled:hover:bg-[var(--white)]"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </section>
      </main>

      {selectedBookId !== undefined && (
        <BookDetailModal
          bookId={selectedBookId}
          initialBook={
            loaderData?.book?.id === selectedBookId ? loaderData.book : undefined
          }
          onClose={closeModal}
        />
      )}
    </div>
  )
}
