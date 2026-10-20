import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { signupAdmin } from '../../admin/auth'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { AuthError, AuthShell, AuthTitle, authLink } from '../../components/ui/AuthShell'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/signup')({
  component: AdminSignupPage,
})

function AdminSignupPage() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setLoading(true)
    try {
      await signupAdmin({ data: { nama, email, password } })
      setSubmitted(true)
    } catch (err) {
      setError(errorMessage(err, 'Signup gagal.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      subtitle="Daftar Akun Admin Baru"
      footer={
        <Link to="/admin/login" className={authLink}>
          Sudah punya akun? Masuk
        </Link>
      }
    >
      {submitted ? (
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Pendaftaran Terkirim
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Cek email kamu untuk konfirmasi akun. Setelah dikonfirmasi, akun kamu masih perlu
            di-approve oleh superadmin sebelum bisa dipakai login.
          </p>
          <Link to="/admin/login" className={authLink}>
            Kembali ke halaman login
          </Link>
        </div>
      ) : (
        <>
          <AuthTitle>Daftar sebagai Admin</AuthTitle>

          {error && <AuthError>{error}</AuthError>}

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nama" className="text-sm font-medium">
                Nama lengkap
              </label>
              <Input
                id="nama"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full"
              />
              <p className="text-xs text-[var(--muted)]">Minimal 8 karakter.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Konfirmasi password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full"
              />
            </div>

            <Button type="submit" variant="accent" disabled={loading} className="w-full">
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
