import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  featureRequestAreaEnum,
  featureRequests,
  feedback,
  feedbackVotes,
} from '../db/schema'
import { requireApprovedAdmin, requireSuperadmin } from '../admin/guards'
import { logActivity } from '../admin/activity-log'

const VOTE_THRESHOLD = 2

const idSchema = z.object({ id: z.number().int() })

function entityName(row: { id: number; pesan: string }) {
  return `#${row.id} ${row.pesan.slice(0, 40)}`
}

export const listFeedback = createServerFn({ method: 'GET' }).handler(async () => {
  const admin = await requireApprovedAdmin()

  return db
    .select({
      id: feedback.id,
      jenis: feedback.jenis,
      pesan: feedback.pesan,
      kontak: feedback.kontak,
      bookId: feedback.bookId,
      bookJudulSnapshot: feedback.bookJudulSnapshot,
      status: feedback.status,
      requestId: feedback.requestId,
      handledAt: feedback.handledAt,
      createdAt: feedback.createdAt,
      voteCount: sql<number>`(select count(*)::int from feedback_votes v where v.feedback_id = feedback.id)`,
      sudahVote: sql<boolean>`exists (select 1 from feedback_votes v where v.feedback_id = feedback.id and v.admin_id = ${admin.id})`,
    })
    .from(feedback)
    .orderBy(desc(feedback.id))
})

export const toggleFeedbackVote = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(feedback)
        .where(eq(feedback.id, data.id))
        .for('update')
      if (!row) throw new Error('Feedback tidak ditemukan.')
      if (row.jenis !== 'saran') throw new Error('Vote hanya berlaku untuk saran.')
      if (row.status !== 'baru' && row.status !== 'perlu_perhatian') {
        throw new Error('Saran ini sudah diproses, vote ditutup.')
      }

      const [existing] = await tx
        .select()
        .from(feedbackVotes)
        .where(and(eq(feedbackVotes.feedbackId, row.id), eq(feedbackVotes.adminId, admin.id)))

      if (existing) {
        await tx
          .delete(feedbackVotes)
          .where(and(eq(feedbackVotes.feedbackId, row.id), eq(feedbackVotes.adminId, admin.id)))
      } else {
        await tx.insert(feedbackVotes).values({ feedbackId: row.id, adminId: admin.id })
      }

      const [{ n }] = await tx
        .select({ n: count() })
        .from(feedbackVotes)
        .where(eq(feedbackVotes.feedbackId, row.id))

      let status = row.status
      if (!existing && row.status === 'baru' && n >= VOTE_THRESHOLD) {
        status = 'perlu_perhatian'
        await tx
          .update(feedback)
          .set({ status, updatedAt: new Date() })
          .where(eq(feedback.id, row.id))
      }

      await logActivity(tx, admin, {
        action: 'FEEDBACK_VOTE',
        entityType: 'FEEDBACK',
        entityId: row.id,
        entityName: entityName(row),
        details: { vote: existing ? 'ditarik' : 'diberikan', total: n, statusKe: status },
      })

      return { voted: !existing, voteCount: n, status }
    })
  })

const statusSchema = z.object({
  id: z.number().int(),
  status: z.enum(['baru', 'selesai', 'ditolak']),
})

export const setFeedbackStatus = createServerFn({ method: 'POST' })
  .inputValidator(statusSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(feedback)
        .where(eq(feedback.id, data.id))
        .for('update')
      if (!row) throw new Error('Feedback tidak ditemukan.')
      if (row.status === 'diteruskan') {
        throw new Error('Saran ini sudah menjadi request fitur; tanggapannya lewat halaman Request Fitur.')
      }

      if (row.jenis === 'saran') {
        if (!admin.isSuperadmin) throw new Error('Hanya superadmin yang boleh memutuskan saran.')
        if (data.status === 'baru') throw new Error('Status saran tidak bisa dikembalikan ke baru.')
      } else if (data.status === 'ditolak') {
        throw new Error('Koreksi data dan usul buku hanya bisa ditandai selesai.')
      }

      const buka = data.status === 'baru'
      await tx
        .update(feedback)
        .set({
          status: data.status,
          handledBy: buka ? null : admin.id,
          handledAt: buka ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(feedback.id, row.id))

      await logActivity(tx, admin, {
        action: 'FEEDBACK_STATUS',
        entityType: 'FEEDBACK',
        entityId: row.id,
        entityName: entityName(row),
        details: { statusDari: row.status, statusKe: data.status },
      })
    })

    return { success: true }
  })

const promoteSchema = z.object({
  id: z.number().int(),
  judul: z.string().trim().min(3, 'Judul minimal 3 karakter.').max(120, 'Judul maksimal 120 karakter.'),
  area: z.enum(featureRequestAreaEnum.enumValues),
})

export const promoteFeedback = createServerFn({ method: 'POST' })
  .inputValidator(promoteSchema)
  .handler(async ({ data }) => {
    const admin = await requireSuperadmin()

    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(feedback)
        .where(eq(feedback.id, data.id))
        .for('update')
      if (!row) throw new Error('Feedback tidak ditemukan.')
      if (row.jenis !== 'saran') throw new Error('Hanya saran yang bisa diteruskan menjadi request.')
      if (row.status !== 'baru' && row.status !== 'perlu_perhatian') {
        throw new Error('Saran ini sudah diproses.')
      }

      const [req] = await tx
        .insert(featureRequests)
        .values({
          judul: data.judul,
          deskripsi: `${row.pesan}\n\n(Berasal dari feedback publik #${row.id})`,
          area: data.area,
          pengirimNama: admin.nama,
          createdBy: admin.id,
        })
        .returning({ id: featureRequests.id })

      await tx
        .update(feedback)
        .set({
          requestId: req.id,
          status: 'diteruskan',
          handledBy: admin.id,
          handledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(feedback.id, row.id))

      await logActivity(tx, admin, {
        action: 'FEEDBACK_PROMOTE',
        entityType: 'FEEDBACK',
        entityId: row.id,
        entityName: entityName(row),
        details: { requestId: req.id },
      })

      return { requestId: req.id }
    })
  })
