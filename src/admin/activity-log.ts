import type { PgTransaction } from 'drizzle-orm/pg-core'
import { activityLogs } from '../db/schema'

type Tx = PgTransaction<any, any, any>

// Aktor HARUS berasal dari hasil requireApprovedAdmin()/requireSuperadmin(),
// bukan dari request body (temuan utama audit V1).
export type ActivityActor = { id: string; nama: string }

export type ActivityEntry = {
  action: string
  entityType: string
  entityId?: number | null
  entityName?: string | null
  details?: Record<string, unknown>
}

// Sengaja WAJIB menerima `tx` (tanpa default db): log selalu ditulis di
// transaksi yang sama dengan aksinya, jadi kalau log gagal, aksinya ikut batal.
// admin_id = acuan, admin_nama = salinan nama saat kejadian.
export async function logActivity(
  tx: Tx,
  actor: ActivityActor,
  entry: ActivityEntry,
) {
  await tx.insert(activityLogs).values({
    adminId: actor.id,
    adminNama: actor.nama,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    entityName: entry.entityName ?? null,
    details: entry.details ?? null,
  })
}
