import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { signupAdmin } from '../../admin/auth'

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
      setError(err instanceof Error ? err.message : 'Signup gagal.')
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
          <p className="text-[var(--gray-600)]">Daftar Akun Admin Baru</p>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6">
          {submitted ? (
            <div className="text-center flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Pendaftaran Terkirim</h2>
              <p className="text-[var(--gray-600)]">
                Cek email kamu untuk konfirmasi akun. Setelah dikonfirmasi,
                akun kamu masih perlu di-approve oleh superadmin sebelum bisa
                dipakai login.
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
              <h2 className="text-xl mb-5 text-center">Daftar sebagai Admin</h2>

              {error && (
                <div className="p-3 mb-4 bg-[#fee] border border-[#fcc] text-[#c00]">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="nama" className="font-medium">
                    Nama Lengkap:
                  </label>
                  <input
                    id="nama"
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-medium">
                    Email:
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="font-medium">
                    Password:
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full p-3 border-2 border-[var(--gray-200)] focus:outline-none focus:border-[var(--black)]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="confirmPassword" className="font-medium">
                    Konfirmasi Password:
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
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
                  {loading ? 'Memproses...' : 'Daftar'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-5">
          <Link
            to="/admin/login"
            className="text-sm text-[var(--gray-600)] hover:text-[var(--text-primary)]"
          >
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </div>
  )
}
