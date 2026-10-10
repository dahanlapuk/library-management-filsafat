import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, count, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { judulUrut } from '../db/sort'
import { bookCategories, books, categories } from '../db/schema'
import { requireApprovedAdmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  mode: z.enum(['tanpa', 'semua', 'kategori', 'tag']).default('tanpa'),
  categoryId: z.number().int().optional(),
})

export const getBooksForCategorizing = createServerFn({ method: 'GET' })
  .inputValidator(listSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()
    const { page, limit, q, mode, categoryId } = data

    const conditions = []
    if (q) {
      const like = `%${q}%`
      conditions.push(
        or(ilike(books.judul, like), ilike(books.kode, like), ilike(books.penulis, like)),
      )
    }
    if (mode === 'tanpa') conditions.push(isNull(books.kategoriId))
    if (mode === 'kategori' && categoryId) {
      conditions.push(sql`books.kategori_id in (
        with recursive sub(id) as (
          select id from categories where id = ${categoryId}
          union all
          select c.id from categories c join sub on c.parent_id = sub.id
        )
        select id from sub
      )`)
    }
    if (mode === 'tag' && categoryId) {
      conditions.push(
        sql`exists (select 1 from book_categories bc where bc.book_id = books.id and bc.category_id = ${categoryId})`,
      )
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [{ total }] = await db.select({ total: count() }).from(books).where(where)

    const rows = await db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        penulis: books.penulis,
        kategoriId: books.kategoriId,
      })
      .from(books)
      .where(where)
      .orderBy(judulUrut)
      .limit(limit)
      .offset((page - 1) * limit)

    const tagRows =
      rows.length === 0
        ? []
        : await db
            .select({ bookId: bookCategories.bookId, id: categories.id, nama: categories.nama })
            .from(bookCategories)
            .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
            .where(
              and(
                inArray(bookCategories.bookId, rows.map((r) => r.id)),
                eq(categories.kind, 'tag'),
              ),
            )
            .orderBy(categories.nama)

    const tagsByBook = new Map<number, { id: number; nama: string }[]>()
    for (const t of tagRows) {
      const list = tagsByBook.get(t.bookId) ?? []
      list.push({ id: t.id, nama: t.nama })
      tagsByBook.set(t.bookId, list)
    }

    return {
      data: rows.map((r) => ({ ...r, tags: tagsByBook.get(r.id) ?? [] })),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  })

const bulkSchema = z
  .object({
    bookIds: z
      .array(z.number().int())
      .min(1, 'Pilih minimal satu buku.')
      .max(200, 'Maksimal 200 buku sekali proses.'),
    kategoriId: z.number().int().nullable().optional(),
    addTagIds: z.array(z.number().int()).default([]),
    removeTagIds: z.array(z.number().int()).default([]),
  })
  .refine(
    (d) => d.kategoriId !== undefined || d.addTagIds.length > 0 || d.removeTagIds.length > 0,
    'Tidak ada perubahan yang diminta.',
  )

export const bulkCategorize = createServerFn({ method: 'POST' })
  .inputValidator(bulkSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()
    const { kategoriId, addTagIds, removeTagIds } = data
    const bookIds = [...new Set(data.bookIds)]

    return db.transaction(async (tx) => {
      const found = await tx.select({ id: books.id }).from(books).where(inArray(books.id, bookIds))
      if (found.length !== bookIds.length) throw new Error('Sebagian buku tidak ditemukan.')

      const refIds = [
        ...(typeof kategoriId === 'number' ? [kategoriId] : []),
        ...addTagIds,
        ...removeTagIds,
      ]
      if (refIds.length > 0) {
        const refs = await tx
          .select({ id: categories.id, kind: categories.kind })
          .from(categories)
          .where(inArray(categories.id, refIds))
        const kindOf = new Map(refs.map((r) => [r.id, r.kind]))
        if (typeof kategoriId === 'number' && kindOf.get(kategoriId) !== 'kategori') {
          throw new Error('Kategori tidak valid.')
        }
        for (const id of [...addTagIds, ...removeTagIds]) {
          if (kindOf.get(id) !== 'tag') throw new Error('Tag tidak valid.')
        }
      }

      if (kategoriId !== undefined) {
        await tx.delete(bookCategories).where(
          and(
            inArray(bookCategories.bookId, bookIds),
            inArray(
              bookCategories.categoryId,
              tx.select({ id: categories.id }).from(categories).where(eq(categories.kind, 'kategori')),
            ),
          ),
        )
        if (kategoriId !== null) {
          await tx
            .insert(bookCategories)
            .values(bookIds.map((bookId) => ({ bookId, categoryId: kategoriId })))
            .onConflictDoNothing()
        }
        await tx
          .update(books)
          .set({ kategoriId, updatedBy: admin.id })
          .where(inArray(books.id, bookIds))
      }

      if (addTagIds.length > 0) {
        await tx
          .insert(bookCategories)
          .values(bookIds.flatMap((bookId) => addTagIds.map((categoryId) => ({ bookId, categoryId }))))
          .onConflictDoNothing()
      }
      if (removeTagIds.length > 0) {
        await tx
          .delete(bookCategories)
          .where(
            and(
              inArray(bookCategories.bookId, bookIds),
              inArray(bookCategories.categoryId, removeTagIds),
            ),
          )
      }

      await logActivity(tx, admin, {
        action: 'BOOK_BULK_CATEGORIZE',
        entityType: 'BOOK',
        entityName: `${bookIds.length} buku`,
        details: {
          bookIds,
          kategoriDiubah: kategoriId !== undefined,
          kategoriId: kategoriId ?? null,
          addTagIds,
          removeTagIds,
        },
      })

      return { jumlah: bookIds.length }
    })
  })
