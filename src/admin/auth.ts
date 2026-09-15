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
