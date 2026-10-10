type Cat = {
  id: number
  nama: string
  kind: 'kategori' | 'tag'
  parentId: number | null
  urutan: number
}

export function kategoriOptions(cats: Cat[]) {
  const byParent = new Map<number | null, Cat[]>()
  for (const c of cats) {
    if (c.kind !== 'kategori') continue
    const list = byParent.get(c.parentId) ?? []
    list.push(c)
    byParent.set(c.parentId, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama))
  }
  const out: { id: number; label: string }[] = []
  const walk = (parentId: number | null, path: string[]) => {
    for (const c of byParent.get(parentId) ?? []) {
      const next = [...path, c.nama]
      out.push({ id: c.id, label: next.join(' › ') })
      walk(c.id, next)
    }
  }
  walk(null, [])
  return out
}

export function tagOptions(cats: Cat[]) {
  return cats
    .filter((c) => c.kind === 'tag')
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .map((c) => ({ id: c.id, label: c.nama }))
}
