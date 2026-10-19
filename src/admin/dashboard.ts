import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, inArray, isNull, lt, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  activityLogs,
  adminProfiles,
  books,
  categoryRequests,
  deleteRequests,
  featureRequests,
  feedback,
  loanRequests,
  loans,
  members,
} from '../db/schema'
import { requireApprovedAdmin } from './guards'
import { getCurrentAdmin } from './auth'

const first = (rows: { n: number }[]) => rows[0]?.n ?? 0

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requireApprovedAdmin()
  const me = await getCurrentAdmin()
  const isSuperadmin = !!me?.isSuperadmin
  const isDeveloper = !!me?.isDeveloper
  const now = new Date()

  const [
    totals,
    tidakTersedia,
    menunggu,
    aktif,
    terlambat,
    feedbackBaru,
    ditelusuri,
    pengajuanTerbaru,
    pinjamanAktif,
  ] = await Promise.all([
    db
      .select({
        judul: count(),
        eksemplar: sql<number>`coalesce(sum(${books.qty}), 0)::int`,
      })
      .from(books),
    db.select({ n: count() }).from(books).where(lte(books.qty, 0)),
    db.select({ n: count() }).from(loanRequests).where(eq(loanRequests.status, 'pending')),
    db.select({ n: count() }).from(loans).where(isNull(loans.tanggalKembali)),
    db
      .select({ n: count() })
      .from(loans)
      .where(and(isNull(loans.tanggalKembali), lt(loans.dueAt, now))),
    db
      .select({ n: count() })
      .from(feedback)
      .where(inArray(feedback.status, ['baru', 'perlu_perhatian'])),
    db
      .select({
        id: books.id,
        judul: books.judul,
        catatan: books.lastCheckCatatan,
        checkedBy: books.checkedBy,
        lastChecked: books.lastChecked,
      })
      .from(books)
      .where(lte(books.qty, 0))
      .orderBy(sql`${books.lastChecked} desc nulls last`)
      .limit(6),
    db
      .select({
        id: loanRequests.id,
        judul: loanRequests.bookJudulSnapshot,
        nama: loanRequests.namaPeminjam,
        role: loanRequests.role,
        createdAt: loanRequests.createdAt,
      })
      .from(loanRequests)
      .where(eq(loanRequests.status, 'pending'))
      .orderBy(asc(loanRequests.createdAt))
      .limit(5),
    db
      .select({
        id: loans.id,
        judul: loans.bookJudulSnapshot,
        nama: members.nama,
        role: members.role,
        dueAt: loans.dueAt,
      })
      .from(loans)
      .innerJoin(members, eq(loans.memberId, members.id))
      .where(isNull(loans.tanggalKembali))
      .orderBy(asc(loans.dueAt))
      .limit(5),
  ])

  const extra = isSuperadmin
    ? await Promise.all([
        db.select({ n: count() }).from(deleteRequests).where(eq(deleteRequests.status, 'pending')),
        db
          .select({ n: count() })
          .from(categoryRequests)
          .where(eq(categoryRequests.status, 'pending')),
        db.select({ n: count() }).from(adminProfiles).where(eq(adminProfiles.isApproved, false)),
        db
          .select({
            id: activityLogs.id,
            adminNama: activityLogs.adminNama,
            action: activityLogs.action,
            entityName: activityLogs.entityName,
            createdAt: activityLogs.createdAt,
          })
          .from(activityLogs)
          .orderBy(desc(activityLogs.createdAt))
          .limit(8),
      ])
    : null

  const fiturBaru = isDeveloper
    ? first(
        await db.select({ n: count() }).from(featureRequests).where(eq(featureRequests.status, 'baru')),
      )
    : null

  return {
    buku: {
      judul: totals[0]?.judul ?? 0,
      eksemplar: totals[0]?.eksemplar ?? 0,
      tidakTersedia: first(tidakTersedia),
    },
    pinjaman: { menunggu: first(menunggu), aktif: first(aktif), terlambat: first(terlambat) },
    feedbackBaru: first(feedbackBaru),
    ditelusuri,
    pengajuanTerbaru,
    pinjamanAktif: pinjamanAktif.map((l) => ({
      ...l,
      terlambat: l.dueAt !== null && l.dueAt < now,
    })),
    requestFiturBaru: fiturBaru,
    superadmin: extra
      ? {
          hapus: first(extra[0]),
          kategori: first(extra[1]),
          adminMenunggu: first(extra[2]),
          aktivitas: extra[3],
        }
      : null,
  }
})
