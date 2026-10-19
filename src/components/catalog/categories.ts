import type { CategoryNode, CategoryRow } from './types'

export const TOP_CATEGORY_COUNT = 10

export function buildCategoryRows(
  categories: CategoryRow[],
  isOpen: (id: number) => boolean,
) {
  const children = new Map<number | null, CategoryRow[]>()
  for (const c of categories) {
    if (c.kind !== 'kategori') continue
    const list = children.get(c.parentId) ?? []
    list.push(c)
    children.set(c.parentId, list)
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama))
  }

  const totals = new Map<number, number>()
  const sum = (c: CategoryRow): number => {
    const total =
      c.bookCount + (children.get(c.id) ?? []).reduce((acc, k) => acc + sum(k), 0)
    totals.set(c.id, total)
    return total
  }
  for (const root of children.get(null) ?? []) sum(root)

  const rows: CategoryNode[] = []
  const walk = (parentId: number | null, depth: number, path: string[]) => {
    for (const cat of children.get(parentId) ?? []) {
      const next = [...path, cat.nama]
      const kids = children.get(cat.id) ?? []
      rows.push({ cat, depth, path: next.join(' › '), hasChildren: kids.length > 0 })
      if (kids.length > 0 && isOpen(cat.id)) walk(cat.id, depth + 1, next)
    }
  }
  walk(null, 0, [])
  return { rows, totals }
}
