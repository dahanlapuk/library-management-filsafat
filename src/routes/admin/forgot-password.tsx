import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminList } from '../../admin/auth'
import { requestPasswordReset } from '../../admin/password-reset'
import { Button } from '../../components/ui/Button'
import {
  AdminRadioList,
  AuthError,
  AuthShell,
  AuthTitle,
  authLink,
} from '../../components/ui/AuthShell'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    data: adminList = [],
    isPending: loadingAdmins,
    error: adminListError,
    refetch,
  } = useQuery({
    queryKey: ['admin-list'],
    queryFn: () => getAdminList(),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAdminId) {
      setError('Pilih akun terlebih dahulu.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset({ data: { adminId: selectedAdminId } })
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengirim email.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      subtitle="Lupa Password Admin"
      footer={
        <Link to="/admin/login" className={authLink}>
          ← Kembali ke login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Permintaan Terkirim
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Jika akun valid, tautan untuk membuat password baru sudah dikirim ke email yang
            terdaftar pada akun tersebut. Cek kotak masuk dan folder spam. Tautan hanya berlaku
            sebentar. Kalau belum masuk, tunggu beberapa menit sebelum meminta lagi.
          </p>
          <Link to="/admin/login" className={authLink}>
            Kembali ke halaman login
          </Link>
        </div>
      ) : (
        <>
          <AuthTitle hint="Pilih akun kamu. Tautan untuk membuat password baru akan dikirim ke email yang terdaftar pada akun itu.">
            Atur Ulang Password
          </AuthTitle>

          {error && <AuthError>{error}</AuthError>}

          {adminListError && (
            <AuthError>
              Gagal memuat daftar admin.{' '}
              <button type="button" onClick={() => refetch()} className="underline">
                Coba lagi
              </button>
            </AuthError>
          )}

          {loadingAdmins ? (
            <p className="py-4 text-center text-sm text-[var(--muted)]">Memuat...</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AdminRadioList
                admins={adminList}
                selectedId={selectedAdminId}
                onSelect={setSelectedAdminId}
              />
              <Button
                type="submit"
                variant="accent"
                disabled={!selectedAdminId || loading}
                className="w-full"
              >
                {loading ? 'Memproses...' : 'Kirim Tautan Reset'}
              </Button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  )
}
