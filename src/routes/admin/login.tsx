import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminList, getCurrentAdmin, login } from '../../admin/auth'

export const Route = createFileRoute('/admin/login')({
  // Sudah login (sesi valid) → langsung ke dashboard.
  beforeLoad: async () => {
    const admin = await getCurrentAdmin()
    if (admin?.isApproved) throw redirect({ to: '/admin' })
  },
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const navigate = useNavigate()
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const {
    data: adminList = [],
    isPending: loadingAdmins,
    error: adminListError,
    refetch,
  } = useQuery({
    queryKey: ['admin-list'],
    queryFn: () => getAdminList(),
  })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAdminId) {
      setError('Pilih admin terlebih dahulu')
      return
    }
    if (!password) {
      setError('Password harus diisi')
      return
    }

    setError('')
    setLoading(true)
    try {
      await login({ data: { adminId: selectedAdminId, password } })
      navigate({ to: '/admin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-6">
          <h1 className="text-[2rem] font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-2">
            PUSTAKA FILSAFAT
          </h1>
          <p className="text-[var(--gray-600)]">
            Sistem Biblioteka Prodi Filsafat FIB UI
          </p>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          <h2 className="text-xl mb-5 text-center">Masuk sebagai Admin</h2>

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
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-medium">Pilih Admin:</label>
                <div className="flex flex-col gap-3 mb-1">
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
                        {admin.isSuperadmin && (
                          <span className="inline-block text-xs bg-[var(--black)] text-[var(--white)] px-2 py-0.5 font-medium w-fit">
                            Superadmin
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="font-medium">
                  Password:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="w-full p-3 pr-12 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-600)]"
                  >
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedAdminId || !password || loading}
                className="w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-5">
          <Link to="/" className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]">
            ← Kembali ke Katalog Publik
          </Link>
        </div>
      </div>
    </div>
  )
}
