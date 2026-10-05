import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../db'
import { adminProfiles, maintenanceRequests } from '../db/schema'
import { requireApprovedAdmin, requireSuperadmin } from './guards'
import { logActivity } from './activity-log'
import { invalidateMaintenanceCache } from '../lib/maintenance-state'

// Kode Postgres bisa ada di err.code atau err.cause.code (Drizzle
// membungkus error driver).
function pgErrorCode(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } } | undefined
  return e?.code ?? e?.cause?.code
}

const SUDAH_ADA =
  'Sudah ada pengajuan maintenance yang menunggu persetujuan atau sedang aktif.'

// Dibaca semua admin yang sudah di-approve (admin biasa perlu melihat
// status sebelum mengajukan).
export const getMaintenanceOverview = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireApprovedAdmin()

    const pengaju = alias(adminProfiles, 'pengaju')
    const peninjau = alias(adminProfiles, 'peninjau')
    const pengakhir = alias(adminProfiles, 'pengakhir')

    const rows = await db
      .select({
        id: maintenanceRequests.id,
        alasan: maintenanceRequests.alasan,
        status: maintenanceRequests.status,
        createdAt: maintenanceRequests.createdAt,
        reviewedAt: maintenanceRequests.reviewedAt,
        startedAt: maintenanceRequests.startedAt,
        endedAt: maintenanceRequests.endedAt,
        requestedByNama: pengaju.nama,
        reviewedByNama: peninjau.nama,
        endedByNama: pengakhir.nama,
      })
      .from(maintenanceRequests)
      .leftJoin(pengaju, eq(maintenanceRequests.requestedBy, pengaju.id))
      .leftJoin(peninjau, eq(maintenanceRequests.reviewedBy, peninjau.id))
      .leftJoin(pengakhir, eq(maintenanceRequests.endedBy, pengakhir.id))
      .orderBy(desc(maintenanceRequests.createdAt), desc(maintenanceRequests.id))
      .limit(15)

    return { envFull: process.env.MAINTENANCE_MODE === 'true', rows }
  },
)

const requestSchema = z.object({
  alasan: z.string().trim().min(5, 'Alasan minimal 5 karakter.'),
})

// Admin biasa -> pending (menunggu superadmin). Superadmin -> langsung
// aktif, tetap tercatat di log.
export const requestMaintenance = createServerFn({ method: 'POST' })
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()
    const langsungAktif = admin.isSuperadmin

    const result = await db.transaction(async (tx) => {
      const [open] = await tx
        .select({ id: maintenanceRequests.id })
        .from(maintenanceRequests)
        .where(inArray(maintenanceRequests.status, ['pending', 'active']))
        .limit(1)
      if (open) throw new Error(SUDAH_ADA)

      const now = new Date()
      const values = langsungAktif
        ? {
            alasan: data.alasan,
            requestedBy: admin.id,
            status: 'active' as const,
            reviewedBy: admin.id,
            reviewedAt: now,
            startedAt: now,
          }
        : { alasan: data.alasan, requestedBy: admin.id }

      try {
        const [row] = await tx
          .insert(maintenanceRequests)
          .values(values)
          .returning({ id: maintenanceRequests.id })

        await logActivity(tx, admin, {
          action: langsungAktif ? 'MAINTENANCE_START' : 'MAINTENANCE_REQUEST',
          entityType: 'MAINTENANCE',
          entityId: row.id,
          details: { alasan: data.alasan },
        })
        return { id: row.id, aktif: langsungAktif }
      } catch (err) {
        // Indeks unik parsial menolak kalau ada race dengan pengajuan lain.
        if (pgErrorCode(err) === '23505') throw new Error(SUDAH_ADA)
        throw err
      }
    })

    if (result.aktif) invalidateMaintenanceCache()
    return result
  })

const reviewSchema = z.object({ id: z.number().int() })

export const approveMaintenanceRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    await db.transaction(async (tx) => {
      try {
        const now = new Date()
        const [row] = await tx
          .update(maintenanceRequests)
          .set({ status: 'active', reviewedBy: admin.id, reviewedAt: now, startedAt: now })
          .where(
            and(eq(maintenanceRequests.id, data.id), eq(maintenanceRequests.status, 'pending')),
          )
          .returning({ id: maintenanceRequests.id, alasan: maintenanceRequests.alasan })
        if (!row) throw new Error('Pengajuan tidak ditemukan atau sudah diproses.')

        await logActivity(tx, admin, {
          action: 'MAINTENANCE_APPROVE',
          entityType: 'MAINTENANCE',
          entityId: row.id,
          details: { alasan: row.alasan },
        })
      } catch (err) {
        if (pgErrorCode(err) === '23505') throw new Error('Maintenance lain sudah aktif.')
        throw err
      }
    })

    invalidateMaintenanceCache()
    return { id: data.id }
  })

export const rejectMaintenanceRequest = createServerFn({ method: 'POST' })
  .inputValidator(reviewSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(maintenanceRequests)
        .set({ status: 'rejected', reviewedBy: admin.id, reviewedAt: new Date() })
        .where(
          and(eq(maintenanceRequests.id, data.id), eq(maintenanceRequests.status, 'pending')),
        )
        .returning({ id: maintenanceRequests.id, alasan: maintenanceRequests.alasan })
      if (!row) throw new Error('Pengajuan tidak ditemukan atau sudah diproses.')

      await logActivity(tx, admin, {
        action: 'MAINTENANCE_REJECT',
        entityType: 'MAINTENANCE',
        entityId: row.id,
        details: { alasan: row.alasan },
      })
    })

    return { id: data.id }
  })

export const endMaintenance = createServerFn({ method: 'POST' })
  .inputValidator(reviewSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .update(maintenanceRequests)
        .set({ status: 'ended', endedBy: admin.id, endedAt: new Date() })
        .where(
          and(eq(maintenanceRequests.id, data.id), eq(maintenanceRequests.status, 'active')),
        )
        .returning({ id: maintenanceRequests.id, alasan: maintenanceRequests.alasan })
      if (!row) throw new Error('Maintenance ini tidak aktif (mungkin sudah diakhiri).')

      await logActivity(tx, admin, {
        action: 'MAINTENANCE_END',
        entityType: 'MAINTENANCE',
        entityId: row.id,
        details: { alasan: row.alasan },
      })
    })

    invalidateMaintenanceCache()
    return { id: data.id }
  })
