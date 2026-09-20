import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { getSupabaseServerClient } from '../lib/supabase/server'
import { db } from '../db'
import { adminProfiles } from '../db/schema'

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
      throw new Error('Password salah.')
    }

    return { profile }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  await supabase.auth.signOut()
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

    try {
      await db.insert(adminProfiles).values({
        id: authData.user.id,
        nama: data.nama,
        email: data.email,
        isSuperadmin: false,
        isApproved: false,
      })
    } finally {
      // Paksa sign-out apa pun hasil signUp di atas (kalau Supabase project
      // ini nggak wajibkan email confirmation, signUp bisa balikin sesi
      // aktif otomatis — kita nggak mau admin yang belum approved kepakai).
      await supabase.auth.signOut()
    }

    return { success: true }
  })
