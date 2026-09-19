import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminHeader } from '../../admin/AdminHeader'
import { getPosisiList } from '../../books/admin'
import {
  getPosisiWithProgress,
  getBooksForInventoryCheck,
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

// Draft per buku -- qty, posisi tujuan (null = Belum Ditempatkan), dan
// catatan opsional. Direset begitu simpan sukses.
type Draft = { qty: number; posisiId: number | null; catatan: string }

function InventoryCheckPage() {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<Selection>('none')
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})

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

  const posisiProgressList = posisiProgressQuery.data ?? []
  const posisiList = posisiListQuery.data ?? []
  const bookList = booksQuery.data ?? []

  function getDraft(book: { id: number; qty: number }): Draft {
    if (drafts[book.id]) return drafts[book.id]
    return {
      qty: book.qty,
      posisiId: selection === 'unpositioned' ? null : (selection as number),
      catatan: '',
    }
  }

  function setDraft(bookId: number, patch: Partial<Draft>, base: Draft) {
    setDrafts((prev) => ({ ...prev, [bookId]: { ...base, ...patch } }))
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-6xl mx-auto">
        <AdminHeader />
        <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 shrink-0">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--gray-600)]">
            Posisi Rak
          </h2>
          {posisiProgressQuery.isLoading && (
            <p className="text-sm text-[var(--gray-600)]">Memuat...</p>
          )}
          <ul className="max-h-64 md:max-h-[70vh] space-y-1 overflow-y-auto">
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
                    className={`flex w-full items-center justify-between border px-3 py-2 text-left text-sm ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : isUnpositioned
                          ? 'border-dashed border-[var(--gray-600)]'
                          : 'border-[var(--gray-200)]'
                    }`}
                  >
                    <span>
                      {p.kode}
                      {!isUnpositioned && (
                        <span className="ml-1 text-[var(--gray-600)]">({p.rak})</span>
                      )}
                    </span>
                    <span
                      className={`text-xs ${
                        belum > 0 ? 'font-semibold text-[var(--accent)]' : 'text-[var(--gray-600)]'
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

        <section className="flex-1">
          <h1 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
            Inventory Check
          </h1>

          {selection === 'none' && (
            <p className="text-sm text-[var(--gray-600)]">
              Pilih rak (atau "Belum Ditempatkan") di sidebar untuk mulai checklist.
            </p>
          )}

          {selection !== 'none' && (
            <>
              {booksQuery.isLoading && (
                <p className="text-sm text-[var(--gray-600)]">Memuat buku...</p>
              )}
              {!booksQuery.isLoading && bookList.length === 0 && (
                <p className="text-sm text-[var(--gray-600)]">Tidak ada buku di sini.</p>
              )}

              <ul className="space-y-3">
                {bookList.map((book) => {
                  const draft = getDraft(book)
                  const belumPernahDicek = book.lastChecked === null
                  const isSaving =
                    checkMutation.isPending &&
                    checkMutation.variables?.data.bookId === book.id

                  return (
                    <li key={book.id} className="border border-[var(--gray-200)] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{book.judul}</p>
                          <p className="text-xs text-[var(--gray-600)]">
                            {book.kode ?? '(tanpa kode)'}
                          </p>
                          {belumPernahDicek ? (
                            <span className="mt-1 inline-block border border-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                              Belum pernah dicek
                            </span>
                          ) : (
                            <p className="mt-1 text-xs text-[var(--gray-600)]">
                              Terakhir dicek {formatTanggal(book.lastChecked)}
                              {book.checkedBy ? ` oleh ${book.checkedBy}` : ''}
                            </p>
                          )}
                          {book.lastCheckCatatan && (
                            <p className="mt-1 text-xs italic text-[var(--accent)]">
                              Catatan sebelumnya: {book.lastCheckCatatan}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[var(--gray-600)]">
                              Sistem: {book.qty}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={draft.qty}
                              onChange={(e) =>
                                setDraft(book.id, { qty: Number(e.target.value) }, draft)
                              }
                              className="w-20 border border-[var(--gray-200)] px-2 py-1 text-sm"
                            />
                          </div>

                          <select
                            value={draft.posisiId === null ? UNPOSITIONED_VALUE : draft.posisiId}
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
                            className="border border-[var(--gray-200)] px-2 py-1 text-xs"
                          >
                            <option value={UNPOSITIONED_VALUE}>Belum Ditempatkan</option>
                            {posisiList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.kode} ({p.rak})
                              </option>
                            ))}
                          </select>

                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft(
                                  book.id,
                                  {
                                    qty: 0,
                                    posisiId: null,
                                    catatan: 'Tidak ditemukan di rak manapun, perlu ditelusuri.',
                                  },
                                  draft,
                                )
                              }
                              className="border border-[var(--gray-600)] px-2 py-0.5 text-xs text-[var(--gray-600)]"
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
                                    catatan: 'Kemungkinan sedang dipinjam, belum tercatat sistem.',
                                  },
                                  draft,
                                )
                              }
                              className="border border-[var(--gray-600)] px-2 py-0.5 text-xs text-[var(--gray-600)]"
                            >
                              Sedang dipinjam?
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Catatan (opsional)"
                            value={draft.catatan}
                            onChange={(e) =>
                              setDraft(book.id, { catatan: e.target.value }, draft)
                            }
                            className="w-48 border border-[var(--gray-200)] px-2 py-1 text-xs"
                          />

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              checkMutation.mutate({
                                data: {
                                  bookId: book.id,
                                  newPosisiId: draft.posisiId,
                                  actualQty: draft.qty,
                                  catatan: draft.catatan || undefined,
                                },
                              })
                            }
                            className="border border-[var(--black)] px-3 py-1 text-sm font-medium disabled:opacity-50"
                          >
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                          </button>
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
      </div>
    </div>
  )
}
