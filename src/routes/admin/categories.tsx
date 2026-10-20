import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminPage } from '../../components/ui/AdminPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
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

function CategoriesPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [movingId, setMovingId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

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
    const indent = 16 + depth * 20
    const open = openId === row.id

    function toggleOpen() {
      setOpenId(open ? null : row.id)
      setMovingId(null)
    }

    return (
      <div key={row.id}>
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--rule)] py-3 pr-4 ${
            open ? 'bg-[var(--pale-soft)]' : ''
          } ${depth > 0 ? 'border-l-2 border-l-[var(--rule)]' : ''}`}
          style={{ paddingLeft: indent }}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="break-words font-medium">{row.nama}</span>
            <Badge tone="neutral">{row.bookCount} buku</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handleAdd('kategori', row.id)}
              disabled={busy || depth + 1 >= MAX_DEPTH}
            >
              + Sub
            </Button>
            <Button variant={open ? 'accent' : 'quiet'} onClick={toggleOpen}>
              Kelola
            </Button>
          </div>
        </div>
        {open && (
          <div
            className="flex flex-col gap-3 border-b border-[var(--rule)] bg-[var(--pale-soft)] py-3 pr-4"
            style={{ paddingLeft: indent }}
          >
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => handleRename(row)} disabled={busy}>
                Ganti nama
              </Button>
              <Button
                variant="secondary"
                onClick={() => setMovingId(movingId === row.id ? null : row.id)}
                disabled={busy}
              >
                Pindah
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  run(
                    () => reorderCategory({ data: { id: row.id, arah: 'naik' } }),
                    'Gagal mengurutkan.',
                  )
                }
                disabled={busy || index === 0}
              >
                ↑ Naik
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  run(
                    () => reorderCategory({ data: { id: row.id, arah: 'turun' } }),
                    'Gagal mengurutkan.',
                  )
                }
                disabled={busy || index === total - 1}
              >
                ↓ Turun
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(row)}
                disabled={busy || children.length > 0}
              >
                Hapus
              </Button>
            </div>
            {children.length > 0 && (
              <p className="text-xs text-[var(--muted)]">
                Hapus nonaktif: kategori ini masih punya subkategori.
              </p>
            )}
            {movingId === row.id && (
              <Select
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value
                  setMovingId(null)
                  run(
                    () =>
                      moveCategory({
                        data: { id: row.id, parentId: v === 'root' ? null : Number(v) },
                      }),
                    'Gagal memindahkan.',
                  )
                }}
                className="w-full min-w-0 sm:w-80"
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
              </Select>
            )}
          </div>
        )}
        {children.map((c, i) => renderNode(c, depth + 1, i, children.length))}
      </div>
    )
  }

  const roots = byParent.get(null) ?? []
  const panel =
    'overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--white)] shadow-[0_1px_2px_rgba(24,22,0,0.05)]'

  return (
    <AdminPage>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Kelola Kategori
        </h1>
        <Button variant="accent" onClick={() => handleAdd('kategori', null)} disabled={busy}>
          + Kategori teratas
        </Button>
      </div>

      {(error || loadError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error || 'Gagal memuat kategori.'}
        </div>
      )}

      <div className={`mb-10 ${panel}`}>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
        ) : roots.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">Belum ada kategori.</p>
        ) : (
          roots.map((r, i) => renderNode(r, 0, i, roots.length))
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
          Tag
        </h2>
        <Button variant="secondary" onClick={() => handleAdd('tag', null)} disabled={busy}>
          + Tag
        </Button>
      </div>
      <div className={panel}>
        {tags.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">Belum ada tag.</p>
        ) : (
          tags.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--rule)] px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="break-words font-medium">{t.nama}</span>
                <Badge tone="neutral">{t.tagCount} buku</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleRename(t)} disabled={busy}>
                  Ganti nama
                </Button>
                <Button variant="danger" onClick={() => handleDelete(t)} disabled={busy}>
                  Hapus
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminPage>
  )
}
