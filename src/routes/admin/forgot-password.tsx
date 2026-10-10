import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminList } from '../../admin/auth'
import { requestPasswordReset } from '../../admin/password-reset'
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-6">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-2">
            BIBLIOTEKA DEPARTEMEN FILSAFAT UI
          </h1>
          <p className="text-[var(--gray-600)]">Lupa Password Admin</p>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          {sent ? (
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Permintaan Terkirim</h2>
              <p className="text-[var(--gray-600)]">
                Jika akun valid, tautan untuk membuat password baru sudah
                dikirim ke email yang terdaftar pada akun tersebut. Cek kotak
                masuk dan folder spam. Tautan hanya berlaku sebentar. Kalau
                belum masuk, tunggu beberapa menit sebelum meminta lagi.
              </p>
              <Link
                to="/admin/login"
                className="text-sm underline text-[var(--text-primary)] mt-2"
              >
                Kembali ke halaman login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl mb-2 text-center">Atur Ulang Password</h2>
              <p className="text-sm text-[var(--gray-600)] mb-5 text-center">
                Pilih akun kamu. Tautan untuk membuat password baru akan
                dikirim ke email yang terdaftar pada akun itu.
              </p>

              {error && (
                <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
                  {error}
                </div>
              )}

              {adminListError && (
                <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
                  Gagal memuat daftar admin.{' '}
                  <button type="button" onClick={() => refetch()} className="underline">
                    Coba lagi
                  </button>
                </div>
              )}

              {loadingAdmins ? (
                <p className="text-center py-4">Memuat...</p>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {adminList.map((admin) => (
                      <label
                        key={admin.id}
                        className={`flex items-center gap-3 p-4 border-2 cursor-pointer transition-colors ${
                          selectedAdminId === admin.id
                            ? 'border-[var(--black)] bg-[var(--gray-100)]'
                            : 'border-[var(--gray-200)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="admin"
                          value={admin.id}
                          checked={selectedAdminId === admin.id}
                          onChange={() => setSelectedAdminId(admin.id)}
                          className="w-5 h-5 accent-[var(--black)]"
                        />
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {admin.nama}
                          </span>
                          {admin.title && (
                            <span className="text-sm text-[var(--gray-600)]">
                              {admin.title}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedAdminId || loading}
                    className="w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide disabled:opacity-50"
                  >
                    {loading ? 'Memproses...' : 'Kirim Tautan Reset'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-5">
          <Link
            to="/admin/login"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            ← Kembali ke login
          </Link>
        </div>
      </div>
    </div>
  )
}
