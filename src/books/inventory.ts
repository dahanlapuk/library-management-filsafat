import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, asc, isNull, sql, ilike, or } from 'drizzle-orm'
import { db } from '../db'
import { books, bookStockLocations, posisi } from '../db/schema'
import { requireApprovedAdmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

// ── INVENTORY CHECK — cek fisik rak & koreksi qty/posisi ──────────
// Tanpa approval workflow -- koreksi langsung tersimpan begitu admin
// submit, ini kerjaan rutin cek fisik bukan keputusan yang butuh
// review superadmin. CATATAN: activity-log baru (aktor dari sesi
// tervalidasi) belum dibangun (Fase 3) -- books.checkedBy/
// lastCheckCatatan di sini SATU-SATUNYA jejak, ditimpa tiap kali
// dicek ulang, bukan histori penuh. Sudah disampaikan & diterima
// Itba, dianggap cukup untuk sekarang.
//
// Mencakup buku TANPA rak (books.posisiId IS NULL) sebagai bucket
// terpisah "Belum Ditempatkan" -- realisasi filter `unpositioned` V1
// yang sengaja ditunda dari Fase 1.
//
// Admin bisa mengoreksi POSISI juga (bukan cuma qty) dalam satu aksi
// checklist yang sama -- menutupi kasus buku ketemu tapi di rak yang
// beda dari catatan sistem, atau tidak ketemu sama sekali.

const UNPOSITIONED_LABEL = 'Belum Ditempatkan'

// GET /admin/inventory setara -- list semua rak + bucket "Belum
// Ditempatkan" + progress checklist. Bucket unpositioned SELALU di
// posisi pertama (prioritas tertinggi), sisanya diurut rak dengan
// buku belum-dicek TERBANYAK di atas.
export const getPosisiWithProgress = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireApprovedAdmin()

    const rakRows = await db
      .select({
        id: posisi.id,
        kode: posisi.kode,
        rak: posisi.rak,
        totalBuku: sql<number>`count(${books.id})`.mapWith(Number),
        sudahDicek: sql<number>`count(${books.id}) filter (where ${books.lastChecked} is not null)`.mapWith(
          Number,
        ),
      })
      .from(posisi)
      .leftJoin(books, eq(books.posisiId, posisi.id))
      .groupBy(posisi.id, posisi.kode, posisi.rak)

    const [unpositioned] = await db
      .select({
        totalBuku: sql<number>`count(${books.id})`.mapWith(Number),
        sudahDicek: sql<number>`count(${books.id}) filter (where ${books.lastChecked} is not null)`.mapWith(
          Number,
        ),
      })
      .from(books)
      .where(isNull(books.posisiId))

    const sortedRak = rakRows
      .filter((p) => p.totalBuku > 0)
      .sort((a, b) => {
        const belumA = a.totalBuku - a.sudahDicek
        const belumB = b.totalBuku - b.sudahDicek
        if (belumB !== belumA) return belumB - belumA
        return a.kode.localeCompare(b.kode)
      })

    const result: Array<{
      id: number | null
      kode: string
      rak: string
      totalBuku: number
      sudahDicek: number
    }> = []

    if (unpositioned && unpositioned.totalBuku > 0) {
      result.push({
        id: null,
        kode: UNPOSITIONED_LABEL,
        rak: '-',
        totalBuku: unpositioned.totalBuku,
        sudahDicek: unpositioned.sudahDicek,
      })
    }

    result.push(...sortedRak)
    return result
  },
)

const getBooksSchema = z.object({ posisiId: z.number().int().nullable() })

// GET /admin/inventory/:posisiId setara (posisiId null = bucket
// "Belum Ditempatkan").
export const getBooksForInventoryCheck = createServerFn({ method: 'GET' })
  .inputValidator(getBooksSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    return db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        qty: books.qty,
        lastChecked: books.lastChecked,
        checkedBy: books.checkedBy,
        lastCheckCatatan: books.lastCheckCatatan,
      })
      .from(books)
      .where(
        data.posisiId === null
          ? isNull(books.posisiId)
          : eq(books.posisiId, data.posisiId),
      )
      .orderBy(sql`${books.lastChecked} is not null`, asc(books.judul))
  })

const searchBooksSchema = z.object({ q: z.string().trim().min(1) })

// GET /admin/inventory/search setara -- cari buku LINTAS SEMUA RAK
// sekaligus (judul atau kode), bukan cuma dalam satu rak yang lagi
// dipilih di sidebar. Ikut balikin posisi ASLI buku itu (posisiId +
// posisiKode) karena hasil bisa datang dari rak mana pun -- UI perlu
// tau itu buku "sebetulnya" ada di rak mana sebelum dikoreksi.
export const searchBooksForInventoryCheck = createServerFn({ method: 'GET' })
  .inputValidator(searchBooksSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    return db
      .select({
        id: books.id,
        kode: books.kode,
        judul: books.judul,
        qty: books.qty,
        lastChecked: books.lastChecked,
        checkedBy: books.checkedBy,
        lastCheckCatatan: books.lastCheckCatatan,
        posisiId: books.posisiId,
        posisiKode: posisi.kode,
      })
      .from(books)
      .leftJoin(posisi, eq(books.posisiId, posisi.id))
      .where(or(ilike(books.judul, `%${data.q}%`), ilike(books.kode, `%${data.q}%`)))
      .orderBy(asc(books.judul))
      .limit(50)
  })

const submitCheckSchema = z.object({
  bookId: z.number().int(),
  // Posisi HASIL checklist -- boleh beda dari posisi asal buku kalau
  // ternyata ketemu di rak lain, atau null kalau tidak ditemukan di
  // rak manapun / sengaja dilepas dari rak.
  newPosisiId: z.number().int().nullable(),
  actualQty: z.number().int().min(0, 'Qty tidak boleh negatif.'),
  catatan: z.string().trim().max(500).optional(),
})

// POST /admin/inventory/check setara -- simpan hasil hitung fisik
// SATU buku. Update books.qty, books.posisiId (kalau berubah),
// lastChecked/checkedBy/catatan, DAN book_stock_locations (versi
// sederhana: 1 baris per buku -- dihapus & ditulis ulang di posisi
// baru, sama pola dengan syncBookCategoriesAndStock di admin.ts).
export const submitInventoryCheck = createServerFn({ method: 'POST' })
  .inputValidator(submitCheckSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [before] = await tx
        .select({ judul: books.judul, qty: books.qty, posisiId: books.posisiId })
        .from(books)
        .where(eq(books.id, data.bookId))
        .limit(1)
      if (!before) {
        throw new Error('Buku tidak ditemukan.')
      }

      const updated = await tx
        .update(books)
        .set({
          qty: data.actualQty,
          posisiId: data.newPosisiId,
          lastChecked: new Date(),
          checkedBy: admin.nama,
          lastCheckCatatan: data.catatan?.length ? data.catatan : null,
        })
        .where(eq(books.id, data.bookId))
        .returning({ id: books.id })

      if (updated.length === 0) {
        throw new Error('Buku tidak ditemukan.')
      }

      await tx
        .delete(bookStockLocations)
        .where(eq(bookStockLocations.bookId, data.bookId))

      if (data.newPosisiId !== null) {
        await tx.insert(bookStockLocations).values({
          bookId: data.bookId,
          posisiId: data.newPosisiId,
          qty: data.actualQty,
        })
      }

      await logActivity(tx, admin, {
        action: 'INVENTORY_CHECK',
        entityType: 'BOOK',
        entityId: data.bookId,
        entityName: before.judul,
        details: {
          qty: { dari: before.qty, ke: data.actualQty },
          catatan: data.catatan?.length ? data.catatan : null,
        },
      })

      if (before.posisiId !== data.newPosisiId) {
        await logActivity(tx, admin, {
          action: 'POSITION_CHANGE',
          entityType: 'BOOK',
          entityId: data.bookId,
          entityName: before.judul,
          details: { dari: before.posisiId, ke: data.newPosisiId },
        })
      }

      return { id: data.bookId }
    })
  })
