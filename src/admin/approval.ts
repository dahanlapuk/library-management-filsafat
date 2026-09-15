import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, count } from 'drizzle-orm'
import { db } from '../db'
import { adminProfiles } from '../db/schema'
import { requireSuperadmin } from './guards'
import { getCurrentAdmin } from './auth'

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

export const getAdminStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const admin = await getCurrentAdmin()
    if (!admin) {
      throw new Error('Unauthorized: harus login.')
    }

    const [{ totalApprovedAdmins }] = await db
      .select({ totalApprovedAdmins: count() })
      .from(adminProfiles)
      .where(eq(adminProfiles.isApproved, true))

    // Jumlah pending cuma relevan (dan cuma ditampilkan) buat superadmin --
    // admin biasa nggak perlu tahu ini, konsisten sama getAdminList yang
    // juga cuma expose data secukupnya.
    let pendingCount: number | null = null
    if (admin.isSuperadmin) {
      const [{ pending }] = await db
        .select({ pending: count() })
        .from(adminProfiles)
        .where(eq(adminProfiles.isApproved, false))
      pendingCount = pending
    }

    return { totalApprovedAdmins, pendingCount }
  },
)
