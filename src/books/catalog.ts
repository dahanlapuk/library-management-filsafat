import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, ilike, or, and, sql, asc, desc, inArray, count } from 'drizzle-orm'
import { db } from '../db'
import {
  books,
  categories,
  posisi,
  bookCategories,
  bookStockLocations,
} from '../db/schema'

// ── Katalog buku — Fase 1, READ-ONLY, akses publik (tanpa login) ────────
// Edit/create/delete buku menyusul lewat admin dashboard (server functions
// terpisah, dilindungi requireApprovedAdmin/requireSuperadmin).
//
// Behavior sengaja meniru V1 (handlers/books.go, handlers/categories.go,
// handlers/inventory_split.go) untuk parity: pagination, filter kategori/
// tag/posisi/status, sort judul ASC. Dua penyesuaian sadar dari V1:
//   1. Status pinjam cuma boolean (isDipinjam) -- TIDAK expose nama
//      peminjam ke publik (beda dari V1 yang menampilkan nama_peminjam).
//      Hanya admin yang tahu siapa peminjamnya (lewat modul loans nanti).
//   2. isDipinjam dihitung pakai EXISTS subquery, bukan LEFT JOIN ke
//      `loans` seperti V1 -- LEFT JOIN tanpa agregasi bisa menghasilkan
//      baris duplikat kalau buku multi-copy (qty > 1) punya lebih dari
//      satu pinjaman aktif bersamaan. Ini bug fix di jalur baca saja,
//      tidak menyentuh data.

const isDipinjamExpr = sql<boolean>`EXISTS (
  SELECT 1 FROM loans l
  WHERE l.book_id = ${books.id} AND l.tanggal_kembali IS NULL
)`

// Ambil tags (many-to-many via book_categories) untuk sekumpulan buku
// sekaligus, lalu digabung di JS -- lebih sederhana & gampang dirawat
// dibanding json_agg LATERAL join ala V1, tanpa kehilangan fungsinya.
async function getTagsForBooks(bookIds: number[]) {
  const map = new Map<number, { id: number; nama: string }[]>()
  if (bookIds.length === 0) return map

  const rows = await db
    .select({
      bookId: bookCategories.bookId,
      id: categories.id,
      nama: categories.nama,
    })
    .from(bookCategories)
    .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
    .where(inArray(bookCategories.bookId, bookIds))
    .orderBy(asc(categories.nama))

  for (const row of rows) {
    const arr = map.get(row.bookId) ?? []
    arr.push({ id: row.id, nama: row.nama })
    map.set(row.bookId, arr)
  }
  return map
}

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(20),
})

const bookFilterSchema = paginationSchema.extend({
  kategoriId: z.number().int().optional(),
  tagId: z.number().int().optional(),
  posisiId: z.number().int().optional(),
  status: z.enum(['dipinjam', 'tersedia']).optional(),
})

function statusCondition(status: 'dipinjam' | 'tersedia' | undefined) {
  if (status === 'dipinjam') return isDipinjamExpr
  if (status === 'tersedia') return sql`NOT (${isDipinjamExpr})`
  return undefined
}

// GET /books setara -- list buku dengan pagination + filter.
export const getBooks = createServerFn({ method: 'GET' })
  .inputValidator(bookFilterSchema)
  .handler(async ({ data }) => {
    const { page, limit, kategoriId, tagId, posisiId, status } = data
    const offset = (page - 1) * limit

    const conditions = []
    if (kategoriId) conditions.push(eq(books.kategoriId, kategoriId))
    if (posisiId) conditions.push(eq(books.posisiId, posisiId))
    if (tagId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${bookCategories} WHERE ${bookCategories.bookId} = ${books.id} AND ${bookCategories.categoryId} = ${tagId})`,
      )
    }
    const statusCond = statusCondition(status)
    if (statusCond) conditions.push(statusCond)
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [{ total }] = await db
      .select({ total: count() })
      .from(books)
      .where(whereClause)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const rows = await db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        penulis: books.penulis,
        tahun: books.tahun,
        qty: books.qty,
        keterangan: books.keterangan,
        kategoriId: books.kategoriId,
        kategoriNama: categories.nama,
        posisiId: books.posisiId,
        posisiKode: posisi.kode,
        posisiRak: posisi.rak,
        isDipinjam: isDipinjamExpr,
      })
      .from(books)
      .leftJoin(categories, eq(books.kategoriId, categories.id))
      .leftJoin(posisi, eq(books.posisiId, posisi.id))
      .where(whereClause)
      .orderBy(asc(books.judul))
      .limit(limit)
      .offset(offset)

    const tagsByBook = await getTagsForBooks(rows.map((r) => r.id))
    return {
      data: rows.map((r) => ({ ...r, tags: tagsByBook.get(r.id) ?? [] })),
      total,
      page,
      limit,
      totalPages,
    }
  })

const searchBooksSchema = bookFilterSchema
  .omit({ posisiId: true }) // V1 SearchBooks tidak dukung filter posisiId, cuma kategoriId/tagId/status
  .extend({ q: z.string() })

// GET /books/search setara -- ILIKE di judul/kode/keterangan/nama kategori/nama tag.
export const searchBooks = createServerFn({ method: 'GET' })
  .inputValidator(searchBooksSchema)
  .handler(async ({ data }) => {
    const { q, page, limit, kategoriId, tagId, status } = data

    // Parity dengan V1: query kosong balikin hasil kosong, bukan semua buku.
    if (!q.trim()) {
      return { data: [], total: 0, page: 1, limit, totalPages: 0 }
    }

    const offset = (page - 1) * limit
    const term = `%${q.trim()}%`

    const searchCond = or(
      ilike(books.judul, term),
      ilike(books.kode, term),
      ilike(books.keterangan, term),
      ilike(categories.nama, term),
      sql`EXISTS (
        SELECT 1 FROM ${bookCategories} bc
        JOIN ${categories} tc ON tc.id = bc.category_id
        WHERE bc.book_id = ${books.id} AND tc.nama ILIKE ${term}
      )`,
    )

    const conditions = [searchCond]
    if (kategoriId) conditions.push(eq(books.kategoriId, kategoriId))
    if (tagId) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${bookCategories} WHERE ${bookCategories.bookId} = ${books.id} AND ${bookCategories.categoryId} = ${tagId})`,
      )
    }
    const statusCond = statusCondition(status)
    if (statusCond) conditions.push(statusCond)
    const whereClause = and(...conditions)

    const [{ total }] = await db
      .select({ total: count() })
      .from(books)
      .leftJoin(categories, eq(books.kategoriId, categories.id))
      .where(whereClause)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const rows = await db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        penulis: books.penulis,
        tahun: books.tahun,
        qty: books.qty,
        keterangan: books.keterangan,
        kategoriId: books.kategoriId,
        kategoriNama: categories.nama,
        posisiId: books.posisiId,
        posisiKode: posisi.kode,
        posisiRak: posisi.rak,
        isDipinjam: isDipinjamExpr,
      })
      .from(books)
      .leftJoin(categories, eq(books.kategoriId, categories.id))
      .leftJoin(posisi, eq(books.posisiId, posisi.id))
      .where(whereClause)
      .orderBy(asc(books.judul))
      .limit(limit)
      .offset(offset)

    const tagsByBook = await getTagsForBooks(rows.map((r) => r.id))
    return {
      data: rows.map((r) => ({ ...r, tags: tagsByBook.get(r.id) ?? [] })),
      total,
      page,
      limit,
      totalPages,
    }
  })

const getBookSchema = z.object({ id: z.number().int() })

// GET /books/:id setara -- detail satu buku.
export const getBook = createServerFn({ method: 'GET' })
  .inputValidator(getBookSchema)
  .handler(async ({ data }) => {
    const rows = await db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        penulis: books.penulis,
        tahun: books.tahun,
        qty: books.qty,
        keterangan: books.keterangan,
        kategoriId: books.kategoriId,
        kategoriNama: categories.nama,
        posisiId: books.posisiId,
        posisiKode: posisi.kode,
        posisiRak: posisi.rak,
        isDipinjam: isDipinjamExpr,
      })
      .from(books)
      .leftJoin(categories, eq(books.kategoriId, categories.id))
      .leftJoin(posisi, eq(books.posisiId, posisi.id))
      .where(eq(books.id, data.id))
      .limit(1)

    // Dicek lewat .length, bukan destructure+falsy -- di tsconfig ini
    // `noUncheckedIndexedAccess` belum aktif, jadi TS/ESLint akan salah
    // mengira elemen array tidak mungkin undefined kalau dicek langsung.
    if (rows.length === 0) {
      throw new Error('Buku tidak ditemukan.')
    }
    const row = rows[0]

    const tagsByBook = await getTagsForBooks([row.id])
    return { ...row, tags: tagsByBook.get(row.id) ?? [] }
  })

const bookIdSchema = z.object({ bookId: z.number().int() })

// GET /books/:id/stock-breakdown setara -- rincian qty per posisi (rak).
// Dipakai di kartu katalog untuk buku qty > 1 (lihat PublicCatalog.vue V1).
export const getBookStockBreakdown = createServerFn({ method: 'GET' })
  .inputValidator(bookIdSchema)
  .handler(async ({ data }) => {
    const bookRows = await db
      .select({ qty: books.qty, posisiId: books.posisiId })
      .from(books)
      .where(eq(books.id, data.bookId))
      .limit(1)

    if (bookRows.length === 0) {
      throw new Error('Buku tidak ditemukan.')
    }
    const book = bookRows[0]

    const rows = await db
      .select({
        posisiId: bookStockLocations.posisiId,
        posisiKode: posisi.kode,
        posisiRak: posisi.rak,
        qty: bookStockLocations.qty,
      })
      .from(bookStockLocations)
      .leftJoin(posisi, eq(bookStockLocations.posisiId, posisi.id))
      .where(
        and(
          eq(bookStockLocations.bookId, data.bookId),
          sql`${bookStockLocations.qty} > 0`,
        ),
      )
      .orderBy(desc(bookStockLocations.qty))

    const allocatedQty = rows.reduce((sum, r) => sum + r.qty, 0)

    return {
      bookId: data.bookId,
      bookQty: book.qty,
      allocatedQty,
      isConsistent: allocatedQty === book.qty,
      defaultPosisiId: book.posisiId,
      allocations: rows,
    }
  })

// GET /categories setara -- list kategori + grouping + jumlah buku.
export const getCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db
      .select({
        id: categories.id,
        nama: categories.nama,
        grouping: categories.grouping,
        bookCount: count(books.id),
      })
      .from(categories)
      .leftJoin(books, eq(books.kategoriId, categories.id))
      .groupBy(categories.id, categories.nama, categories.grouping)
      .orderBy(asc(categories.nama))
  },
)
