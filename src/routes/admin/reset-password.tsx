import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  checkResetToken,
  completePasswordReset,
} from '../../admin/password-reset'
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-5">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-6">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-[0.05em] text-[var(--text-primary)] mb-2">
            BIBLIOTEKA FILSAFAT UI
          </h1>
          <p className="text-[var(--gray-600)]">Buat Password Baru</p>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          {done ? (
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Password Berhasil Diganti</h2>
              <p className="text-[var(--gray-600)]">
                Silakan masuk dengan password baru.
              </p>
              <Link
                to="/admin/login"
                className="block w-full p-4 text-center bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide mt-2"
              >
                Ke halaman login
              </Link>
            </div>
          ) : !tokenValid ? (
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Tautan Tidak Valid</h2>
              <p className="text-[var(--gray-600)]">
                Tautan ini tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa password.
              </p>
              <Link to="/admin/forgot-password" className="text-sm underline text-[var(--text-primary)] mt-2">Minta tautan baru</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl mb-5 text-center">Password Baru</h2>

              {error && (
                <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
                  {error}{' '}
                  <Link to="/admin/forgot-password" className="underline">
                    Minta tautan baru
                  </Link>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="font-medium">
                    Password Baru:
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
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

                <div className="flex flex-col gap-2">
                  <label htmlFor="confirmPassword" className="font-medium">
                    Konfirmasi Password:
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Simpan Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
