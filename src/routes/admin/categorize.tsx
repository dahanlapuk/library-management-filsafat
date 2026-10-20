import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button, Chip } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
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

  const modeOptions: { value: Mode; label: string }[] = [
    { value: 'tanpa', label: 'Belum dikategorikan' },
    { value: 'semua', label: 'Semua buku' },
    { value: 'kategori', label: 'Kategori tertentu' },
    { value: 'tag', label: 'Tag tertentu' },
  ]

  function changeMode(next: Mode) {
    setMode(next)
    setCategoryId(undefined)
    setPage(1)
  }

  return (
    <AdminPage>
      <h1 className="mb-4 sm:mb-1 text-2xl font-semibold sm:mb-2 sm:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
        Kategorisasi Massal
      </h1>
      <p className="mb-5 hidden text-sm text-[var(--muted)] sm:block">
        Centang buku, lalu pasang satu kategori utama untuk semuanya sekaligus.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-[var(--rule)] bg-[var(--pale-soft)] p-3 text-sm">
          {info}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        <div className="hidden flex-wrap gap-2 sm:flex">
          {modeOptions.map((o) => (
            <Chip
              key={o.value}
              active={mode === o.value}
              onClick={() => changeMode(o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
        <OptionPicker
          title="Tampilkan buku"
          placeholder="Tampilkan"
          prefix="Tampilkan:"
          searchable={false}
          value={mode}
          onChange={(v) => changeMode(v as Mode)}
          options={modeOptions.map((o) => ({ value: o.value, label: o.label }))}
          className="sm:hidden"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          {needsCategory && (
            <OptionPicker
              title={mode === 'kategori' ? 'Pilih kategori' : 'Pilih tag'}
              placeholder={mode === 'kategori' ? '-- pilih kategori --' : '-- pilih tag --'}
              value={categoryId === undefined ? '' : String(categoryId)}
              onChange={(v) => {
                setCategoryId(v ? Number(v) : undefined)
                setPage(1)
              }}
              options={filterOptions.map((o) => ({ value: String(o.id), label: o.label }))}
              className="sm:w-72"
            />
          )}
          <Input
            type="search"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            placeholder="Cari judul, kode, penulis..."
            className="min-w-0 flex-1"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]">
        <label className="flex cursor-pointer items-center gap-3 border-b border-[var(--rule)] bg-[var(--pale-soft)] px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={allOnPage}
            onChange={toggleAllOnPage}
            disabled={books.length === 0}
            className="h-5 w-5 accent-[var(--ink)]"
          />
          <span>
            Pilih semua di halaman ini{' '}
            <span className="text-[var(--muted)]">({result?.total ?? 0} buku cocok)</span>
          </span>
        </label>
        {needsCategory && categoryId === undefined ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            {mode === 'kategori'
              ? 'Pilih kategori di atas untuk menampilkan bukunya.'
              : 'Pilih tag di atas untuk menampilkan bukunya.'}
          </p>
        ) : isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
        ) : books.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            {mode === 'tanpa' && !search
              ? 'Semua buku sudah punya kategori.'
              : 'Tidak ada buku.'}
          </p>
        ) : (
          books.map((b) => {
            const checked = selected.has(b.id)
            return (
              <label
                key={b.id}
                className={`flex cursor-pointer items-start gap-3 border-b border-[var(--rule)] px-4 py-3 transition-colors last:border-b-0 ${
                  checked ? 'bg-[var(--pale)]' : 'hover:bg-[var(--pale-soft)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(b.id)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ink)]"
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="break-words font-medium">{b.judul}</div>
                  <div className="break-words text-xs text-[var(--muted)]">
                    {b.kode || '(tanpa kode)'} · {b.penulis || '-'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    {b.kategoriId ? (
                      <Badge tone="neutral">
                        {labelOf.get(b.kategoriId) ?? '(tidak dikenal)'}
                      </Badge>
                    ) : (
                      <Badge tone="soft">Belum dikategorikan</Badge>
                    )}
                    {b.tags.length > 0 && <span>Tag: {b.tags.map((t) => t.nama).join(', ')}</span>}
                  </div>
                </div>
              </label>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ← Sebelumnya
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Hal. {page} dari {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Berikutnya →
          </Button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky bottom-0 z-30 mt-4 flex flex-col gap-3 rounded-xl border border-[var(--sun)] bg-[var(--cream)] p-3 shadow-[0_-4px_16px_rgba(24,22,0,0.12)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">{selected.size} buku dipilih</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-[var(--muted)] underline"
            >
              Kosongkan pilihan
            </button>
            {tooMany && (
              <span className="text-xs text-red-700">
                Maksimal {MAX_SELECT} buku sekali proses.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <OptionPicker
              title="Pilih kategori utama"
              placeholder="Pilih kategori utama..."
              value={kategoriTarget}
              onChange={setKategoriTarget}
              options={[
                { value: 'kosong', label: '(kosongkan kategori)' },
                ...kategoriOptions.map((o) => ({ value: String(o.id), label: o.label })),
              ]}
              className="flex-1"
            />
            <Button
              variant="accent"
              onClick={handleApplyKategori}
              disabled={busy || tooMany || !kategoriTarget}
            >
              {busy ? 'Memproses...' : `Terapkan ke ${selected.size} buku`}
            </Button>
          </div>

          {SHOW_TAG_ACTIONS && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={tagTarget}
                onChange={(e) => setTagTarget(e.target.value)}
                className="min-w-0 flex-1"
              >
                <option value="">Tag...</option>
                {tagOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                onClick={() => handleTag('tambah')}
                disabled={busy || tooMany || !tagTarget}
              >
                + Tag
              </Button>
              <Button
                variant="quiet"
                onClick={() => handleTag('hapus')}
                disabled={busy || tooMany || !tagTarget}
              >
                − Tag
              </Button>
            </div>
          )}
        </div>
      )}
    </AdminPage>
  )
}

function OptionPicker({
  title,
  placeholder,
  value,
  onChange,
  options,
  className = '',
  searchable = true,
  prefix,
}: {
  title: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
  searchable?: boolean
  prefix?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const current = options.find((o) => o.value === value)
  const needle = q.trim().toLowerCase()
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options

  function close() {
    setOpen(false)
    setQ('')
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--rule)] bg-[var(--white)] px-3 py-2.5 text-left text-sm"
      >
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-[var(--muted)]'}`}>
          {prefix && <span className="mr-1 text-[var(--muted)]">{prefix}</span>}
          {current ? current.label : placeholder}
        </span>
        <span aria-hidden className="text-[var(--muted)]">
          ▾
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={close}
            className="absolute inset-0 bg-black/40"
          />
          <div className="sheet-in relative flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-[var(--cream)] shadow-xl md:max-w-lg md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-3">
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                {title}
              </h2>
              <Button variant="quiet" onClick={close}>
                Tutup
              </Button>
            </div>
            {searchable && (
              <div className="px-5 pt-3">
                <Input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari..."
                  className="w-full"
                />
              </div>
            )}
            <ul className="overflow-y-auto px-5 py-3">
              {shown.length === 0 && (
                <li className="py-4 text-center text-sm text-[var(--muted)]">Tidak ada yang cocok.</li>
              )}
              {shown.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      close()
                    }}
                    className={`w-full break-words rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      o.value === value ? 'bg-[var(--pale)] font-semibold' : 'hover:bg-[var(--pale-soft)]'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
