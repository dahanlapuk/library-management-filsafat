import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { adminProfiles } from '../db/schema'
import { requireSuperadmin } from './guards'

export const getPendingAdmins = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSuperadmin() // hanya superadmin boleh lihat daftar pending

    return db.query.adminProfiles.findMany({
      where: eq(adminProfiles.isApproved, false),
      columns: {
        id: true,
        nama: true,
        email: true,
        title: true,
        createdAt: true,
      },
    })
  },
)

const approveAdminSchema = z.object({
  adminId: z.string().uuid(),
})

export const approveAdmin = createServerFn({ method: 'POST' })
  .inputValidator(approveAdminSchema)
  .handler(async ({ data }) => {
    await requireSuperadmin() // guard wajib baris pertama

    await db
      .update(adminProfiles)
      .set({ isApproved: true })
      .where(eq(adminProfiles.id, data.adminId))

    return { success: true }
  })
