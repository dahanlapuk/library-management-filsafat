import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button, Chip } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { getPosisiList } from '../../books/admin'
import {
  getPosisiWithProgress,
  getBooksForInventoryCheck,
  searchBooksForInventoryCheck,
  submitInventoryCheck,
} from '../../books/inventory'

export const Route = createFileRoute('/admin/inventory')({
  component: InventoryCheckPage,
})

const UNPOSITIONED_VALUE = '__unpositioned__'

type Selection = 'none' | 'unpositioned' | number

function formatTanggal(value: string | Date | null) {
  if (!value) return null
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// posisiId null = Belum Ditempatkan. Direset setelah simpan sukses.
type Draft = { qty: number; posisiId: number | null; catatan: string }

// posisiId/posisiKode hanya ada di hasil search.
type InventoryBookRow = {
  id: number
  kode: string | null
  judul: string
  qty: number
  lastChecked: string | Date | null
  checkedBy: string | null
  lastCheckCatatan: string | null
  posisiId?: number | null
  posisiKode?: string | null
}

function InventoryCheckPage() {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<Selection>('none')
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [urutan, setUrutan] = useState<'rak' | 'jumlah'>('rak')
  const [hanyaBelum, setHanyaBelum] = useState(false)
  const [detailOpen, setDetailOpen] = useState<Record<number, boolean>>({})

  // Search lintas semua rak, independen dari rak yang dipilih.
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])
  const isSearching = debouncedSearch.length > 0

  const posisiProgressQuery = useQuery({
    queryKey: ['inventory', 'posisi'],
    queryFn: () => getPosisiWithProgress(),
  })

  const posisiListQuery = useQuery({
    queryKey: ['inventory', 'posisi-list'],
    queryFn: () => getPosisiList(),
  })

  const booksQuery = useQuery({
    queryKey: ['inventory', 'books', selection],
    queryFn: () =>
      getBooksForInventoryCheck({
        data: { posisiId: selection === 'unpositioned' ? null : (selection as number) },
      }),
    enabled: selection !== 'none',
  })

  const searchQuery = useQuery({
    queryKey: ['inventory', 'search', debouncedSearch],
    queryFn: () => searchBooksForInventoryCheck({ data: { q: debouncedSearch } }),
    enabled: isSearching,
  })

  const checkMutation = useMutation({
    mutationFn: submitInventoryCheck,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'posisi'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'books'] })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[variables.data.bookId]
        return next
      })
    },
  })

  const posisiProgress = posisiProgressQuery.data ?? []
  // Mode 'jumlah': belum-dicek terbanyak di atas.
  const posisiProgressList =
    urutan === 'rak'
      ? posisiProgress
      : [
          ...posisiProgress.filter((p) => p.id === null),
          ...posisiProgress
            .filter((p) => p.id !== null)
            .sort((a, b) => b.totalBuku - b.sudahDicek - (a.totalBuku - a.sudahDicek)),
        ]
  const posisiList = posisiListQuery.data ?? []
  const bookList: InventoryBookRow[] = booksQuery.data ?? []
  const searchResults: InventoryBookRow[] = searchQuery.data ?? []

  const displayList: InventoryBookRow[] = isSearching ? searchResults : bookList
  const isLoadingList = isSearching ? searchQuery.isLoading : booksQuery.isLoading
  const showList = isSearching || selection !== 'none'

  // Hasil search: default ke posisi asli buku. List per-rak: ikut rak terpilih.
  function getDraft(book: InventoryBookRow): Draft {
    if (drafts[book.id]) return drafts[book.id]
    const defaultPosisiId =
      book.posisiId !== undefined
        ? book.posisiId
        : selection === 'unpositioned'
          ? null
          : (selection as number)
    return { qty: book.qty, posisiId: defaultPosisiId, catatan: '' }
  }

  function setDraft(bookId: number, patch: Partial<Draft>, base: Draft) {
    setDrafts((prev) => ({ ...prev, [bookId]: { ...base, ...patch } }))
  }

  const sudah = displayList.filter((b) => b.lastChecked !== null).length
  const visibleList =
    hanyaBelum && !isSearching ? displayList.filter((b) => b.lastChecked === null) : displayList

  function simpan(book: InventoryBookRow, draft: Draft) {
    checkMutation.mutate({
      data: {
        bookId: book.id,
        newPosisiId: draft.posisiId,
        actualQty: draft.qty,
        catatan: draft.catatan || undefined,
      },
    })
  }

  const smallBtn =
    'rounded-full border border-[var(--rule)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:bg-[var(--pale-soft)]'

  return (
    <AdminPage>
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-64">
          <h2 className="mb-2 text-sm font-medium text-[var(--muted)]">Posisi Rak</h2>
          <div className="mb-3 flex gap-2">
            {(
              [
                ['rak', 'Urutan rak'],
                ['jumlah', 'Jumlah'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                active={urutan === value}
                onClick={() => setUrutan(value)}
                className="text-xs"
              >
                {label}
              </Chip>
            ))}
          </div>
          {posisiProgressQuery.isLoading && (
            <p className="text-sm text-[var(--muted)]">Memuat...</p>
          )}
          <ul className="max-h-64 space-y-1.5 overflow-y-auto md:max-h-[70vh]">
            {posisiProgressList.map((p) => {
              const belum = p.totalBuku - p.sudahDicek
              const isUnpositioned = p.id === null
              const isSelected = isUnpositioned
                ? selection === 'unpositioned'
                : selection === p.id
              return (
                <li key={p.id ?? 'unpositioned'}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelection(isUnpositioned ? 'unpositioned' : (p.id as number))
                    }
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'border-[var(--sun)] bg-[var(--pale)]'
                        : isUnpositioned
                          ? 'border-dashed border-[var(--muted)] bg-[var(--white)] hover:bg-[var(--pale-soft)]'
                          : 'border-[var(--rule)] bg-[var(--white)] hover:bg-[var(--pale-soft)]'
                    }`}
                  >
                    <span>
                      {p.kode}
                      {!isUnpositioned && (
                        <span className="ml-1 text-[var(--muted)]">({p.rak})</span>
                      )}
                    </span>
                    <span
                      className={`text-xs ${
                        belum > 0 ? 'font-semibold' : 'text-[var(--muted)]'
                      }`}
                    >
                      {p.sudahDicek}/{p.totalBuku}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="min-w-0 flex-1">
          <h1 className="mb-4 text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Inventory Check
          </h1>

          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul atau kode buku (lintas semua rak)..."
            className="mb-4 w-full"
          />

          {!showList && (
            <p className="text-sm text-[var(--muted)]">
              Pilih rak (atau "Belum Ditempatkan") di samping, atau cari nama/kode buku di atas
              untuk mulai checklist.
            </p>
          )}

          {showList && (
            <>
              {isSearching && (
                <p className="mb-3 text-xs text-[var(--muted)]">
                  Hasil cari lintas semua rak. Posisi tujuan default mengikuti posisi tercatat
                  buku itu sekarang, bukan rak yang dipilih.
                </p>
              )}
              {!isSearching && displayList.length > 0 && (
                <div className="mb-4 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted)]">
                    <span>
                      {sudah} dari {displayList.length} sudah dicek
                    </span>
                    <Chip
                      active={hanyaBelum}
                      onClick={() => setHanyaBelum((v) => !v)}
                      className="text-xs"
                    >
                      Hanya yang belum dicek
                    </Chip>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full border border-[var(--rule)] bg-[var(--pale-soft)]">
                    <div
                      className="h-full bg-[var(--sun)] transition-all"
                      style={{ width: `${Math.round((sudah / displayList.length) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {checkMutation.isError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {checkMutation.error instanceof Error
                    ? checkMutation.error.message
                    : 'Gagal menyimpan.'}
                </div>
              )}
              {checkMutation.isSuccess && (
                <p className="mb-3 text-sm text-[var(--muted)]">Tersimpan.</p>
              )}
              {isLoadingList && <p className="text-sm text-[var(--muted)]">Memuat buku...</p>}
              {!isLoadingList && visibleList.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  {isSearching
                    ? 'Tidak ada buku yang cocok.'
                    : displayList.length > 0
                      ? 'Semua buku di rak ini sudah dicek.'
                      : 'Tidak ada buku di sini.'}
                </p>
              )}

              <ul className="space-y-3">
                {visibleList.map((book) => {
                  const draft = getDraft(book)
                  const terbuka = detailOpen[book.id] ?? book.qty === 0
                  const belumPernahDicek = book.lastChecked === null
                  const isSaving =
                    checkMutation.isPending &&
                    checkMutation.variables?.data.bookId === book.id

                  return (
                    <li
                      key={book.id}
                      className="rounded-xl border border-[var(--rule)] bg-[var(--white)] p-4 shadow-[0_1px_2px_rgba(24,22,0,0.05)]"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="break-words font-semibold">{book.judul}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {book.kode ?? '(tanpa kode)'}
                          {isSearching && (
                            <>
                              {' · '}Rak sekarang:{' '}
                              <span className="font-medium text-[var(--ink)]">
                                {book.posisiKode ?? 'Belum Ditempatkan'}
                              </span>
                            </>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          {belumPernahDicek ? (
                            <Badge tone="soft">Belum pernah dicek</Badge>
                          ) : (
                            <span>
                              Terakhir dicek {formatTanggal(book.lastChecked)}
                              {book.checkedBy ? ` oleh ${book.checkedBy}` : ''}
                            </span>
                          )}
                        </div>
                        {book.lastCheckCatatan && (
                          <p className="break-words text-xs italic">
                            Catatan sebelumnya: {book.lastCheckCatatan}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-3 border-t border-[var(--rule)] pt-3">
                        {terbuka && (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="text-xs text-[var(--muted)]">
                                Sistem: {book.qty}
                              </label>
                              <Input
                                type="number"
                                min={0}
                                value={draft.qty}
                                onChange={(e) =>
                                  setDraft(book.id, { qty: Number(e.target.value) }, draft)
                                }
                                className="w-24"
                              />
                              <Select
                                value={
                                  draft.posisiId === null ? UNPOSITIONED_VALUE : draft.posisiId
                                }
                                onChange={(e) =>
                                  setDraft(
                                    book.id,
                                    {
                                      posisiId:
                                        e.target.value === UNPOSITIONED_VALUE
                                          ? null
                                          : Number(e.target.value),
                                    },
                                    draft,
                                  )
                                }
                                className="min-w-0 flex-1 sm:flex-none"
                              >
                                <option value={UNPOSITIONED_VALUE}>Belum Ditempatkan</option>
                                {posisiList.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.kode} ({p.rak})
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft(
                                    book.id,
                                    {
                                      qty: 0,
                                      posisiId: null,
                                      catatan:
                                        'Tidak ditemukan di rak manapun, perlu ditelusuri.',
                                    },
                                    draft,
                                  )
                                }
                                className={smallBtn}
                              >
                                Tidak ditemukan
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft(
                                    book.id,
                                    {
                                      qty: 0,
                                      catatan:
                                        'Kemungkinan sedang dipinjam, belum tercatat sistem.',
                                    },
                                    draft,
                                  )
                                }
                                className={smallBtn}
                              >
                                Sedang dipinjam?
                              </button>
                            </div>
                            <Input
                              type="text"
                              placeholder="Catatan (opsional)"
                              value={draft.catatan}
                              onChange={(e) =>
                                setDraft(book.id, { catatan: e.target.value }, draft)
                              }
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="accent"
                            disabled={isSaving}
                            onClick={() => simpan(book, draft)}
                          >
                            {isSaving ? 'Menyimpan...' : terbuka ? 'Simpan' : 'Ada, sesuai'}
                          </Button>
                          <Button
                            variant="quiet"
                            onClick={() =>
                              setDetailOpen((prev) => ({ ...prev, [book.id]: !terbuka }))
                            }
                          >
                            {terbuka ? 'Tutup detail' : 'Ada selisih / ubah'}
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </AdminPage>
  )
}
