import { config } from 'dotenv'
config()

import { createClient } from '@supabase/supabase-js'

async function main() {
  const [, , email, password, nama] = process.argv

  if (!email || !password || !nama) {
    console.error(
      'Usage: tsx scripts/seed-superadmin.ts <email> <password> <"Nama Lengkap">',
    )
    process.exit(1)
  }

  const { db } = await import('../src/db/index.ts')
  const { adminProfiles } = await import('../src/db/schema.ts')

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  console.log('Membuat user di Supabase Auth...')
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    console.error('Gagal membuat auth user:', error?.message)
    process.exit(1)
  }

  console.log('Auth user dibuat, id:', data.user.id)

  console.log('Insert ke admin_profiles...')
  await db.insert(adminProfiles).values({
    id: data.user.id,
    nama,
    email,
    role: 'superadmin',
    isSuperadmin: true,
    isApproved: true,
  })

  console.log('Superadmin berhasil dibuat:', email)
  process.exit(0)
}

main()
