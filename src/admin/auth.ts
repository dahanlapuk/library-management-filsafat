import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
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

export const getCurrentAdmin = createServerFn({ method: 'GET' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) {
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
