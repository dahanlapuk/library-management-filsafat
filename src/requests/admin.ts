import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import {
  featureRequests,
  featureRequestAreaEnum,
  featureRequestStatusEnum,
} from '../db/schema'
import { requireApprovedAdmin, requireDeveloper } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

const contentSchema = z.object({
  judul: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(120, 'Judul maksimal 120 karakter.'),
  deskripsi: z.string().trim().min(10, 'Deskripsi minimal 10 karakter.').max(2000, 'Deskripsi maksimal 2000 karakter.'),
  area: z.enum(featureRequestAreaEnum.enumValues),
})

export const listFeatureRequests = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireApprovedAdmin()
    return db.select().from(featureRequests).orderBy(desc(featureRequests.id))
  },
)

export const createFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(contentSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(featureRequests)
        .values({ ...data, pengirimNama: admin.nama, createdBy: admin.id })
        .returning({ id: featureRequests.id })
      await logActivity(tx, admin, {
        action: 'REQUEST_CREATE',
        entityType: 'REQUEST',
        entityName: `#${row.id} ${data.judul}`,
        details: { requestId: row.id, area: data.area },
      })
      return { id: row.id }
    })
  })

const updateSchema = contentSchema.extend({ id: z.number().int() })

export const updateMyFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(updateSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, data.id))
      if (!row) throw new Error('Request tidak ditemukan.')
      if (row.createdBy !== admin.id) throw new Error('Hanya pengirim yang boleh mengubah request ini.')
      if (row.status !== 'baru') throw new Error('Request yang sudah ditanggapi tidak bisa diubah.')

      await tx
        .update(featureRequests)
        .set({ judul: data.judul, deskripsi: data.deskripsi, area: data.area, updatedAt: new Date() })
        .where(eq(featureRequests.id, data.id))
      await logActivity(tx, admin, {
        action: 'REQUEST_UPDATE',
        entityType: 'REQUEST',
        entityName: `#${row.id} ${data.judul}`,
        details: { requestId: row.id },
      })
    })

    return { success: true }
  })

const idSchema = z.object({ id: z.number().int() })

export const deleteMyFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, data.id))
      if (!row) throw new Error('Request tidak ditemukan.')
      if (row.createdBy !== admin.id) throw new Error('Hanya pengirim yang boleh menarik request ini.')
      if (row.status !== 'baru') throw new Error('Request yang sudah ditanggapi tidak bisa ditarik.')

      await logActivity(tx, admin, {
        action: 'REQUEST_DELETE',
        entityType: 'REQUEST',
        entityName: `#${row.id} ${row.judul}`,
        details: { requestId: row.id },
      })
      await tx.delete(featureRequests).where(eq(featureRequests.id, data.id))
    })

    return { success: true }
  })

const respondSchema = z.object({
  id: z.number().int(),
  status: z.enum(featureRequestStatusEnum.enumValues),
  tanggapan: z.string().trim().max(2000, 'Tanggapan maksimal 2000 karakter.'),
})

export const respondFeatureRequest = createServerFn({ method: 'POST' })
  .inputValidator(respondSchema)
  .handler(async ({ data }) => {
    const admin = await requireDeveloper()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(featureRequests)
        .where(eq(featureRequests.id, data.id))
      if (!row) throw new Error('Request tidak ditemukan.')

      await tx
        .update(featureRequests)
        .set({
          status: data.status,
          tanggapan: data.tanggapan === '' ? null : data.tanggapan,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(featureRequests.id, data.id))
      await logActivity(tx, admin, {
        action: 'REQUEST_RESPOND',
        entityType: 'REQUEST',
        entityName: `#${row.id} ${row.judul}`,
        details: { requestId: row.id, statusDari: row.status, statusKe: data.status },
      })
    })

    return { success: true }
  })
