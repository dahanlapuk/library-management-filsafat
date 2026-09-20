import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { getSupabaseServerClient } from '../lib/supabase/server'
import { db } from '../db'
import { activityLogs, adminProfiles } from '../db/schema'
import { logActivity } from './activity-log'

// Dipanggil dari halaman login untuk menampilkan daftar admin yang bisa dipilih.
// Sengaja TIDAK mengembalikan email/password — hanya info yang aman ditampilkan publik.
export const getAdminList = createServerFn({ method: 'GET' }).handler(
  async () => {
    const admins = await db.query.adminProfiles.findMany({
      where: eq(adminProfiles.isApproved, true),
      columns: {
        id: true,
        nama: true,
        title: true,
        isSuperadmin: true,
      },
    })
    return admins
  },
)

// Aktor LOGIN_FAILED = profil target dari adminId (BELUM terverifikasi, ditandai
// di details). Maks. 3 baris per admin per menit supaya tidak bisa dipakai
// membanjiri tabel. Sengaja menelan error: kegagalan log tidak boleh menutupi
// pesan "Password salah" (pengecualian dari konvensi "log gagal = aksi batal").
async function logLoginFailed(
  profile: { id: string; nama: string },
  kode: string | null,
) {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.adminId, profile.id),
          eq(activityLogs.action, 'LOGIN_FAILED'),
          sql`${activityLogs.createdAt} > now() - interval '1 minute'`,
        ),
      )
    if ((row?.n ?? 0) >= 3) return

    await db.transaction(async (tx) => {
      await logActivity(tx, profile, {
        action: 'LOGIN_FAILED',
        entityType: 'ADMIN',
        entityName: profile.nama,
        details: { terverifikasi: false, kode },
      })
    })
  } catch (e) {
    console.error('Gagal mencatat LOGIN_FAILED', e)
  }
}

const loginSchema = z.object({
  adminId: z.string().uuid(),
  password: z.string().min(1),
})

export const login = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    const profile = await db.query.adminProfiles.findFirst({
      where: eq(adminProfiles.id, data.adminId),
    })

    if (!profile || !profile.isApproved) {
      throw new Error('Admin tidak ditemukan atau belum di-approve.')
    }

    const supabase = getSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    })

    if (error || !authData.user) {
      await logLoginFailed(
        { id: profile.id, nama: profile.nama },
        error?.code ?? null,
      )
      throw new Error('Password salah.')
    }

    // Konvensi berlaku: kalau log LOGIN gagal ditulis, login dibatalkan.
    try {
      await db.transaction(async (tx) => {
        await logActivity(
          tx,
          { id: profile.id, nama: profile.nama },
          { action: 'LOGIN', entityType: 'ADMIN', entityName: profile.nama },
        )
      })
    } catch (e) {
      console.error('Gagal mencatat LOGIN', e)
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('Login gagal dicatat. Coba lagi.')
    }

    return { profile }
  })

// Logout HARUS selalu berhasil: kalau log gagal, error cuma dicatat (pengecualian
// dari konvensi "log gagal = aksi batal"). scope 'local' = hanya sesi ini,
// bukan semua perangkat admin itu (default 'global').
export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const admin = await getCurrentAdmin()
  if (admin) {
    try {
      await db.transaction(async (tx) => {
        await logActivity(
          tx,
          { id: admin.id, nama: admin.nama },
          { action: 'LOGOUT', entityType: 'ADMIN', entityName: admin.nama },
        )
      })
    } catch (e) {
      console.error('Gagal mencatat LOGOUT', e)
    }
  }
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  return { success: true }
})

// Batas umur sesi admin, dihitung dari waktu LOGIN (auth.sessions.created_at),
// bukan dari aktivitas terakhir. Paket Supabase gratis tidak punya setelan
// time-box sesi, jadi ditegakkan di sini.
const ADMIN_SESSION_MAX_MS = 8 * 60 * 60 * 1000

// Sesi valid = barisnya masih ada di auth.sessions (belum di-revoke) DAN
// dibuat kurang dari 8 jam lalu.
async function isSessionWithinLimit(sessionId: string) {
  const res = await db.execute(
    sql`select created_at from auth.sessions where id = ${sessionId}::uuid`,
  )
  const row = res.rows[0] as { created_at: Date } | undefined
  if (!row) return false
  return Date.now() - new Date(row.created_at).getTime() < ADMIN_SESSION_MAX_MS
}

export const getCurrentAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) {
      return null
    }

    const sessionId = data.claims.session_id
    if (!sessionId || !(await isSessionWithinLimit(sessionId))) {
      await supabase.auth.signOut({ scope: 'local' })
      return null
    }

    const profile = await db.query.adminProfiles.findFirst({
      where: eq(adminProfiles.id, data.claims.sub),
    })

    return profile ?? null
  },
)

const signupSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
})

// Signup terbuka untuk siapa saja, tapi hasilnya PENDING (isApproved: false)
// sampai superadmin approve lewat approveAdmin(). Admin baru TIDAK otomatis
// login setelah signup — sesi dipaksa sign-out di akhir, supaya "belum
// di-approve" beneran berarti "belum bisa masuk", bukan cuma status di DB.
export const signupAdmin = createServerFn({ method: 'POST' })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (error || !authData.user) {
      throw new Error(error?.message ?? 'Gagal membuat akun.')
    }

    const newUserId = authData.user.id
    try {
      await db.transaction(async (tx) => {
        await tx.insert(adminProfiles).values({
          id: newUserId,
          nama: data.nama,
          email: data.email,
          isSuperadmin: false,
          isApproved: false,
        })
        await logActivity(
          tx,
          { id: newUserId, nama: data.nama },
          {
            action: 'SIGNUP_ADMIN',
            entityType: 'ADMIN',
            entityName: data.nama,
            details: { menungguApproval: true },
          },
        )
      })
    } finally {
      // Paksa sign-out apa pun hasil signUp di atas (kalau Supabase project
      // ini nggak wajibkan email confirmation, signUp bisa balikin sesi
      // aktif otomatis — kita nggak mau admin yang belum approved kepakai).
      await supabase.auth.signOut()
    }

    return { success: true }
  })
