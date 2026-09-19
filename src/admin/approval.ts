import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, count } from 'drizzle-orm'
import { db } from '../db'
import { adminProfiles } from '../db/schema'
import { requireSuperadmin } from './guards'
import { logActivity } from './activity-log'
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
    const admin = await requireSuperadmin() // guard wajib baris pertama

    return db.transaction(async (tx) => {
      const updated = await tx
        .update(adminProfiles)
        .set({ isApproved: true })
        .where(eq(adminProfiles.id, data.adminId))
        .returning({ id: adminProfiles.id, nama: adminProfiles.nama })

      if (updated.length === 0) {
        throw new Error('Admin tidak ditemukan.')
      }

      // entity_id integer tidak muat uuid -> uuid target masuk details,
      // nama target masuk entity_name.
      await logActivity(tx, admin, {
        action: 'APPROVE_ADMIN',
        entityType: 'ADMIN',
        entityName: updated[0].nama,
        details: { targetAdminId: updated[0].id },
      })

      return { success: true }
    })
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
