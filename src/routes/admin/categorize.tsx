import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { AdminHeader } from '../../admin/AdminHeader'
import { getCategories } from '../../books/catalog'
import { bulkCategorize, getBooksForCategorizing } from '../../books/categorize'

export const Route = createFileRoute('/admin/categorize')({
  component: CategorizePage,
})

type Mode = 'tanpa' | 'semua' | 'kategori' | 'tag'

const MAX_SELECT = 200
const SHOW_TAG_ACTIONS = false

function CategorizePage() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('tanpa')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [kategoriTarget, setKategoriTarget] = useState('')
  const [tagTarget, setTagTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(rawSearch.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [rawSearch])

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  const kategoriOptions = useMemo(() => {
    const kategori = cats.filter((c) => c.kind === 'kategori')
    const byParent = new Map<number | null, typeof kategori>()
    for (const c of kategori) {
      const list = byParent.get(c.parentId) ?? []
      list.push(c)
      byParent.set(c.parentId, list)
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama))
    }
    const out: { id: number; label: string }[] = []
    function walk(parentId: number | null, path: string[]) {
      for (const c of byParent.get(parentId) ?? []) {
        const next = [...path, c.nama]
        out.push({ id: c.id, label: next.join(' › ') })
        walk(c.id, next)
      }
    }
    walk(null, [])
    return out
  }, [cats])

  const tagOptions = useMemo(
    () =>
      cats
        .filter((c) => c.kind === 'tag')
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .map((c) => ({ id: c.id, label: c.nama })),
    [cats],
  )

  const labelOf = useMemo(
    () => new Map(kategoriOptions.map((o) => [o.id, o.label])),
    [kategoriOptions],
  )

  const needsCategory = mode === 'kategori' || mode === 'tag'

  const { data: result, isLoading } = useQuery({
    queryKey: ['categorize-books', { mode, categoryId, search, page }],
    queryFn: () =>
      getBooksForCategorizing({
        data: { page, limit: 50, q: search || undefined, mode, categoryId },
      }),
    enabled: !needsCategory || categoryId !== undefined,
  })

  const books = result?.data ?? []
  const totalPages = result?.totalPages ?? 1

  useEffect(() => {
    if (result && page > result.totalPages) setPage(result.totalPages)
  }, [result, page])

  const pageIds = books.map((b) => b.id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of pageIds) {
        if (allOnPage) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function apply(
    payload: { kategoriId?: number | null; addTagIds?: number[]; removeTagIds?: number[] },
    clearAfter: boolean,
  ) {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const res = await bulkCategorize({ data: { bookIds: [...selected], ...payload } })
      setInfo(`${res.jumlah} buku diperbarui.`)
      if (clearAfter) setSelected(new Set())
      await queryClient.invalidateQueries({ queryKey: ['categorize-books'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses.')
    } finally {
      setBusy(false)
    }
  }

  function handleApplyKategori() {
    if (kategoriTarget === 'kosong') {
      if (!window.confirm(`Kosongkan kategori utama ${selected.size} buku?`)) return
      apply({ kategoriId: null }, true)
    } else if (kategoriTarget) {
      apply({ kategoriId: Number(kategoriTarget) }, true)
    }
  }

  function handleTag(aksi: 'tambah' | 'hapus') {
    if (!tagTarget) return
    const id = Number(tagTarget)
    apply(aksi === 'tambah' ? { addTagIds: [id] } : { removeTagIds: [id] }, false)
  }

  const filterOptions = mode === 'kategori' ? kategoriOptions : tagOptions
  const tooMany = selected.size > MAX_SELECT
  const selectClass =
    'border-2 border-[var(--gray-200)] bg-[var(--white)] p-3 focus:outline-none focus:border-[var(--black)]'

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="mx-auto w-full max-w-6xl">
        <AdminHeader />

        <h1 className="mb-2 text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
          Kategorisasi Massal
        </h1>
        <p className="mb-6 text-sm text-[var(--gray-600)]">
          Centang buku, lalu pasang satu kategori utama atau tambah/hapus tag untuk semuanya
          sekaligus.
        </p>

        {error && (
          <div className="mb-4 border border-[#fcc] bg-[#fee] p-3 text-[#c00]">{error}</div>
        )}
        {info && (
          <div className="mb-4 border border-[var(--gray-200)] bg-[var(--white)] p-3 text-sm">
            {info}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode)
              setCategoryId(undefined)
              setPage(1)
            }}
            className={selectClass}
          >
            <option value="tanpa">Belum dikategorikan</option>
            <option value="semua">Semua buku</option>
            <option value="kategori">Kategori tertentu (termasuk turunannya)</option>
            <option value="tag">Tag tertentu</option>
          </select>
          {needsCategory && (
            <select
              value={categoryId ?? ''}
              onChange={(e) => {
                setCategoryId(e.target.value ? Number(e.target.value) : undefined)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="">-- pilih --</option>
              {filterOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Cari judul, kode, penulis..."
            className="min-w-[220px] flex-1 border-2 border-[var(--gray-200)] p-3 focus:outline-none focus:border-[var(--black)]"
          />
        </div>

        <div className="border-2 border-[var(--black)] bg-[var(--white)]">
          <label className="flex items-center gap-3 border-b border-[var(--gray-200)] px-4 py-2 text-sm">
            <input
              type="checkbox"
              checked={allOnPage}
              onChange={toggleAllOnPage}
              disabled={books.length === 0}
              className="h-4 w-4 accent-[var(--black)]"
            />
            Pilih semua di halaman ini ({result?.total ?? 0} buku cocok)
          </label>
          {isLoading ? (
            <p className="py-8 text-center">Memuat...</p>
          ) : books.length === 0 ? (
            <p className="py-8 text-center text-[var(--gray-600)]">Tidak ada buku.</p>
          ) : (
            books.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-start gap-3 border-b border-[var(--gray-200)] px-4 py-3 last:border-b-0 hover:bg-[var(--gray-100)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => toggle(b.id)}
                  className="mt-1 h-4 w-4 accent-[var(--black)]"
                />
                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--text-primary)]">{b.judul}</div>
                  <div className="text-xs text-[var(--gray-600)]">
                    {b.kode || '(tanpa kode)'} · {b.penulis || '-'}
                  </div>
                  <div className="text-xs text-[var(--gray-600)]">
                    Kategori:{' '}
                    {b.kategoriId
                      ? (labelOf.get(b.kategoriId) ?? '(tidak dikenal)')
                      : 'Belum dikategorikan'}
                    {b.tags.length > 0 && ` · Tag: ${b.tags.map((t) => t.nama).join(', ')}`}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-2 border-[var(--black)] px-4 py-2 font-medium disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-[var(--gray-600)]">
              Halaman {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border-2 border-[var(--black)] px-4 py-2 font-medium disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {selected.size > 0 && (
          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center gap-3 border-2 border-[var(--black)] bg-[var(--white)] p-3">
            <span className="text-sm font-semibold">{selected.size} dipilih</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs underline"
            >
              Kosongkan pilihan
            </button>
            {tooMany && (
              <span className="text-xs text-[#c00]">Maksimal {MAX_SELECT} buku sekali proses.</span>
            )}

            <div className="flex items-center gap-2">
              <select
                value={kategoriTarget}
                onChange={(e) => setKategoriTarget(e.target.value)}
                className="border border-[var(--gray-200)] px-2 py-1 text-sm"
              >
                <option value="">Kategori utama...</option>
                <option value="kosong">(kosongkan kategori)</option>
                {kategoriOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyKategori}
                disabled={busy || tooMany || !kategoriTarget}
                className="bg-[var(--black)] px-3 py-1 text-sm font-medium text-[var(--white)] disabled:opacity-40"
              >
                Terapkan
              </button>
            </div>

            {SHOW_TAG_ACTIONS && (
            <div className="flex items-center gap-2">
              <select
                value={tagTarget}
                onChange={(e) => setTagTarget(e.target.value)}
                className="border border-[var(--gray-200)] px-2 py-1 text-sm"
              >
                <option value="">Tag...</option>
                {tagOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleTag('tambah')}
                disabled={busy || tooMany || !tagTarget}
                className="border border-[var(--black)] px-3 py-1 text-sm font-medium disabled:opacity-40"
              >
                + Tag
              </button>
              <button
                type="button"
                onClick={() => handleTag('hapus')}
                disabled={busy || tooMany || !tagTarget}
                className="border border-[var(--gray-600)] px-3 py-1 text-sm font-medium text-[var(--gray-600)] disabled:opacity-40"
              >
                − Tag
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
