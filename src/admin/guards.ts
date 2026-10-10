import { getCurrentAdmin } from './auth'

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
