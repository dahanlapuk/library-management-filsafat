import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { adminProfiles } from '../db/schema'
import { requireApprovedAdmin } from './guards'

export const markTutorialSeen = createServerFn({ method: 'POST' }).handler(async () => {
  const admin = await requireApprovedAdmin()
  await db
    .update(adminProfiles)
    .set({ tutorialSelesaiAt: new Date() })
    .where(eq(adminProfiles.id, admin.id))
  return { success: true }
})
