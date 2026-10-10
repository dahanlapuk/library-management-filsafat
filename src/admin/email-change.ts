import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db'
import { activityLogs, adminProfiles } from '../db/schema'
import { getSupabaseServerClient } from '../lib/supabase/server'
import { requireApprovedAdmin } from './guards'
import { logActivity } from './activity-log'

function createIsolatedClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}

const requestSchema = z.object({
  emailBaru: z.string().trim().toLowerCase().email('Format email tidak valid.'),
  password: z.string().min(1, 'Password wajib diisi.'),
})

export const requestEmailChange = createServerFn({ method: 'POST' })
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    if (data.emailBaru === admin.email.toLowerCase()) {
      throw new Error('Email baru sama dengan email saat ini.')
    }

    const dipakai = await db.query.adminProfiles.findFirst({
      where: sql`lower(${adminProfiles.email}) = ${data.emailBaru}`,
    })
    if (dipakai) throw new Error('Email sudah dipakai akun lain.')

    const [recent] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.adminId, admin.id),
          eq(activityLogs.action, 'EMAIL_CHANGE_REQUEST'),
          sql`${activityLogs.createdAt} > now() - interval '5 minutes'`,
        ),
      )
    if ((recent?.n ?? 0) > 0) {
      throw new Error('Tunggu beberapa menit sebelum mengajukan lagi.')
    }

    const verifier = createIsolatedClient()
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: admin.email,
      password: data.password,
    })
    try {
      await verifier.auth.signOut({ scope: 'local' })
    } catch {
      // sesi sementara tidak pernah dipakai
    }
    if (verifyError) throw new Error('Password salah.')

    const supabase = getSupabaseServerClient()
    await db.transaction(async (tx) => {
      await logActivity(tx, admin, {
        action: 'EMAIL_CHANGE_REQUEST',
        entityType: 'ADMIN',
        entityName: admin.nama,
        details: { emailBaru: data.emailBaru },
      })
      const { error } = await supabase.auth.updateUser({ email: data.emailBaru })
      if (error) throw new Error(error.message)
    })

    return { success: true }
  })

const completeSchema = z.object({
  tokenHash: z.string().min(1, 'Tautan tidak valid.'),
})

export const completeEmailChange = createServerFn({ method: 'POST' })
  .inputValidator(completeSchema)
  .handler(async ({ data }) => {
    const client = createIsolatedClient()
    const { data: result, error } = await client.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: 'email_change',
    })
    const user = result?.user
    if (error || !user?.email) {
      throw new Error('Tautan tidak valid atau sudah kedaluwarsa.')
    }
    const emailBaru = user.email.toLowerCase()

    const profile = await db.query.adminProfiles.findFirst({
      where: eq(adminProfiles.id, user.id),
    })
    if (!profile) throw new Error('Profil admin tidak ditemukan.')

    await db.transaction(async (tx) => {
      await tx
        .update(adminProfiles)
        .set({ email: emailBaru })
        .where(eq(adminProfiles.id, profile.id))
      await logActivity(
        tx,
        { id: profile.id, nama: profile.nama },
        {
          action: 'EMAIL_CHANGE',
          entityType: 'ADMIN',
          entityName: profile.nama,
          details: { emailDari: profile.email, emailKe: emailBaru },
        },
      )
    })

    try {
      await client.auth.signOut({ scope: 'global' })
    } catch {
      // email sudah berganti; pencabutan sesi hanya pengaman tambahan
    }

    return { success: true }
  })
