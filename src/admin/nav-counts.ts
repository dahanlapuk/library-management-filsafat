import { createServerFn } from '@tanstack/react-start'
import { count, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import {
  adminProfiles,
  categoryRequests,
  deleteRequests,
  featureRequests,
  feedback,
  loanRequests,
} from '../db/schema'
import { requireApprovedAdmin } from './guards'

const one = async (q: PromiseLike<{ n: number }[]>) => (await q)[0]?.n ?? 0

export const getNavCounts = createServerFn({ method: 'GET' }).handler(async () => {
  const me = await requireApprovedAdmin()
  const out: Record<string, number> = {}

  const [pinjam, fb] = await Promise.all([
    one(db.select({ n: count() }).from(loanRequests).where(eq(loanRequests.status, 'pending'))),
    one(
      db
        .select({ n: count() })
        .from(feedback)
        .where(inArray(feedback.status, ['baru', 'perlu_perhatian'])),
    ),
  ])
  out['/admin/loans/requests'] = pinjam
  out['/admin/feedback'] = fb

  if (me.isSuperadmin) {
    const [hapus, kategori, admin] = await Promise.all([
      one(db.select({ n: count() }).from(deleteRequests).where(eq(deleteRequests.status, 'pending'))),
      one(
        db.select({ n: count() }).from(categoryRequests).where(eq(categoryRequests.status, 'pending')),
      ),
      one(db.select({ n: count() }).from(adminProfiles).where(eq(adminProfiles.isApproved, false))),
    ])
    out['/admin/books/delete-requests'] = hapus
    out['/admin/books/category-requests'] = kategori
    out['/admin/approvals'] = admin
  }

  if (me.isDeveloper) {
    out['/admin/requests'] = await one(
      db.select({ n: count() }).from(featureRequests).where(eq(featureRequests.status, 'baru')),
    )
  }

  return out
})
