import type { PgTransaction } from 'drizzle-orm/pg-core'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq, sql } from 'drizzle-orm'
import { activityLogs } from '../db/schema'
import { db } from '../db'
import { requireSuperadmin } from './guards'

type Tx = PgTransaction<any, any, any>

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

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

const PAGE_SIZE = 30

const listActivityLogsSchema = z.object({
  page: z.number().int().min(1).default(1),
  action: z.string().optional(),
})

// Superadmin-only: satu-satunya cara baca log lewat UI selain Supabase SQL
// Editor. Read-only, tidak butuh transaksi.
export const getActivityLogs = createServerFn({ method: 'GET' })
  .inputValidator(listActivityLogsSchema)
  .handler(async ({ data }) => {
    await requireSuperadmin()

    const page = data.page
    const offset = (page - 1) * PAGE_SIZE
    const condition = data.action ? eq(activityLogs.action, data.action) : sql`true`

    const [items, totalRow, actionRows] = await Promise.all([
      db
        .select()
        .from(activityLogs)
        .where(condition)
        .orderBy(desc(activityLogs.createdAt))
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLogs)
        .where(condition),
      db
        .selectDistinct({ action: activityLogs.action })
        .from(activityLogs)
        .orderBy(activityLogs.action),
    ])

    // details (jsonb) di-infer Drizzle sebagai `unknown`; validator
    // serialisasi createServerFn butuh tipe yang bisa dibuktikan JSON-safe
    // secara rekursif, bukan cuma Record<string, unknown> (yang value-nya
    // masih `unknown`).
    const mappedItems = items.map((item) => ({
      ...item,
      details: item.details as JsonValue | null,
    }))

    return {
      items: mappedItems,
      total: totalRow[0]?.count ?? 0,
      pageSize: PAGE_SIZE,
      actions: actionRows.map((r) => r.action),
    }
  })
