import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db'
import { adminProfiles } from '../db/schema'
import { getSupabaseServerClient } from '../lib/supabase/server'
import { requireApprovedAdmin } from './guards'
import { logActivity } from './activity-log'

const updateProfileSchema = z.object({
  nama: z.string(),
  noWhatsapp: z.string(),
})

// Id admin SELALU dari sesi (requireApprovedAdmin), bukan dari request:
// menutup bug IDOR V1 (UpdateProfile menerima :id dari client).
export const updateMyProfile = createServerFn({ method: 'POST' })
  .inputValidator(updateProfileSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    const nama = data.nama.trim()
    if (!nama) throw new Error('Nama wajib diisi.')
    if (nama.length > 100) throw new Error('Nama maksimal 100 karakter.')

    const wa = data.noWhatsapp.replace(/[\s-]/g, '')
    if (wa && !/^\+?\d{8,15}$/.test(wa)) {
      throw new Error(
        'Nomor WhatsApp tidak valid (hanya angka, boleh diawali +, 8-15 digit).',
      )
    }
    const noWhatsapp = wa === '' ? null : wa

    const fields: string[] = []
    if (nama !== admin.nama) fields.push('nama')
    if (noWhatsapp !== (admin.noWhatsapp ?? null)) fields.push('noWhatsapp')
    if (fields.length === 0) return { success: true, changed: false }

    await db.transaction(async (tx) => {
      await tx
        .update(adminProfiles)
        .set({ nama, noWhatsapp })
        .where(eq(adminProfiles.id, admin.id))

      // Nomor WhatsApp sengaja TIDAK dicatat nilainya, hanya bahwa field itu berubah.
      await logActivity(tx, admin, {
        action: 'UPDATE_PROFILE',
        entityType: 'ADMIN',
        entityName: nama,
        details: {
          fields,
          ...(fields.includes('nama') ? { namaDari: admin.nama, namaKe: nama } : {}),
        },
      })
    })

    return { success: true, changed: true }
  })

const changePasswordSchema = z.object({
  passwordLama: z.string().min(1, 'Password lama wajib diisi.'),
  passwordBaru: z.string().min(8, 'Password baru minimal 8 karakter.'),
})

export const changeMyPassword = createServerFn({ method: 'POST' })
  .inputValidator(changePasswordSchema)
  .handler(async ({ data }) => {
    const admin = await requireApprovedAdmin()

    if (data.passwordBaru === data.passwordLama) {
      throw new Error('Password baru harus berbeda dari password lama.')
    }

    // Verifikasi password lama lewat client TERPISAH tanpa cookie/persistensi.
    // Kalau pakai client server biasa, signInWithPassword membuat sesi baru
    // dan mereset batas 8 jam. Sesi sementara ini langsung dimatikan lagi.
    const verifier = createClient(
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
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: admin.email,
      password: data.passwordLama,
    })
    try {
      await verifier.auth.signOut({ scope: 'local' })
    } catch {
      // abaikan: sesi sementara ini tidak pernah dipakai
    }
    if (verifyError) throw new Error('Password lama salah.')

    // Log ditulis DULU, baru updateUser (panggilan eksternal, tidak bisa
    // di-rollback). Kalau updateUser gagal, transaksi dibatalkan dan log ikut batal.
    const supabase = getSupabaseServerClient()
    await db.transaction(async (tx) => {
      await logActivity(tx, admin, {
        action: 'CHANGE_PASSWORD',
        entityType: 'ADMIN',
        entityName: admin.nama,
      })
      const { error } = await supabase.auth.updateUser({
        password: data.passwordBaru,
      })
      if (error) throw new Error(error.message)
    })

    return { success: true }
  })
