import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, and, isNull, ilike, desc, sql, or } from 'drizzle-orm'
import { db } from '../db'
import {
  loanRequests,
  members,
  loans,
  loanStockAllocations,
  books,
  bookStockLocations,
  adminProfiles,
} from '../db/schema'
import { requireApprovedAdmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'
import { allocateFromLargestStock, canCreateLoan } from './allocation'

// Durasi pinjam dosen -- konstanta kode (bukan di DB/settings table) biar
// gampang diubah kalau kesepakatan berubah, tanpa perlu migration.
const DOSEN_LOAN_DURATION_DAYS = 14

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Jam tutup perpus WIB (UTC+7, Indonesia gak pakai DST jadi offset tetap):
// Kamis 14.00, hari lain 08.00-16.00 -> tutup jam 16.00. Dihitung dari jam
// wall-clock WIB, bukan dari timezone server (bisa beda-beda tergantung
// hosting).
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

function computeMahasiswaDueAt(now: Date): Date {
  const jakartaWallClock = new Date(now.getTime() + WIB_OFFSET_MS)
  const dayOfWeek = jakartaWallClock.getUTCDay() // 4 = Kamis
  const closingHour = dayOfWeek === 4 ? 14 : 16

  const dueAsIfUtc = Date.UTC(
    jakartaWallClock.getUTCFullYear(),
    jakartaWallClock.getUTCMonth(),
    jakartaWallClock.getUTCDate(),
    closingHour,
    0,
    0,
    0,
  )
  return new Date(dueAsIfUtc - WIB_OFFSET_MS)
}

// ── LOAN REQUESTS -- approval workflow ────────────────────────────
// Beda dari delete/category-request: guard-nya requireApprovedAdmin
// (BUKAN requireSuperadmin) -- konfirmasi peminjaman dianggap kerjaan
// rutin harian yang dilakukan siapa aja yang lagi piket, bukan aksi
// sensitif yang butuh approval superadmin.

// "Pengajuan Masuk" di halaman approval: belum diproses (pending), ATAU
// sudah ditolak tapi peminjam belum dikabari lewat WhatsApp
// (rejectionNotifiedAt masih null) -- begitu WA reject terkirim, baris
// ini hilang dari daftar (lihat markLoanRequestRejectionNotified).
export const getPendingLoanRequests = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireApprovedAdmin()

    return db
      .select({
        id: loanRequests.id,
        bookId: loanRequests.bookId,
        bookJudul: loanRequests.bookJudulSnapshot,
        namaPeminjam: loanRequests.namaPeminjam,
        role: loanRequests.role,
        jenjang: loanRequests.jenjang,
        angkatan: loanRequests.angkatan,
        whatsapp: loanRequests.whatsapp,
        email: loanRequests.email,
        keperluan: loanRequests.keperluan,
        status: loanRequests.status,
        rejectionAlasan: loanRequests.rejectionAlasan,
        createdAt: loanRequests.createdAt,
      })
      .from(loanRequests)
      .where(
        or(
          eq(loanRequests.status, 'pending'),
          and(eq(loanRequests.status, 'rejected'), isNull(loanRequests.rejectionNotifiedAt)),
        ),
      )
      .orderBy(loanRequests.createdAt)
  },
)

const reviewLoanRequestSchema = z.object({ id: z.number().int() })

const rejectLoanRequestSchema = z.object({
  id: z.number().int(),
  alasan: z.string().trim().min(5, 'Alasan minimal 5 karakter.'),
})

// POST /admin/loan-requests/:id/approve setara -- transaksi penuh:
// cek canCreateLoan (reuse allocation.ts apa adanya) -> insert member
// baru dari snapshot form -> insert loan (dueAt sesuai role) -> insert
// alokasi stok -> update status jadi approved.
export const approveLoanRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewLoanRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(loanRequests)
        .where(eq(loanRequests.id, data.id))
        .limit(1)

      if (!request) {
        throw new Error('Pengajuan tidak ditemukan.')
      }
      if (request.status !== 'pending') {
        throw new Error('Pengajuan ini sudah diproses sebelumnya.')
      }
      if (request.bookId === null) {
        throw new Error('Buku yang diajukan sudah tidak ada (mungkin sudah dihapus).')
      }

      const [book] = await tx
        .select({ qty: books.qty })
        .from(books)
        .where(eq(books.id, request.bookId))
        .limit(1)
      if (!book) {
        throw new Error('Buku yang diajukan sudah tidak ada (mungkin sudah dihapus).')
      }

      const stockLocations = await tx
        .select({ posisiId: bookStockLocations.posisiId, qty: bookStockLocations.qty })
        .from(bookStockLocations)
        .where(eq(bookStockLocations.bookId, request.bookId))

      const activeLoans = await tx
        .select({ id: loans.id })
        .from(loans)
        .where(and(eq(loans.bookId, request.bookId), isNull(loans.tanggalKembali)))

      // Alokasi yang masih "aktif" (belum returnedAt) lintas SEMUA loan
      // buku ini -- dipakai allocateFromLargestStock buat tau sisa stok
      // riil per posisi, bukan cuma qty statis.
      const activeAllocationRows = await tx
        .select({ posisiId: loanStockAllocations.posisiId, qty: loanStockAllocations.qty })
        .from(loanStockAllocations)
        .innerJoin(loans, eq(loanStockAllocations.loanId, loans.id))
        .where(and(eq(loans.bookId, request.bookId), isNull(loanStockAllocations.returnedAt)))

      const allocatedPosisiId = allocateFromLargestStock(stockLocations, activeAllocationRows)

      const { allowed, reason } = canCreateLoan(
        activeLoans.length,
        book.qty,
        allocatedPosisiId,
        stockLocations.length > 0,
      )
      if (!allowed) {
        throw new Error(reason ?? 'Peminjaman tidak bisa disetujui saat ini.')
      }

      const [member] = await tx
        .insert(members)
        .values({
          nama: request.namaPeminjam,
          role: request.role,
          jenjang: request.jenjang,
          angkatan: request.angkatan,
          whatsapp: request.whatsapp,
          email: request.email,
        })
        .returning({ id: members.id })

      const dueAt =
        request.role === 'dosen'
          ? addDays(new Date(), DOSEN_LOAN_DURATION_DAYS)
          : computeMahasiswaDueAt(new Date())

      const [loan] = await tx
        .insert(loans)
        .values({
          bookId: request.bookId,
          bookJudulSnapshot: request.bookJudulSnapshot,
          memberId: member.id,
          dueAt,
          dicatatOleh: admin.id,
        })
        .returning({ id: loans.id })

      // Kalau allocatedPosisiId null (edge case bookQty===1 tanpa posisi --
      // lihat komentar canCreateLoan di allocation.ts), loan tetap dibuat
      // TANPA baris alokasi -- niru perilaku V1 apa adanya.
      if (allocatedPosisiId !== null) {
        await tx.insert(loanStockAllocations).values({
          loanId: loan.id,
          bookId: request.bookId,
          posisiId: allocatedPosisiId,
          qty: 1,
        })
      }

      await tx
        .update(loanRequests)
        .set({
          status: 'approved',
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          createdMemberId: member.id,
          createdLoanId: loan.id,
        })
        .where(eq(loanRequests.id, data.id))

      await logActivity(tx, admin, {
        action: 'APPROVE_LOAN_REQUEST',
        entityType: 'LOAN_REQUEST',
        entityId: data.id,
        entityName: request.bookJudulSnapshot,
        details: { loanId: loan.id, memberId: member.id, role: request.role },
      })

      return { loanId: loan.id, memberId: member.id }
    })
  })

// POST /admin/loan-requests/:id/reject setara. alasan WAJIB (ditulis
// admin, bukan peminjam) -- ditampilkan sebagai draft pesan WhatsApp
// reject yang bisa diedit sebelum dikirim (lihat
// markLoanRequestRejectionNotified).
export const rejectLoanRequest = createServerFn({ method: 'POST' })
  .inputValidator(rejectLoanRequestSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const updated = await tx
        .update(loanRequests)
        .set({
          status: 'rejected',
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          rejectionAlasan: data.alasan,
        })
        .where(and(eq(loanRequests.id, data.id), eq(loanRequests.status, 'pending')))
        .returning({
          id: loanRequests.id,
          bookJudul: loanRequests.bookJudulSnapshot,
        })

      if (updated.length === 0) {
        throw new Error('Pengajuan tidak ditemukan atau sudah diproses sebelumnya.')
      }

      await logActivity(tx, admin, {
        action: 'REJECT_LOAN_REQUEST',
        entityType: 'LOAN_REQUEST',
        entityId: data.id,
        entityName: updated[0].bookJudul,
        details: { alasan: data.alasan },
      })

      return { id: data.id }
    })
  })

const markRejectionNotifiedSchema = z.object({ id: z.number().int() })

// Dipanggil setelah admin klik "Kirim" di kotak pesan WhatsApp reject --
// row lalu hilang dari "Pengajuan Masuk" (lihat where di
// getPendingLoanRequests).
export const markLoanRequestRejectionNotified = createServerFn({ method: 'POST' })
  .inputValidator(markRejectionNotifiedSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const updated = await db
      .update(loanRequests)
      .set({ rejectionNotifiedAt: new Date() })
      .where(and(eq(loanRequests.id, data.id), eq(loanRequests.status, 'rejected')))
      .returning({ id: loanRequests.id })

    if (updated.length === 0) {
      throw new Error('Pengajuan tidak ditemukan atau belum berstatus rejected.')
    }

    return { id: data.id }
  })

// ── RETURN LOAN (aksi admin, bukan mahasiswa/dosen) ───────────────
const returnLoanSchema = z.object({ id: z.number().int() })

// POST /admin/loans/:id/return setara -- dipanggil petugas pas buku
// fisik balik ke tangan mereka.
export const returnLoan = createServerFn({ method: 'POST' })
  .inputValidator(returnLoanSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [loan] = await tx
        .select({
          id: loans.id,
          tanggalKembali: loans.tanggalKembali,
          bookJudul: loans.bookJudulSnapshot,
          memberId: loans.memberId,
        })
        .from(loans)
        .where(eq(loans.id, data.id))
        .limit(1)

      if (!loan) {
        throw new Error('Data peminjaman tidak ditemukan.')
      }
      if (loan.tanggalKembali !== null) {
        throw new Error('Peminjaman ini sudah ditandai dikembalikan sebelumnya.')
      }

      await tx
        .update(loans)
        .set({ tanggalKembali: sql`CURRENT_DATE` })
        .where(eq(loans.id, data.id))

      await tx
        .update(loanStockAllocations)
        .set({ returnedAt: new Date() })
        .where(and(eq(loanStockAllocations.loanId, data.id), isNull(loanStockAllocations.returnedAt)))

      await logActivity(tx, admin, {
        action: 'RETURN_LOAN',
        entityType: 'LOAN',
        entityId: data.id,
        entityName: loan.bookJudul,
        details: { memberId: loan.memberId },
      })

      return { id: data.id }
    })
  })

// ── LOAN NOTIFICATION TIMESTAMPS (chat WhatsApp manual) ───────────
// Pola sama di ketiga fungsi ini: admin klik "Kirim" di kotak pesan
// WhatsApp yang bisa diedit di UI, wa.me kebuka di tab baru, lalu
// client panggil salah satu fungsi ini buat catat kapan tombol "Kirim"
// diklik. TIDAK ada verifikasi WA beneran terkirim/dibaca (gak ada API
// buat itu) -- murni catatan waktu di sisi admin.
const markLoanTimestampSchema = z.object({ id: z.number().int() })

// Pickup: opsional & independen dari alur pengembalian, tombolnya boleh
// diklik berkali-kali kapan saja selama loan masih aktif (TIDAK
// menggating tombol pengembalian).
export const markLoanPickupNotified = createServerFn({ method: 'POST' })
  .inputValidator(markLoanTimestampSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const updated = await db
      .update(loans)
      .set({ pickupNotifiedAt: new Date() })
      .where(eq(loans.id, data.id))
      .returning({ id: loans.id })

    if (updated.length === 0) {
      throw new Error('Data peminjaman tidak ditemukan.')
    }

    return { id: data.id }
  })

// Tahap 1 alur reminder pengembalian: admin klik "Konfirmasi
// Pengembalian" -- TIDAK kirim WA apa pun di sini, cuma menandai supaya
// tombol berikutnya di UI berubah jadi "Chat WhatsApp - Reminder".
export const markLoanReturnReminderStarted = createServerFn({ method: 'POST' })
  .inputValidator(markLoanTimestampSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const updated = await db
      .update(loans)
      .set({ returnReminderStartedAt: new Date() })
      .where(and(eq(loans.id, data.id), isNull(loans.tanggalKembali)))
      .returning({ id: loans.id })

    if (updated.length === 0) {
      throw new Error('Data peminjaman tidak ditemukan atau sudah dikembalikan.')
    }

    return { id: data.id }
  })

// Tahap 2: setelah admin beneran kirim pesan reminder pengembalian.
export const markLoanReturnNotified = createServerFn({ method: 'POST' })
  .inputValidator(markLoanTimestampSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const updated = await db
      .update(loans)
      .set({ returnNotifiedAt: new Date() })
      .where(and(eq(loans.id, data.id), isNull(loans.tanggalKembali)))
      .returning({ id: loans.id })

    if (updated.length === 0) {
      throw new Error('Data peminjaman tidak ditemukan atau sudah dikembalikan.')
    }

    return { id: data.id }
  })

// ── MEMBERS (admin-only, gantiin Member Archive publik V1) ────────
// Read-only: list member + search/filter, dan histori peminjaman per
// member. Guard requireApprovedAdmin -- ini cuma nge-liat data.

const getMembersSchema = z.object({
  search: z.string().trim().optional(),
  // "S1"/"S2"/"S3" = filter role=mahasiswa DAN jenjang tsb. "dosen" =
  // filter role=dosen (jenjang gak relevan). Satu dropdown gabungan di
  // UI, bukan dua filter terpisah.
  filter: z.enum(['S1', 'S2', 'S3', 'dosen']).optional(),
  angkatan: z.number().int().optional(),
})

export const getMembers = createServerFn({ method: 'GET' })
  .inputValidator(getMembersSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    const conditions = []
    if (data.search) {
      conditions.push(ilike(members.nama, `%${data.search}%`))
    }
    if (data.filter === 'dosen') {
      conditions.push(eq(members.role, 'dosen'))
    } else if (data.filter) {
      conditions.push(and(eq(members.role, 'mahasiswa'), eq(members.jenjang, data.filter)))
    }
    if (data.angkatan) {
      conditions.push(eq(members.angkatan, data.angkatan))
    }

    return db
      .select({
        id: members.id,
        nama: members.nama,
        role: members.role,
        jenjang: members.jenjang,
        angkatan: members.angkatan,
        whatsapp: members.whatsapp,
        email: members.email,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(members.createdAt))
  })

const getMemberLoansSchema = z.object({ memberId: z.number().int() })

export const getMemberLoans = createServerFn({ method: 'GET' })
  .inputValidator(getMemberLoansSchema)
  .handler(async ({ data }) => {
    await requireApprovedAdmin()

    return db
      .select({
        id: loans.id,
        bookId: loans.bookId,
        bookJudul: loans.bookJudulSnapshot,
        tanggalPinjam: loans.tanggalPinjam,
        dueAt: loans.dueAt,
        tanggalKembali: loans.tanggalKembali,
        catatan: loans.catatan,
      })
      .from(loans)
      .where(eq(loans.memberId, data.memberId))
      .orderBy(desc(loans.tanggalPinjam))
  })

// getActiveLoans -- khusus halaman approval (/admin/loans/requests),
// beda dari getMemberLoans yang dipakai expand-row di halaman members.
// Join ke members buat ambil nama+whatsapp (isi template pesan WA), dan
// balikin ketiga timestamp notifikasi buat nentuin tombol mana yang
// tampil per row di state machine (lihat handoff sesi loan_requests).
export const getActiveLoans = createServerFn({ method: 'GET' }).handler(async () => {
  await requireApprovedAdmin()

  return db
    .select({
      id: loans.id,
      bookId: loans.bookId,
      bookJudul: loans.bookJudulSnapshot,
      memberId: loans.memberId,
      memberNama: members.nama,
      memberWhatsapp: members.whatsapp,
      role: members.role,
      tanggalPinjam: loans.tanggalPinjam,
      dueAt: loans.dueAt,
      pickupNotifiedAt: loans.pickupNotifiedAt,
      returnReminderStartedAt: loans.returnReminderStartedAt,
      returnNotifiedAt: loans.returnNotifiedAt,
    })
    .from(loans)
    .innerJoin(members, eq(loans.memberId, members.id))
    .where(isNull(loans.tanggalKembali))
    .orderBy(loans.dueAt)
})

// getLoanHistory -- log aktivitas peminjaman (aktif + sudah dikembalikan)
// buat halaman approval, biar admin bisa lihat siapa yang bertanggung
// jawab (dicatatOleh, diisi pas approveLoanRequest) atas tiap peminjaman.
// Read-only, tanpa aksi apa pun -- beda dari getActiveLoans yang state
// machine-nya bisa diklik. Dibatasi 50 baris terbaru (bukan paginated)
// biar simpel dulu; kalau nanti kepanjangan bisa ditambah pagination.
export const getLoanHistory = createServerFn({ method: 'GET' }).handler(async () => {
  await requireApprovedAdmin()

  return db
    .select({
      id: loans.id,
      bookJudul: loans.bookJudulSnapshot,
      memberNama: members.nama,
      role: members.role,
      tanggalPinjam: loans.tanggalPinjam,
      dueAt: loans.dueAt,
      tanggalKembali: loans.tanggalKembali,
      dicatatOlehNama: adminProfiles.nama,
    })
    .from(loans)
    .innerJoin(members, eq(loans.memberId, members.id))
    .leftJoin(adminProfiles, eq(loans.dicatatOleh, adminProfiles.id))
    .orderBy(desc(loans.tanggalPinjam))
    .limit(50)
})
