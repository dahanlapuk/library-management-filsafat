import { getCurrentAdmin } from './auth'

/**
 * Panggil ini di baris PERTAMA handler server function yang butuh
 * proteksi "superadmin only" (mis. approve admin baru, hapus admin,
 * ubah role admin lain). Melempar error kalau bukan superadmin —
 * pemanggil TIDAK boleh menangkap error ini untuk melanjutkan alur.
 *
 * Pola ini sengaja dipusatkan di satu tempat supaya semua endpoint
 * yang butuh proteksi superadmin bisa dicek konsisten (tinggal grep
 * "requireSuperadmin"), bukan tiap handler nulis if-check sendiri.
 */
export async function requireSuperadmin() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error('Unauthorized: harus login.')
  }

  if (!admin.isSuperadmin) {
    throw new Error('Unauthorized: hanya superadmin yang boleh melakukan ini.')
  }

  return admin
}

/**
 * Panggil ini untuk aksi yang cukup butuh "admin biasa yang sudah
 * di-approve" (mis. tambah buku, catat peminjaman) — tidak perlu
 * superadmin, tapi tetap harus login DAN approved.
 */
export async function requireApprovedAdmin() {
  const admin = await getCurrentAdmin()

  if (!admin) {
    throw new Error('Unauthorized: harus login.')
  }

  if (!admin.isApproved) {
    throw new Error('Unauthorized: akun belum di-approve superadmin.')
  }

  return admin
}
