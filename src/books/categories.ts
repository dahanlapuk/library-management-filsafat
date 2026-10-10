import { createServerFn } from '@tanstack/react-start'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { pgErrorCode } from '../db/errors'
import { bookCategories, books, categories } from '../db/schema'
import { requireSuperadmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

type Tx = PgTransaction<any, any, any>
type Node = {
  id: number
  nama: string
  kind: 'kategori' | 'tag'
  parentId: number | null
  urutan: number
}

const MAX_DEPTH = 3
const NAMA_KEMBAR = 'Nama ini sudah dipakai di tingkat yang sama.'
const TERLALU_DALAM = `Pohon kategori maksimal ${MAX_DEPTH} tingkat.`

function loadNodes(tx: Tx): Promise<Node[]> {
  return tx
    .select({
      id: categories.id,
      nama: categories.nama,
      kind: categories.kind,
      parentId: categories.parentId,
      urutan: categories.urutan,
    })
    .from(categories)
    .orderBy(categories.urutan, categories.nama)
}

function depthOf(id: number | null, byId: Map<number, Node>) {
  let depth = 0
  let cur = id
  while (cur !== null) {
    const node = byId.get(cur)
    if (!node) break
    depth++
    cur = node.parentId
  }
  return depth
}

function heightOf(id: number, rows: Node[]): number {
  const kids = rows.filter((r) => r.parentId === id)
  return 1 + Math.max(0, ...kids.map((k) => heightOf(k.id, rows)))
}

function isInside(id: number | null, ancestorId: number, byId: Map<number, Node>) {
  let cur = id
  while (cur !== null) {
    if (cur === ancestorId) return true
    cur = byId.get(cur)?.parentId ?? null
  }
  return false
}

function nextUrutan(rows: Node[], kind: Node['kind'], parentId: number | null) {
  const siblings = rows.filter((r) => r.kind === kind && r.parentId === parentId)
  return 1 + Math.max(-1, ...siblings.map((r) => r.urutan))
}

export const getCategoryTree = createServerFn({ method: 'GET' }).handler(async () => {
  await requireSuperadmin()
  return db
    .select({
      id: categories.id,
      nama: categories.nama,
      kind: categories.kind,
      parentId: categories.parentId,
      urutan: categories.urutan,
      bookCount: sql<number>`(select count(*) from books b where b.kategori_id = "categories"."id")`.mapWith(Number),
      tagCount: sql<number>`(select count(*) from book_categories bc where bc.category_id = "categories"."id")`.mapWith(Number),
    })
    .from(categories)
    .orderBy(categories.urutan, categories.nama)
})

const createSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100),
  kind: z.enum(['kategori', 'tag']),
  parentId: z.number().int().nullable(),
})

export const createCategory = createServerFn({ method: 'POST' })
  .inputValidator(createSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()
    if (data.kind === 'tag' && data.parentId !== null) {
      throw new Error('Tag tidak punya induk.')
    }

    return db.transaction(async (tx) => {
      const rows = await loadNodes(tx)
      const byId = new Map(rows.map((r) => [r.id, r]))
      if (data.parentId !== null) {
        const parent = byId.get(data.parentId)
        if (!parent || parent.kind !== 'kategori') throw new Error('Induk tidak valid.')
        if (depthOf(data.parentId, byId) >= MAX_DEPTH) throw new Error(TERLALU_DALAM)
      }

      try {
        const [row] = await tx
          .insert(categories)
          .values({
            nama: data.nama,
            kind: data.kind,
            parentId: data.parentId,
            urutan: nextUrutan(rows, data.kind, data.parentId),
          })
          .returning({ id: categories.id })
        await logActivity(tx, admin, {
          action: 'CATEGORY_CREATE',
          entityType: 'CATEGORY',
          entityId: row.id,
          entityName: data.nama,
          details: { kind: data.kind, parentId: data.parentId },
        })
        return { id: row.id }
      } catch (err) {
        if (pgErrorCode(err) === '23505') throw new Error(NAMA_KEMBAR)
        throw err
      }
    })
  })

const renameSchema = z.object({
  id: z.number().int(),
  nama: z.string().trim().min(1, 'Nama wajib diisi.').max(100),
})

export const renameCategory = createServerFn({ method: 'POST' })
  .inputValidator(renameSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const [before] = await tx
        .select({ nama: categories.nama })
        .from(categories)
        .where(eq(categories.id, data.id))
        .limit(1)
      if (!before) throw new Error('Kategori tidak ditemukan.')

      try {
        await tx.update(categories).set({ nama: data.nama }).where(eq(categories.id, data.id))
        await logActivity(tx, admin, {
          action: 'CATEGORY_RENAME',
          entityType: 'CATEGORY',
          entityId: data.id,
          entityName: data.nama,
          details: { dari: before.nama, ke: data.nama },
        })
        return { id: data.id }
      } catch (err) {
        if (pgErrorCode(err) === '23505') throw new Error(NAMA_KEMBAR)
        throw err
      }
    })
  })

const moveSchema = z.object({
  id: z.number().int(),
  parentId: z.number().int().nullable(),
})

export const moveCategory = createServerFn({ method: 'POST' })
  .inputValidator(moveSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const rows = await loadNodes(tx)
      const byId = new Map(rows.map((r) => [r.id, r]))
      const node = byId.get(data.id)
      if (!node || node.kind !== 'kategori') throw new Error('Kategori tidak ditemukan.')
      if (node.parentId === data.parentId) return { id: node.id }

      if (data.parentId !== null) {
        const parent = byId.get(data.parentId)
        if (!parent || parent.kind !== 'kategori') throw new Error('Induk tidak valid.')
        if (isInside(data.parentId, node.id, byId)) {
          throw new Error('Tidak bisa dipindah ke dalam dirinya sendiri atau turunannya.')
        }
      }
      if (depthOf(data.parentId, byId) + heightOf(node.id, rows) > MAX_DEPTH) {
        throw new Error(TERLALU_DALAM)
      }

      try {
        await tx
          .update(categories)
          .set({ parentId: data.parentId, urutan: nextUrutan(rows, 'kategori', data.parentId) })
          .where(eq(categories.id, node.id))
        await logActivity(tx, admin, {
          action: 'CATEGORY_MOVE',
          entityType: 'CATEGORY',
          entityId: node.id,
          entityName: node.nama,
          details: { dari: node.parentId, ke: data.parentId },
        })
        return { id: node.id }
      } catch (err) {
        if (pgErrorCode(err) === '23505') throw new Error(NAMA_KEMBAR)
        throw err
      }
    })
  })

const reorderSchema = z.object({
  id: z.number().int(),
  arah: z.enum(['naik', 'turun']),
})

export const reorderCategory = createServerFn({ method: 'POST' })
  .inputValidator(reorderSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const rows = await loadNodes(tx)
      const node = rows.find((r) => r.id === data.id)
      if (!node) throw new Error('Kategori tidak ditemukan.')

      const siblings = rows.filter((r) => r.kind === node.kind && r.parentId === node.parentId)
      const from = siblings.findIndex((r) => r.id === node.id)
      const to = data.arah === 'naik' ? from - 1 : from + 1
      if (to < 0 || to >= siblings.length) return { id: node.id }

      const reordered = [...siblings]
      ;[reordered[from], reordered[to]] = [reordered[to], reordered[from]]
      for (const [i, s] of reordered.entries()) {
        if (s.urutan !== i) {
          await tx.update(categories).set({ urutan: i }).where(eq(categories.id, s.id))
        }
      }
      await logActivity(tx, admin, {
        action: 'CATEGORY_REORDER',
        entityType: 'CATEGORY',
        entityId: node.id,
        entityName: node.nama,
        details: { arah: data.arah },
      })
      return { id: node.id }
    })
  })

const deleteSchema = z.object({ id: z.number().int() })

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const rows = await loadNodes(tx)
      const node = rows.find((r) => r.id === data.id)
      if (!node) throw new Error('Kategori tidak ditemukan.')
      if (rows.some((r) => r.parentId === node.id)) {
        throw new Error('Masih punya subkategori. Pindahkan atau hapus dulu.')
      }

      const [utama] = await tx
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(books)
        .where(eq(books.kategoriId, node.id))
      const [relasi] = await tx
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(bookCategories)
        .where(eq(bookCategories.categoryId, node.id))

      await tx.delete(categories).where(eq(categories.id, node.id))
      await logActivity(tx, admin, {
        action: 'CATEGORY_DELETE',
        entityType: 'CATEGORY',
        entityId: node.id,
        entityName: node.nama,
        details: { kind: node.kind, bukuUtama: utama.n, bukuRelasi: relasi.n },
      })
      return { id: node.id }
    })
  })
