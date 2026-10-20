import { createFileRoute, useNavigate, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAdminList, getCurrentAdmin, login } from '../../admin/auth'
import { PeranBadge } from '../../admin/PeranBadge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import {
  AdminRadioList,
  AuthError,
  AuthShell,
  AuthTitle,
  authLink,
} from '../../components/ui/AuthShell'

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
    <AuthShell
      subtitle="Sistem Pengelolaan Katalog dan Peminjaman"
      footer={
        <Link to="/" className={authLink}>
          ← Kembali ke Katalog Publik
        </Link>
      }
    >
      <AuthTitle>Masuk sebagai Admin</AuthTitle>

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
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Pilih admin</span>
            <AdminRadioList
              admins={adminList}
              selectedId={selectedAdminId}
              onSelect={setSelectedAdminId}
              renderBadge={(admin) => <PeranBadge admin={admin} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="w-full pr-24"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="accent"
            disabled={!selectedAdminId || !password || loading}
            className="w-full"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>

          <div className="text-center">
            <Link to="/admin/forgot-password" className={authLink}>
              Lupa password?
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
