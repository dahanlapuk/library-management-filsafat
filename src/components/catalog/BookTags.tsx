import type { BookTag } from './types'

// Kategori utama (kategoriId) tampil pertama dan bergaya penuh; sisanya tag biasa.
export function BookTags({
  tags,
  kategoriId,
}: {
  tags: BookTag[]
  kategoriId: number | null
}) {
  if (tags.length === 0) return null
  const ordered =
    kategoriId != null
      ? [...tags].sort((a, b) => (a.id === kategoriId ? -1 : b.id === kategoriId ? 1 : 0))
      : tags

  return (
    <div className="flex flex-wrap gap-1">
      {ordered.map((tag) => (
        <span
          key={tag.id}
          className={
            tag.id === kategoriId
              ? 'rounded-full border border-[var(--sun)] bg-[var(--pale)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]'
              : 'rounded-full border border-[var(--rule)] px-2 py-0.5 text-xs text-[var(--muted)]'
          }
        >
          {tag.nama}
        </span>
      ))}
    </div>
  )
}
