import { useEffect, useMemo, useState } from 'react'
import { buildCategoryRows, TOP_CATEGORY_COUNT } from './categories'
import type { CategoryNode, CategoryRow } from './types'

type TreeProps = {
  categories: CategoryRow[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  listClassName?: string
}

function itemClass(active: boolean) {
  return `flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-sm transition-colors ${
    active
      ? 'bg-[var(--pale)] font-medium text-[var(--ink)]'
      : 'text-[var(--ink)] hover:bg-[var(--pale-soft)]'
  }`
}

export function CategoryTree({
  categories,
  selectedId,
  onSelect,
  listClassName = '',
}: TreeProps) {
  const [filter, setFilter] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const { rows: allRows, totals } = useMemo(
    () => buildCategoryRows(categories, () => true),
    [categories],
  )
  const treeRows = useMemo(
    () => buildCategoryRows(categories, (id) => expandedIds.has(id)).rows,
    [categories, expandedIds],
  )

  const term = filter.trim().toLowerCase()
  const isFiltering = term.length > 0
  const filtered = useMemo(
    () => allRows.filter((r) => r.path.toLowerCase().includes(term)),
    [allRows, term],
  )

  const rootCount = treeRows.filter((r) => r.depth === 0).length
  const hiddenCount = Math.max(0, rootCount - TOP_CATEGORY_COUNT)
  const visible = useMemo(() => {
    if (isFiltering) return filtered
    if (showAll) return treeRows
    const out: CategoryNode[] = []
    let roots = 0
    for (const row of treeRows) {
      if (row.depth === 0) roots++
      if (roots > TOP_CATEGORY_COUNT) break
      out.push(row)
    }
    return out
  }, [isFiltering, showAll, filtered, treeRows])

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Cari kategori..."
        aria-label="Cari kategori"
        className="w-full rounded-lg border border-[var(--gray-200)] bg-[var(--white)] px-3 py-1.5 text-base sm:text-sm"
      />

      <div className={`flex flex-col gap-0.5 ${listClassName}`}>
        <div className="flex items-center gap-1">
          {!isFiltering && <span className="w-6 shrink-0" />}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={itemClass(selectedId === null)}
          >
            Semua Buku
          </button>
        </div>

        {visible.map(({ cat, depth, path, hasChildren }) => (
          <div
            key={cat.id}
            className="flex items-center gap-1"
            style={{ marginLeft: isFiltering ? 0 : depth * 16 }}
          >
            {!isFiltering &&
              (hasChildren ? (
                <button
                  type="button"
                  aria-label={
                    expandedIds.has(cat.id) ? 'Tutup subkategori' : 'Buka subkategori'
                  }
                  aria-expanded={expandedIds.has(cat.id)}
                  onClick={() => toggleExpanded(cat.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-[var(--muted)] hover:bg-[var(--pale)]"
                >
                  {expandedIds.has(cat.id) ? '−' : '+'}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              ))}
            <button
              type="button"
              onClick={() => onSelect(cat.id)}
              className={itemClass(selectedId === cat.id)}
            >
              <span className="min-w-0">{isFiltering ? path : cat.nama}</span>
              <span className="shrink-0 text-xs text-[var(--muted)]">
                {totals.get(cat.id) ?? cat.bookCount}
              </span>
            </button>
          </div>
        ))}

        {!isFiltering && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-3 py-2 text-left text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            {showAll ? 'Sembunyikan' : `Lainnya (${hiddenCount})`}
          </button>
        )}

        {isFiltering && filtered.length === 0 && (
          <p className="px-3 py-2 text-xs text-[var(--muted)]">
            Tidak ada kategori yang cocok.
          </p>
        )}
      </div>
    </div>
  )
}

export function CategorySheet({
  categories,
  selectedId,
  onSelect,
  onClose,
}: {
  categories: CategoryRow[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onClose: () => void
}) {
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
      className="fixed inset-0 z-50 flex items-end bg-[var(--ink)]/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih kategori"
        className="sheet-in flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-[var(--white)] shadow-[0_-12px_40px_-12px_rgba(24,22,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Kategori</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-[var(--muted)] hover:bg-[var(--pale-soft)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <CategoryTree
            categories={categories}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  )
}
