import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { completeEmailChange } from '../../admin/email-change'
import { errorMessage } from '../../lib/error-message'

export const Route = createFileRoute('/admin/confirm-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token_hash: typeof search.token_hash === 'string' ? search.token_hash : '',
  }),
  component: ConfirmEmailPage,
})

function ConfirmEmailPage() {
  const { token_hash: tokenHash } = Route.useSearch()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      await completeEmailChange({ data: { tokenHash } })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Gagal mengonfirmasi email.'))
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
          <p className="text-[var(--gray-600)]">Konfirmasi Email Baru</p>
        </div>

        <div className="bg-[var(--white)] border-2 border-[var(--black)] p-6 text-center flex flex-col gap-3">
          {done ? (
            <>
              <h2 className="text-xl font-semibold">Email Berhasil Diganti</h2>
              <p className="text-[var(--gray-600)]">
                Silakan masuk dengan email baru. Semua sesi lama telah dikeluarkan.
              </p>
              <Link
                to="/admin/login"
                className="block w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide mt-2"
              >
                Ke halaman login
              </Link>
            </>
          ) : !tokenHash ? (
            <>
              <h2 className="text-xl font-semibold">Tautan Tidak Valid</h2>
              <p className="text-[var(--gray-600)]">
                Ajukan ganti email lagi dari halaman profil.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Ganti Email Akun</h2>
              <p className="text-[var(--gray-600)]">
                Klik tombol di bawah untuk mengonfirmasi penggantian email akun Anda.
              </p>
              {error && (
                <div className="p-3 bg-[#fee] border border-[#fcc] text-[#c00]">{error}</div>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="w-full p-4 bg-[var(--black)] text-[var(--white)] font-semibold uppercase tracking-wide disabled:opacity-50 mt-2"
              >
                {loading ? 'Memproses...' : 'Konfirmasi Email'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
