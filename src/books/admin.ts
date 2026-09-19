import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import {
  books,
  bookCategories,
  bookStockLocations,
  posisi,
  deleteRequests,
  categories,
  categoryRequests,
  adminProfiles,
} from '../db/schema'
import { requireApprovedAdmin, requireSuperadmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

// ── CRUD buku — Fase 2, admin only ───────────────────────────────
// Versi SEDERHANA: 1 posisi rak per buku (bukan multi-lokasi array),
// karena data nyata sekarang cuma punya 1 posisi per buku (lihat
// handoff Fase 2). Skema tetap dukung banyak posisi kalau nanti
// dibutuhkan -- tinggal ganti input jadi array tanpa bongkar tabel.
//
// Guard: create/update pakai requireApprovedAdmin (operasional harian
// intern/admin biasa). Delete pakai requireSuperadmin -- ini aksi
// destruktif dan (lihat catatan di bawah) MENGHAPUS histori peminjaman
// buku itu juga, jadi sengaja dibikin lebih ketat daripada create/update.

const bookInputSchema = z.object({
  kode: z.string().trim().min(1).optional(),
  judul: z.string().trim().min(1, 'Judul wajib diisi.'),
  penulis: z.string().trim().min(1).optional(),
  tahun: z.number().int().optional(),
  keterangan: z.string().trim().min(1).optional(),
  qty: z.number().int().min(1, 'Qty minimal 1.'),
  categoryIds: z
    .array(z.number().int())
    .min(1, 'Pilih minimal satu kategori.'),
  posisiId: z.number().int({ message: 'Posisi rak wajib dipilih.' }),
})

// Type transaksi Drizzle -- dipakai biar helper di bawah bisa dipanggil
// dari dalam db.transaction() tanpa `any`.
import type { PgTransaction } from 'drizzle-orm/pg-core'
type Tx = PgTransaction<any, any, any>

// Dipakai create & update -- tulis ulang book_categories dan
// book_stock_locations dari nol tiap kali disimpan, bukan diffing baris
// lama vs baru. Jumlah kategori/posisi per buku kecil, dan versi
// hapus-lalu-insert-ulang jauh lebih sederhana buat dirawat satu orang.
async function syncBookCategoriesAndStock(
  tx: Tx,
  bookId: number,
  categoryIds: number[],
  posisiId: number,
  qty: number,
) {
  await tx.delete(bookCategories).where(eq(bookCategories.bookId, bookId))
  await tx
    .insert(bookCategories)
    .values(categoryIds.map((categoryId) => ({ bookId, categoryId })))

  await tx
    .delete(bookStockLocations)
    .where(eq(bookStockLocations.bookId, bookId))
  await tx.insert(bookStockLocations).values({ bookId, posisiId, qty })
}

// POST /admin/books setara -- buat buku baru.
export const createBook = createServerFn({ method: 'POST' })
  .inputValidator(bookInputSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [book] = await tx
        .insert(books)
        .values({
          kode: data.kode,
          judul: data.judul,
          penulis: data.penulis,
          tahun: data.tahun,
          keterangan: data.keterangan,
          qty: data.qty,
          // kategoriId "utama" dipakai buat tampilan cepat di katalog
          // (kolom kategoriNama di getBooks/getBook) -- kategori
          // pertama yang dipilih jadi primary, semuanya (termasuk yang
          // pertama) tetap tercatat penuh di book_categories. Niru
          // perilaku V1 yang auto-duplikat kategori utama ke tabel tag.
          kategoriId: data.categoryIds[0],
          posisiId: data.posisiId,
          createdBy: admin.id,
          updatedBy: admin.id,
        })
        .returning({ id: books.id })

      await syncBookCategoriesAndStock(
        tx,
        book.id,
        data.categoryIds,
        data.posisiId,
        data.qty,
      )

      await logActivity(tx, admin, {
        action: 'CREATE',
        entityType: 'BOOK',
        entityId: book.id,
        entityName: data.judul,
        details: {
          kode: data.kode ?? null,
          qty: data.qty,
          posisiId: data.posisiId,
          categoryIds: data.categoryIds,
        },
      })

      return { id: book.id }
    })
  })

const updateBookSchema = bookInputSchema.extend({ id: z.number().int() })

// PUT /admin/books/:id setara -- update buku yang sudah ada.
export const updateBook = createServerFn({ method: 'POST' })
  .inputValidator(updateBookSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [before] = await tx
        .select({
          kode: books.kode,
          judul: books.judul,
          penulis: books.penulis,
          tahun: books.tahun,
          keterangan: books.keterangan,
          qty: books.qty,
          posisiId: books.posisiId,
        })
        .from(books)
        .where(eq(books.id, data.id))
        .limit(1)
      if (!before) {
        throw new Error('Buku tidak ditemukan.')
      }

      // Bahan log: field yang berubah (dari -> ke). Field undefined di input
      // tidak disentuh .set() Drizzle, jadi dilewati.
      const changes: Record<string, { dari: unknown; ke: unknown }> = {}
      for (const f of [
        'kode',
        'judul',
        'penulis',
        'tahun',
        'keterangan',
        'qty',
        'posisiId',
      ] as const) {
        const ke = data[f]
        if (ke === undefined) continue
        const dari = before[f] ?? null
        if (dari !== ke) changes[f] = { dari, ke }
      }
      const oldCategoryIds = (
        await tx
          .select({ id: bookCategories.categoryId })
          .from(bookCategories)
          .where(eq(bookCategories.bookId, data.id))
      )
        .map((r) => r.id)
        .sort((a, b) => a - b)
      const newCategoryIds = [...data.categoryIds].sort((a, b) => a - b)
      if (oldCategoryIds.join(',') !== newCategoryIds.join(',')) {
        changes.categoryIds = { dari: oldCategoryIds, ke: newCategoryIds }
      }

      const updated = await tx
        .update(books)
        .set({
          kode: data.kode,
          judul: data.judul,
          penulis: data.penulis,
          tahun: data.tahun,
          keterangan: data.keterangan,
          qty: data.qty,
          kategoriId: data.categoryIds[0],
          posisiId: data.posisiId,
          updatedBy: admin.id,
          updatedAt: new Date(),
        })
        .where(eq(books.id, data.id))
        .returning({ id: books.id })

      if (updated.length === 0) {
        throw new Error('Buku tidak ditemukan.')
      }

      await syncBookCategoriesAndStock(
        tx,
        data.id,
        data.categoryIds,
        data.posisiId,
        data.qty,
      )

      await logActivity(tx, admin, {
        action: 'UPDATE',
        entityType: 'BOOK',
        entityId: data.id,
        entityName: data.judul,
        details: { changes },
      })

      if (changes.posisiId) {
        await logActivity(tx, admin, {
          action: 'POSITION_CHANGE',
          entityType: 'BOOK',
          entityId: data.id,
          entityName: data.judul,
          details: changes.posisiId,
        })
      }

      return { id: data.id }
    })
  })

const deleteBookSchema = z.object({ id: z.number().int() })

// DELETE /admin/books/:id setara -- hapus buku permanen.
//
// PERHATIAN: `loans.bookId` di schema.ts pakai onDelete: 'cascade',
// jadi menghapus buku ini JUGA menghapus semua histori peminjaman buku
// itu (termasuk loan_stock_allocations-nya). Kalau nanti histori
// peminjaman perlu dipertahankan meski bukunya dihapus, ini perlu
// didesain ulang jadi soft-delete -- sengaja tidak dikerjakan sekarang
// (di luar scope CRUD sederhana yang disepakati), dicatat di sini biar
// tidak kelupaan.
export const deleteBook = createServerFn({ method: 'POST' })
  .inputValidator(deleteBookSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const [book] = await tx
        .select({ kode: books.kode, judul: books.judul })
        .from(books)
        .where(eq(books.id, data.id))
        .limit(1)
      if (!book) {
        throw new Error('Buku tidak ditemukan.')
      }

      const deleted = await tx
        .delete(books)
        .where(eq(books.id, data.id))
        .returning({ id: books.id })
      if (deleted.length === 0) {
        throw new Error('Buku tidak ditemukan.')
      }

      await logActivity(tx, admin, {
        action: 'DELETE',
        entityType: 'BOOK',
        entityId: data.id,
        entityName: book.judul,
        details: { kode: book.kode ?? null },
      })

      return { id: data.id }
    })
  })

// GET /posisi setara -- list posisi rak buat dropdown form CRUD.
// Dijaga requireApprovedAdmin karena cuma dipakai admin panel; posisi
// rak sendiri bukan data sensitif, tapi tidak ada kebutuhan expose ke
// publik jadi digrupkan sebagai admin-only saja.
export const getPosisiList = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireApprovedAdmin()

    return db
      .select({ id: posisi.id, kode: posisi.kode, rak: posisi.rak })
      .from(posisi)
      .orderBy(posisi.kode)
  },
)

// ── DELETE REQUESTS (pengajuan hapus buku) ────────────────────────
// Admin biasa (requireApprovedAdmin) tidak boleh panggil deleteBook
// langsung -- mereka cuma bisa mengajukan lewat requestBookDeletion.
// Superadmin (requireSuperadmin) yang approve/reject. Approve memanggil
// ULANG logic hapus yang sama persis dengan deleteBook di atas (bukan
// query terpisah), supaya tidak ada state "approved tapi bukunya masih
// ada" -- satu-satunya jalur hapus fisik tetap satu tempat.

const requestDeletionSchema = z.object({
  bookId: z.number().int(),
  alasan: z.string().trim().min(5, 'Alasan minimal 5 karakter.'),
})

// POST /admin/books/:id/request-delete setara.
export const requestBookDeletion = createServerFn({ method: 'POST' })
  .inputValidator(requestDeletionSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [book] = await tx
        .select({ judul: books.judul })
        .from(books)
        .where(eq(books.id, data.bookId))
        .limit(1)
      if (!book) {
        throw new Error('Buku tidak ditemukan.')
      }

      try {
        const [request] = await tx
          .insert(deleteRequests)
          .values({
            bookId: data.bookId,
            bookJudulSnapshot: book.judul,
            alasan: data.alasan,
            requestedBy: admin.id,
          })
          .returning({ id: deleteRequests.id })

        await logActivity(tx, admin, {
          action: 'DELETE_REQUEST',
          entityType: 'BOOK',
          entityId: data.bookId,
          entityName: book.judul,
          details: { requestId: request.id, alasan: data.alasan },
        })

        return { id: request.id }
      } catch (err) {
        // Partial unique index (delete_requests_one_pending_per_book) di
        // DB yang menolak insert kalau buku ini sudah punya pengajuan
        // pending -- Postgres error code 23505 = unique_violation.
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === '23505'
        ) {
          throw new Error('Buku ini sudah punya pengajuan hapus yang menunggu persetujuan.')
        }
        throw err
      }
    })
  })

// GET /admin/delete-requests setara -- daftar pengajuan pending, dengan
// judul buku dan nama admin pengaju untuk ditampilkan di UI approval.
export const getPendingDeleteRequests = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSuperadmin()

    // Pakai bookJudulSnapshot (bukan JOIN ke books) supaya tampilan tetap
    // benar walau di masa depan ada baris delete_requests lama yang
    // bookId-nya sudah null (buku sudah dihapus lewat jalur lain).
    return db
      .select({
        id: deleteRequests.id,
        bookId: deleteRequests.bookId,
        bookJudul: deleteRequests.bookJudulSnapshot,
        alasan: deleteRequests.alasan,
        createdAt: deleteRequests.createdAt,
        requestedByNama: adminProfiles.nama,
      })
      .from(deleteRequests)
      .innerJoin(adminProfiles, eq(deleteRequests.requestedBy, adminProfiles.id))
      .where(eq(deleteRequests.status, 'pending'))
      .orderBy(deleteRequests.createdAt)
  },
)

const reviewDeleteRequestSchema = z.object({ id: z.number().int() })

// POST /admin/delete-requests/:id/approve setara -- approve = eksekusi
// hapus buku beneran (transaksi: hapus buku + tandai request approved),
// bukan cuma ubah status. Kalau buku sudah kehapus duluan (mis. dua
// approval ganda), lempar error yang jelas alih-alih diam-diam sukses.
export const approveDeleteRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewDeleteRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          id: deleteRequests.id,
          bookId: deleteRequests.bookId,
          bookJudul: deleteRequests.bookJudulSnapshot,
          status: deleteRequests.status,
        })
        .from(deleteRequests)
        .where(eq(deleteRequests.id, data.id))
        .limit(1)

      if (!request) {
        throw new Error('Pengajuan tidak ditemukan.')
      }
      if (request.status !== 'pending') {
        throw new Error('Pengajuan ini sudah diproses sebelumnya.')
      }
      if (request.bookId === null) {
        throw new Error('Buku yang diajukan sudah tidak ada (mungkin sudah dihapus sebelumnya).')
      }

      // Update status DULU (sebelum hapus buku) -- audit trail (siapa
      // approve, kapan) harus tersimpan sebelum bookId di-set-null lewat
      // FK. Urutan terbalik dari versi sebelumnya yang langsung hapus.
      await tx
        .update(deleteRequests)
        .set({ status: 'approved', reviewedBy: admin.id, reviewedAt: new Date() })
        .where(eq(deleteRequests.id, data.id))

      const deleted = await tx
        .delete(books)
        .where(eq(books.id, request.bookId))
        .returning({ id: books.id })

      if (deleted.length === 0) {
        throw new Error('Buku yang diajukan sudah tidak ada (mungkin sudah dihapus sebelumnya).')
      }

      await logActivity(tx, admin, {
        action: 'DELETE',
        entityType: 'BOOK',
        entityId: request.bookId,
        entityName: request.bookJudul,
        details: { requestId: data.id },
      })

      return { bookId: request.bookId }
    })
  })

// POST /admin/delete-requests/:id/reject setara -- buku TETAP ada,
// cuma status pengajuan diubah jadi rejected.
export const rejectDeleteRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewDeleteRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const updated = await tx
        .update(deleteRequests)
        .set({ status: 'rejected', reviewedBy: admin.id, reviewedAt: new Date() })
        .where(and(eq(deleteRequests.id, data.id), eq(deleteRequests.status, 'pending')))
        .returning({
          id: deleteRequests.id,
          bookId: deleteRequests.bookId,
          bookJudul: deleteRequests.bookJudulSnapshot,
        })

      if (updated.length === 0) {
        throw new Error('Pengajuan tidak ditemukan atau sudah diproses sebelumnya.')
      }

      await logActivity(tx, admin, {
        action: 'REJECT_DELETE_REQUEST',
        entityType: 'BOOK',
        entityId: updated[0].bookId,
        entityName: updated[0].bookJudul,
        details: { requestId: data.id },
      })

      return { id: data.id }
    })
  })

// GET /admin/books/:id (versi lengkap untuk form edit) -- beda dari
// getBook di catalog.ts yang publik dan cuma expose isDipinjam. Form
// edit butuh categoryIds mentah (semua kategori yang dicentang, bukan
// cuma kategoriId "utama") dan posisiId (versi sederhana: 1 baris di
// book_stock_locations per buku, ambil yang pertama).
const getBookForEditSchema = z.object({ id: z.number().int() })

export const getBookForEdit = createServerFn({ method: 'GET' })
  .inputValidator(getBookForEditSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const [book] = await db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        penulis: books.penulis,
        tahun: books.tahun,
        keterangan: books.keterangan,
        qty: books.qty,
      })
      .from(books)
      .where(eq(books.id, data.id))
      .limit(1)

    if (!book) {
      throw new Error('Buku tidak ditemukan.')
    }

    const categoryRows = await db
      .select({ categoryId: bookCategories.categoryId })
      .from(bookCategories)
      .where(eq(bookCategories.bookId, data.id))

    const [stockRow] = await db
      .select({ posisiId: bookStockLocations.posisiId })
      .from(bookStockLocations)
      .where(eq(bookStockLocations.bookId, data.id))
      .limit(1)

    return {
      ...book,
      categoryIds: categoryRows.map((c) => c.categoryId),
      posisiId: stockRow?.posisiId ?? null,
    }
  })

// ── CATEGORY REQUESTS (pengajuan kategori baru) ───────────────────
// Sama pola dengan delete-request: admin biasa MENGAJUKAN, superadmin
// approve/reject. Approve memanggil INSERT ke categories beneran di
// dalam transaksi yang sama, bukan jalur terpisah -- supaya tidak ada
// state "approved tapi kategorinya belum ada".

const requestCategorySchema = z.object({
  nama: z.string().trim().min(1, 'Nama kategori wajib diisi.'),
  alasan: z.string().trim().optional(),
})

// POST /admin/category-requests setara.
export const requestCategory = createServerFn({ method: 'POST' })
  .inputValidator(requestCategorySchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      // Cek dulu kalau kategori dengan nama itu udah ada beneran -- gak
      // perlu diajukan lagi kalau memang sudah tersedia.
      const [existing] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.nama, data.nama))
        .limit(1)
      if (existing) {
        throw new Error('Kategori dengan nama ini sudah ada.')
      }

      try {
        const [request] = await tx
          .insert(categoryRequests)
          .values({
            nama: data.nama,
            alasan: data.alasan || undefined,
            requestedBy: admin.id,
          })
          .returning({ id: categoryRequests.id })

        await logActivity(tx, admin, {
          action: 'CATEGORY_REQUEST',
          entityType: 'CATEGORY_REQUEST',
          entityId: request.id,
          entityName: data.nama,
          details: { alasan: data.alasan || null },
        })

        return { id: request.id }
      } catch (err) {
        // Partial unique index (category_requests_one_pending_per_nama)
        // menolak insert kalau nama ini sudah punya pengajuan pending.
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === '23505'
        ) {
          throw new Error('Kategori ini sudah pernah diajukan dan masih menunggu persetujuan.')
        }
        throw err
      }
    })
  })

// GET /admin/category-requests setara.
export const getPendingCategoryRequests = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSuperadmin()

    return db
      .select({
        id: categoryRequests.id,
        nama: categoryRequests.nama,
        alasan: categoryRequests.alasan,
        createdAt: categoryRequests.createdAt,
        requestedByNama: adminProfiles.nama,
      })
      .from(categoryRequests)
      .innerJoin(adminProfiles, eq(categoryRequests.requestedBy, adminProfiles.id))
      .where(eq(categoryRequests.status, 'pending'))
      .orderBy(categoryRequests.createdAt)
  },
)

const reviewCategoryRequestSchema = z.object({ id: z.number().int() })

// POST /admin/category-requests/:id/approve setara -- approve =
// beneran insert ke categories, dalam transaksi yang sama dengan
// update status pengajuan.
export const approveCategoryRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewCategoryRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const [request] = await tx
        .select({
          id: categoryRequests.id,
          nama: categoryRequests.nama,
          status: categoryRequests.status,
        })
        .from(categoryRequests)
        .where(eq(categoryRequests.id, data.id))
        .limit(1)

      if (!request) {
        throw new Error('Pengajuan tidak ditemukan.')
      }
      if (request.status !== 'pending') {
        throw new Error('Pengajuan ini sudah diproses sebelumnya.')
      }

      let newCategory: { id: number }
      try {
        ;[newCategory] = await tx
          .insert(categories)
          .values({ nama: request.nama })
          .returning({ id: categories.id })
      } catch (err) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code?: string }).code === '23505'
        ) {
          throw new Error('Kategori dengan nama ini sudah ada (mungkin dibuat lewat jalur lain).')
        }
        throw err
      }

      await tx
        .update(categoryRequests)
        .set({
          status: 'approved',
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          createdCategoryId: newCategory.id,
        })
        .where(eq(categoryRequests.id, data.id))

      await logActivity(tx, admin, {
        action: 'APPROVE_CATEGORY_REQUEST',
        entityType: 'CATEGORY_REQUEST',
        entityId: data.id,
        entityName: request.nama,
        details: { categoryId: newCategory.id },
      })

      return { categoryId: newCategory.id }
    })
  })

// POST /admin/category-requests/:id/reject setara.
export const rejectCategoryRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewCategoryRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const updated = await tx
        .update(categoryRequests)
        .set({ status: 'rejected', reviewedBy: admin.id, reviewedAt: new Date() })
        .where(and(eq(categoryRequests.id, data.id), eq(categoryRequests.status, 'pending')))
        .returning({ id: categoryRequests.id, nama: categoryRequests.nama })

      if (updated.length === 0) {
        throw new Error('Pengajuan tidak ditemukan atau sudah diproses sebelumnya.')
      }

      await logActivity(tx, admin, {
        action: 'REJECT_CATEGORY_REQUEST',
        entityType: 'CATEGORY_REQUEST',
        entityId: data.id,
        entityName: updated[0].nama,
        details: { alasan: null },
      })

      return { id: data.id }
    })
  })
