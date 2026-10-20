import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { checkResetToken, completePasswordReset } from '../../admin/password-reset'
import { Button, buttonClass } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { AuthError, AuthShell, AuthTitle, authLink } from '../../components/ui/AuthShell'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token_hash: typeof search.token_hash === 'string' ? search.token_hash : '',
  }),
  loaderDeps: ({ search }) => ({ tokenHash: search.token_hash }),
  loader: async ({ deps }) => ({
    tokenValid: deps.tokenHash
      ? await checkResetToken({ data: { tokenHash: deps.tokenHash } })
      : false,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token_hash: tokenHash } = Route.useSearch()
  const { tokenValid } = Route.useLoaderData()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    setLoading(true)
    try {
      await completePasswordReset({ data: { tokenHash, passwordBaru: password } })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengganti password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell subtitle="Buat Password Baru">
      {done ? (
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Password Berhasil Diganti
          </h2>
          <p className="text-sm text-[var(--muted)]">Silakan masuk dengan password baru.</p>
          <Link to="/admin/login" className={`${buttonClass('accent')} w-full justify-center`}>
            Ke halaman login
          </Link>
        </div>
      ) : !tokenValid ? (
        <div className="flex flex-col gap-3 text-center">
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
            Tautan Tidak Valid
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Tautan ini tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa
            password.
          </p>
          <Link to="/admin/forgot-password" className={authLink}>
            Minta tautan baru
          </Link>
        </div>
      ) : (
        <>
          <AuthTitle>Password Baru</AuthTitle>

          {error && (
            <AuthError>
              {error}{' '}
              <Link to="/admin/forgot-password" className="underline">
                Minta tautan baru
              </Link>
            </AuthError>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password baru
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
              <p className="text-xs text-[var(--muted)]">Minimal 8 karakter.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Konfirmasi password
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full"
              />
            </div>

            <Button type="submit" variant="accent" disabled={loading} className="w-full">
              {loading ? 'Memproses...' : 'Simpan Password'}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
