import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db'
import { activityLogs, adminProfiles } from '../db/schema'
import { logActivity } from './activity-log'

// Client tanpa cookie/persistensi: tidak membuat sesi di browser mana pun.
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

const requestSchema = z.object({ adminId: z.string().uuid() })

// Respons SELALU sama ({ success: true }) untuk admin tidak dikenal, kena
// batas, atau berhasil. Batas: 1 permintaan per admin per 5 menit dan 10 per
// jam untuk seluruh project (jatah email Supabase dipakai bersama signup).
// Aktor log = profil target dari adminId (belum terverifikasi), seperti LOGIN_FAILED.
export const requestPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    const profile = await db.query.adminProfiles.findFirst({
      where: eq(adminProfiles.id, data.adminId),
    })
    if (!profile || !profile.isApproved) return { success: true }

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        mine: sql<number>`(count(*) filter (where ${activityLogs.adminId} = ${profile.id} and ${activityLogs.createdAt} > now() - interval '5 minutes'))::int`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.action, 'RESET_PASSWORD_REQUEST'),
          sql`${activityLogs.createdAt} > now() - interval '1 hour'`,
        ),
      )
    if ((row?.total ?? 0) >= 10 || (row?.mine ?? 0) > 0) {
      return { success: true }
    }

    const client = createIsolatedClient()
    try {
      await db.transaction(async (tx) => {
        await logActivity(
          tx,
          { id: profile.id, nama: profile.nama },
          {
            action: 'RESET_PASSWORD_REQUEST',
            entityType: 'ADMIN',
            entityName: profile.nama,
            details: { terverifikasi: false },
          },
        )
        const { error } = await client.auth.resetPasswordForEmail(profile.email)
        if (error) throw error
      })
    } catch (e) {
      console.error('Gagal mengirim email reset password', e)
      throw new Error('Gagal mengirim email. Coba lagi beberapa saat lagi.')
    }

    return { success: true }
  })

const completeSchema = z.object({
  tokenHash: z.string().min(1, 'Tautan tidak valid.'),
  passwordBaru: z.string().min(8, 'Password baru minimal 8 karakter.'),
})

const INVALID_LINK =
  'Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.'

// Token ditukar di sini (saat submit), bukan saat halaman dibuka, supaya
// pemindai tautan email tidak menghanguskannya. Log ditulis DULU, baru
// updateUser (pola changeMyPassword). Sukses = semua sesi admin dicabut.
export const completePasswordReset = createServerFn({ method: 'POST' })
  .inputValidator(completeSchema)
  .handler(async ({ data }) => {
    const client = createIsolatedClient()

    const { data: verified, error: verifyError } = await client.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: 'recovery',
    })
    if (verifyError || !verified.user) throw new Error(INVALID_LINK)

    const profile = await db.query.adminProfiles.findFirst({
      where: eq(adminProfiles.id, verified.user.id),
    })
    if (!profile) {
      await client.auth.signOut({ scope: 'local' })
      throw new Error(INVALID_LINK)
    }

    try {
      await db.transaction(async (tx) => {
        await logActivity(
          tx,
          { id: profile.id, nama: profile.nama },
          {
            action: 'RESET_PASSWORD',
            entityType: 'ADMIN',
            entityName: profile.nama,
          },
        )
        const { error } = await client.auth.updateUser({
          password: data.passwordBaru,
        })
        if (error) throw error
      })
    } catch (e) {
      console.error('Gagal reset password', e)
      await client.auth.signOut({ scope: 'local' })
      if ((e as { code?: string }).code === 'same_password') {
        throw new Error('Password baru harus berbeda dari password lama.')
      }
      throw new Error('Gagal mengganti password. Coba minta tautan baru.')
    }

    const { error: signOutError } = await client.auth.signOut({
      scope: 'global',
    })
    if (signOutError) {
      console.error('Gagal mencabut sesi setelah reset password', signOutError)
    }

    return { success: true }
  })

// Hanya boolean, tanpa info akun. Lapisan UX supaya tautan yang sudah dipakai
// atau kedaluwarsa langsung ditolak di layar; penentu akhir tetap verifyOtp.
// Token dihapus Supabase setelah dipakai. Masa berlaku 1 jam = setelan
// "Email OTP Expiration" (expires_at kosong di project ini); created_at = UTC.
export const checkResetToken = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ tokenHash: z.string().min(1) }))
  .handler(async ({ data }) => {
    const res = await db.execute(
      sql`select 1 from auth.one_time_tokens
          where token_hash = ${data.tokenHash}
            and token_type = 'recovery_token'
            and created_at > (now() at time zone 'utc') - interval '1 hour'
          limit 1`,
    )
    return res.rows.length > 0
  })
