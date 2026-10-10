import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminHeader } from '../../admin/AdminHeader'
import {
  getCategoryTree,
  createCategory,
  renameCategory,
  moveCategory,
  reorderCategory,
  deleteCategory,
} from '../../books/categories'

export const Route = createFileRoute('/admin/categories')({
  component: CategoriesPage,
})

type Row = Awaited<ReturnType<typeof getCategoryTree>>[number]

const MAX_DEPTH = 3

function Btn({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border px-2 py-0.5 text-xs disabled:opacity-40 ${
        danger ? 'border-[#c00] text-[#c00]' : 'border-[var(--gray-600)] text-[var(--gray-600)]'
      }`}
    >
      {children}
    </button>
  )
}

function CategoriesPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [movingId, setMovingId] = useState<number | null>(null)

  const {
    data: rows = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ['category-tree'],
    queryFn: () => getCategoryTree(),
  })

  const tree = rows.filter((r) => r.kind === 'kategori')
  const tags = rows.filter((r) => r.kind === 'tag')
  const byId = new Map(tree.map((r) => [r.id, r]))
  const byParent = new Map<number | null, Row[]>()
  for (const r of tree) {
    const list = byParent.get(r.parentId) ?? []
    list.push(r)
    byParent.set(r.parentId, list)
  }

  function pathOf(id: number) {
    const parts: string[] = []
    let cur: number | null = id
    while (cur !== null) {
      const row = byId.get(cur)
      if (!row) break
      parts.unshift(row.nama)
      cur = row.parentId
    }
    return parts.join(' › ')
  }

  function descendantIds(id: number) {
    const out = new Set<number>([id])
    const stack = [id]
    while (stack.length > 0) {
      const cur = stack.pop() as number
      for (const child of byParent.get(cur) ?? []) {
        out.add(child.id)
        stack.push(child.id)
      }
    }
    return out
  }

  async function run(action: () => Promise<unknown>, fallback: string) {
    setError('')
    setBusy(true)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: ['category-tree'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  function handleAdd(kind: 'kategori' | 'tag', parentId: number | null) {
    const label =
      kind === 'tag'
        ? 'Nama tag baru:'
        : parentId === null
          ? 'Nama kategori teratas baru:'
          : `Nama subkategori baru di "${pathOf(parentId)}":`
    const nama = window.prompt(label)
    if (!nama?.trim()) return
    run(() => createCategory({ data: { nama: nama.trim(), kind, parentId } }), 'Gagal menambah.')
  }

  function handleRename(row: Row) {
    const nama = window.prompt('Nama baru:', row.nama)
    if (!nama?.trim() || nama.trim() === row.nama) return
    run(() => renameCategory({ data: { id: row.id, nama: nama.trim() } }), 'Gagal mengganti nama.')
  }

  function handleDelete(row: Row) {
    const dipakai = row.kind === 'tag' ? row.tagCount : Math.max(row.bookCount, row.tagCount)
    const pesan =
      dipakai > 0
        ? `"${row.nama}" dipakai ${dipakai} buku. Hapus tetap? Buku-buku itu akan kehilangan ${row.kind === 'tag' ? 'tag' : 'kategori'} ini.`
        : `Hapus "${row.nama}"?`
    if (!window.confirm(pesan)) return
    run(() => deleteCategory({ data: { id: row.id } }), 'Gagal menghapus.')
  }

  function renderNode(row: Row, depth: number, index: number, total: number) {
    const children = byParent.get(row.id) ?? []
    const blocked = movingId === row.id ? descendantIds(row.id) : new Set<number>()
    const indent = 12 + depth * 24

    return (
      <div key={row.id}>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[var(--gray-200)] py-2 pr-3"
          style={{ paddingLeft: indent }}
        >
          <span className="font-medium text-[var(--text-primary)]">{row.nama}</span>
          <span className="text-xs text-[var(--gray-600)]">{row.bookCount} buku</span>
          <span className="ml-auto flex flex-wrap gap-1">
            <Btn onClick={() => handleAdd('kategori', row.id)} disabled={busy || depth + 1 >= MAX_DEPTH}>
              + Sub
            </Btn>
            <Btn onClick={() => handleRename(row)} disabled={busy}>
              Ganti nama
            </Btn>
            <Btn onClick={() => setMovingId(movingId === row.id ? null : row.id)} disabled={busy}>
              Pindah
            </Btn>
            <Btn
              onClick={() => run(() => reorderCategory({ data: { id: row.id, arah: 'naik' } }), 'Gagal mengurutkan.')}
              disabled={busy || index === 0}
            >
              ↑
            </Btn>
            <Btn
              onClick={() => run(() => reorderCategory({ data: { id: row.id, arah: 'turun' } }), 'Gagal mengurutkan.')}
              disabled={busy || index === total - 1}
            >
              ↓
            </Btn>
            <Btn onClick={() => handleDelete(row)} disabled={busy || children.length > 0} danger>
              Hapus
            </Btn>
          </span>
        </div>
        {movingId === row.id && (
          <div className="border-b border-[var(--gray-200)] py-2 pr-3" style={{ paddingLeft: indent }}>
            <select
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value
                setMovingId(null)
                run(
                  () => moveCategory({ data: { id: row.id, parentId: v === 'root' ? null : Number(v) } }),
                  'Gagal memindahkan.',
                )
              }}
              className="border border-[var(--gray-200)] px-2 py-1 text-sm"
            >
              <option value="" disabled>
                Pindah ke...
              </option>
              {row.parentId !== null && <option value="root">(tingkat teratas)</option>}
              {tree
                .filter((r) => !blocked.has(r.id) && r.id !== row.parentId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {pathOf(r.id)}
                  </option>
                ))}
            </select>
          </div>
        )}
        {children.map((c, i) => renderNode(c, depth + 1, i, children.length))}
      </div>
    )
  }

  const roots = byParent.get(null) ?? []

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-5">
      <div className="mx-auto w-full max-w-6xl">
        <AdminHeader />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[0.05em] text-[var(--text-primary)]">
            Kelola Kategori
          </h1>
          <button
            type="button"
            onClick={() => handleAdd('kategori', null)}
            disabled={busy}
            className="bg-[var(--black)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--white)] disabled:opacity-50"
          >
            + Kategori teratas
          </button>
        </div>

        {(error || loadError) && (
          <div className="mb-4 border border-[#fcc] bg-[#fee] p-3 text-[#c00]">
            {error || 'Gagal memuat kategori.'}
          </div>
        )}

        <div className="mb-8 border-2 border-[var(--black)] bg-[var(--white)]">
          {isLoading ? (
            <p className="py-8 text-center">Memuat...</p>
          ) : roots.length === 0 ? (
            <p className="py-8 text-center text-[var(--gray-600)]">Belum ada kategori.</p>
          ) : (
            roots.map((r, i) => renderNode(r, 0, i, roots.length))
          )}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--gray-600)]">
            Tag
          </h2>
          <button
            type="button"
            onClick={() => handleAdd('tag', null)}
            disabled={busy}
            className="border-2 border-[var(--black)] px-3 py-1 text-xs font-semibold uppercase tracking-wide disabled:opacity-50"
          >
            + Tag
          </button>
        </div>
        <div className="border-2 border-[var(--black)] bg-[var(--white)]">
          {tags.length === 0 ? (
            <p className="py-6 text-center text-[var(--gray-600)]">Belum ada tag.</p>
          ) : (
            tags.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 border-b border-[var(--gray-200)] px-3 py-2 last:border-b-0"
              >
                <span className="font-medium text-[var(--text-primary)]">{t.nama}</span>
                <span className="text-xs text-[var(--gray-600)]">{t.tagCount} buku</span>
                <span className="ml-auto flex gap-1">
                  <Btn onClick={() => handleRename(t)} disabled={busy}>
                    Ganti nama
                  </Btn>
                  <Btn onClick={() => handleDelete(t)} disabled={busy} danger>
                    Hapus
                  </Btn>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
